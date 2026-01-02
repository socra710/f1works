import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, createDocument, getDocumentList } from '../api';
import FormRenderer from '../components/FormRenderer';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../../common/extensionLogin';
import { useToast } from '../../../common/Toast';
import styles from './UserForm.module.css';

export default function UserForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [myDocuments, setMyDocuments] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'create', 'view'
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success'); // 'success' | 'error'
  const hasShownToastRef = useRef(false);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const sessionUser = await waitForExtensionLogin({
          minWait: 300,
          maxWait: 1500,
        });

        if (!isMounted) return;

        if (!sessionUser) {
          if (!hasShownToastRef.current && !isNavigatingRef.current) {
            hasShownToastRef.current = true;
            isNavigatingRef.current = true;
            showToast('로그인이 필요한 서비스입니다.', 'warning');
            setTimeout(() => navigate('/works'), 300);
          }
          setInitialLoading(false);
          return;
        }

        const decoded = (decodeUserId(sessionUser) || '').trim();
        setCurrentUserId(decoded);
        setHasAccess(true);

        await Promise.all([loadTemplates(), loadMyDocuments()]);
      } catch (err) {
        if (!isMounted) return;

        console.error('[UserForm] init error', err);
        if (!hasShownToastRef.current && !isNavigatingRef.current) {
          hasShownToastRef.current = true;
          isNavigatingRef.current = true;
          showToast('초기 데이터를 불러오는 데 실패했습니다.', 'error');
          setTimeout(() => navigate('/works'), 300);
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const list = await listTemplates();
      setTemplates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('템플릿 로드 실패:', err);
      throw new Error('템플릿을 불러올 수 없습니다.');
    }
  }, []);

  const loadMyDocuments = useCallback(async () => {
    try {
      const docs = await getDocumentList();
      setMyDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('문서 목록 로드 실패:', err);
      throw new Error('문서 목록을 불러올 수 없습니다.');
    }
  }, []);

  const handleSelectTemplate = useCallback(
    (template) => {
      if (!template || !template.id) {
        showMessage('유효하지 않은 템플릿입니다.', 'error');
        return;
      }
      setSelectedTemplate(template);
      setFormData(template.defaultData || {});
      setView('create');
      setMessage('');
    },
    [showMessage]
  );

  const handleFormDataChange = useCallback((newFormData) => {
    setFormData(newFormData);
  }, []);

  const handleSubmit = useCallback(
    async (data) => {
      if (!selectedTemplate) {
        showMessage('템플릿이 선택되지 않았습니다.', 'error');
        return;
      }

      if (!data || Object.keys(data).length === 0) {
        showMessage('문서 내용을 입력해주세요.', 'error');
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        // data 정제: 문자열은 trim, 서명 필드는 그대로 유지
        const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] =
              key.includes('sign') || key.includes('signature')
                ? value
                : value.trim();
          } else {
            acc[key] = value;
          }
          return acc;
        }, {});

        const doc = {
          userId: currentUserId,
          templateId: selectedTemplate.id,
          title: selectedTemplate.name,
          formData: cleanedData,
          status: 'SUBMITTED',
        };

        await createDocument(doc);
        showMessage('문서가 성공적으로 제출되었습니다.', 'success');
        setView('list');
        setSelectedTemplate(null);
        setFormData({});
        await loadMyDocuments();
      } catch (err) {
        console.error('문서 제출 실패:', err);
        showMessage(
          err.message || '문서 제출에 실패했습니다. 다시 시도해주세요.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedTemplate, loadMyDocuments, showMessage]
  );

  const handleCancel = useCallback(() => {
    if (loading) return;

    const hasUnsavedChanges =
      formData &&
      Object.keys(formData).length > 0 &&
      Object.values(formData).some(
        (value) => value !== '' && value !== null && value !== undefined
      );

    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        '작성 중인 내용이 있습니다. 정말 취소하시겠습니까?'
      );
      if (!confirm) return;
    }

    setView('list');
    setSelectedTemplate(null);
    setFormData({});
    setMessage('');
  }, [loading, formData]);

  return (
    <div className={styles.container}>
      <div className={styles.adminHeader}>
        <div className={styles.adminHeaderText}>
          <h1>전자문서 작성</h1>
          <p className={styles.heroSub}>
            다양한 양식을 선택하여 전자문서를 작성하고 제출합니다.
          </p>
        </div>
        <div className={styles.adminHeaderActions}>
          <button
            className={styles.btnHome}
            onClick={() => navigate('/works')}
            aria-label="홈으로 이동"
          >
            홈으로
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`${styles.message} ${
            messageType === 'error' ? styles.messageError : ''
          }`}
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      {initialLoading ? (
        <div
          className={styles.loadingBar}
          role="status"
          aria-label="데이터 로딩 중"
        >
          <div className={styles.loadingBarIndicator} />
        </div>
      ) : !hasAccess ? null : (
        <>
          {view === 'list' && (
            <div className={styles.listView}>
              <section className={styles.section}>
                <h2>양식 선택</h2>
                {templates.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    사용 가능한 양식이 없습니다.
                  </div>
                ) : (
                  <div className={styles.templateGrid}>
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className={styles.templateCard}
                        onClick={() => handleSelectTemplate(tpl)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${tpl.name} 양식 선택`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTemplate(tpl);
                          }
                        }}
                      >
                        <div className={styles.templateIcon} aria-hidden="true">
                          📄
                        </div>
                        <div className={styles.templateName}>{tpl.name}</div>
                        {tpl.description && (
                          <div className={styles.templateDescription}>
                            {tpl.description}
                          </div>
                        )}
                        <div className={styles.templateVersion}>
                          v{tpl.version}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <h2>내 문서</h2>
                <div className={styles.documentList}>
                  {myDocuments.length === 0 ? (
                    <div className={styles.emptyMessage}>
                      작성된 문서가 없습니다.
                    </div>
                  ) : (
                    <table className={styles.documentTable}>
                      <thead>
                        <tr>
                          <th>제목</th>
                          <th>상태</th>
                          <th>작성일</th>
                          <th>수정일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myDocuments.map((doc) => (
                          <tr key={doc.docId}>
                            <td>{doc.title}</td>
                            <td>
                              <span className={styles['status-' + doc.status]}>
                                {doc.status}
                              </span>
                            </td>
                            <td>
                              {doc.createdAt
                                ? new Date(doc.createdAt).toLocaleDateString(
                                    'ko-KR'
                                  )
                                : '-'}
                            </td>
                            <td>
                              {doc.updatedAt
                                ? new Date(doc.updatedAt).toLocaleDateString(
                                    'ko-KR'
                                  )
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>
          )}

          {view === 'create' && selectedTemplate && (
            <div className={styles.formView}>
              <div className={styles.formHeader}>
                <div className={styles.formHeaderText}>
                  <h2>{selectedTemplate.name}</h2>
                  <div className={styles.formVersion}>
                    버전 {selectedTemplate.version}
                  </div>
                </div>
                <button
                  className={styles.btnBack}
                  onClick={handleCancel}
                  disabled={loading}
                  aria-label="양식 작성 취소"
                >
                  취소
                </button>
              </div>
              <FormRenderer
                schema={selectedTemplate.schema}
                uiSchema={selectedTemplate.uiSchema}
                formData={formData}
                onSubmit={handleSubmit}
                onChange={handleFormDataChange}
                disabled={loading}
              >
                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.btnSubmit}
                    disabled={loading}
                    aria-label={loading ? '문서 제출 중' : '문서 제출하기'}
                  >
                    {loading ? '제출 중...' : '제출하기'}
                  </button>
                </div>
              </FormRenderer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
