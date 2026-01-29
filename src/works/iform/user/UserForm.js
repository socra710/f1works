import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { listTemplates, createDocument, getDocumentList } from '../api';
import FormRenderer from '../components/FormRenderer';
import { waitForExtensionLoginJson } from '../../../common/extensionLogin';
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
  const [loginJson, setLoginJson] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const hasShownToastRef = useRef(false);
  const isNavigatingRef = useRef(false);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const applyDynamicDefaults = useCallback(
    (template, baseData) => {
      if (!template?.rawTemplate?.sections) return baseData;

      const nextData = { ...baseData };
      const todayStr = getTodayString();
      const loginName = loginJson?.BASE_NAME || '';
      const loginDepartment = loginJson?.DEPARTMENT_NAME || '';

      const tokenMap = {
        __TODAY__: () => todayStr,
        TODAY: () => todayStr,
        '@today': () => todayStr,
        __LOGIN_NAME__: () => loginName,
        LOGIN_NAME: () => loginName,
        '@loginName': () => loginName,
        __LOGIN_DEPARTMENT__: () => loginDepartment,
        LOGIN_DEPARTMENT: () => loginDepartment,
        '@loginDepartment': () => loginDepartment,
      };

      template.rawTemplate.sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
          const def = field?.default;
          if (typeof def === 'string' && tokenMap[def]) {
            nextData[field.id] = tokenMap[def]();
          }
        });
      });

      return nextData;
    },
    [loginJson],
  );

  // 상태값 한글 변환 함수
  const getStatusLabel = (status) => {
    const statusMap = {
      DRAFT: '임시 저장',
      SUBMITTED: '제출 완료',
      APPROVED: '승인됨',
      REJECTED: '반려됨',
      COMPLETED: '완료 처리',
      NOT_SUBMITTED: '제출 없음',
      MODIFY: '수정 중',
    };
    return statusMap[status] || status || 'N/A';
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const sessionLoginJson = await waitForExtensionLoginJson({
          minWait: 300,
          maxWait: 1500,
        });

        if (!isMounted) return;

        if (!sessionLoginJson || !sessionLoginJson.USR_ID) {
          if (!hasShownToastRef.current && !isNavigatingRef.current) {
            hasShownToastRef.current = true;
            isNavigatingRef.current = true;
            showToast('로그인이 필요한 서비스입니다.', 'warning');
            setTimeout(() => navigate('/works'), 300);
          }
          setInitialLoading(false);
          return;
        }

        const decoded = (sessionLoginJson.USR_ID || '').trim();
        setCurrentUserId(decoded);
        setLoginJson(sessionLoginJson);
        setHasAccess(true);

        await Promise.all([
          loadTemplates(),
          getDocumentList(decoded).then((docs) => {
            setMyDocuments(Array.isArray(docs) ? docs : []);
          }),
        ]);
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
      const docs = await getDocumentList(currentUserId);
      setMyDocuments(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error('문서 목록 로드 실패:', err);
      throw new Error('문서 목록을 불러올 수 없습니다.');
    }
  }, [currentUserId]);

  const handleSelectTemplate = useCallback(
    async (template) => {
      if (!template || !template.id) {
        showToast('유효하지 않은 템플릿입니다.', 'error');
        return;
      }

      // 템플릿별 디폴트 값 설정
      let initialData = template.defaultData || {};
      initialData = applyDynamicDefaults(template, initialData);

      // 개인정보 동의서
      if (template.id === 'PRIVACY_CONSENT') {
        const dateStr = getTodayString();

        initialData = {
          ...initialData,
          consent_date: dateStr,
        };

        if (loginJson && loginJson.BASE_NAME) {
          initialData.consent_name = loginJson.BASE_NAME;
        }
      }

      // IT 자산 인수 확인서
      if (template.id === 'IT_ASSET_TAKEOVER') {
        const dateStr = getTodayString();

        if (loginJson) {
          if (loginJson.BASE_NAME) {
            initialData.user_name = loginJson.BASE_NAME;
          }
          if (loginJson.DEPARTMENT_NAME) {
            initialData.department = loginJson.DEPARTMENT_NAME;
          }
          if (loginJson.LEVEL_NAME) {
            initialData.position = loginJson.LEVEL_NAME;
          }
        }

        // 지급일을 오늘 날짜로 설정
        initialData.issue_date = dateStr;
      }

      setSelectedTemplate(template);
      setFormData(initialData);
      setView('create');
    },
    [showToast, loginJson, applyDynamicDefaults],
  );

  const handleFormDataChange = useCallback((newFormData) => {
    setFormData(newFormData);
  }, []);

  const handleSubmit = useCallback(
    async (data) => {
      if (!selectedTemplate) {
        showToast('템플릿이 선택되지 않았습니다.', 'error');
        return;
      }

      if (!data || Object.keys(data).length === 0) {
        showToast('문서 내용을 입력해주세요.', 'error');
        return;
      }

      // 서명 필드 검증
      const signatureFields = Object.keys(data).filter(
        (key) => key.includes('sign') || key.includes('signature'),
      );
      const hasEmptySignature = signatureFields.some(
        (key) => !data[key] || data[key].trim() === '',
      );
      if (hasEmptySignature) {
        showToast('서명을 완료해주세요.', 'error');
        return;
      }

      // 제출 확인
      const confirmed = window.confirm('정말 제출하시겠습니까?');
      if (!confirmed) {
        return;
      }

      setLoading(true);

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
        showToast('문서가 성공적으로 제출되었습니다.', 'success');
        setView('list');
        setSelectedTemplate(null);
        setFormData({});
        await loadMyDocuments();
      } catch (err) {
        console.error('문서 제출 실패:', err);
        showToast(
          err.message || '문서 제출에 실패했습니다. 다시 시도해주세요.',
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedTemplate, loadMyDocuments, showToast, currentUserId],
  );

  const handleSaveDraft = useCallback(
    async (data) => {
      if (!selectedTemplate) {
        showToast('템플릿이 선택되지 않았습니다.', 'error');
        return;
      }

      setLoading(true);

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
          status: 'DRAFT',
        };

        console.log('임시저장 문서:', doc);
        console.log('폼데이터:', cleanedData);
        await createDocument(doc);
        showToast('문서가 임시 저장되었습니다.', 'success');
        setView('list');
        setSelectedTemplate(null);
        setFormData({});
        await loadMyDocuments();
      } catch (err) {
        console.error('문서 임시 저장 실패:', err);
        showToast(
          err.message || '임시 저장에 실패했습니다. 다시 시도해주세요.',
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedTemplate, loadMyDocuments, showToast, currentUserId],
  );

  const handleCancel = useCallback(() => {
    if (loading) return;

    const hasUnsavedChanges =
      formData &&
      Object.keys(formData).length > 0 &&
      Object.values(formData).some(
        (value) => value !== '' && value !== null && value !== undefined,
      );

    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        '작성 중인 내용이 있습니다. 정말 취소하시겠습니까?',
      );
      if (!confirm) return;
    }

    setView('list');
    setSelectedTemplate(null);
    setFormData({});
  }, [loading, formData]);

  // 로딩 중일 때는 원래 배경색만 표시
  if (initialLoading) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 32px)',
          }}
        >
          <div
            className={styles.loadingBar}
            role="status"
            aria-label="데이터 로딩 중"
          >
            <div className={styles.loadingBarIndicator} />
          </div>
        </div>
      </div>
    );
  }

  // 접근 권한이 없으면 아무것도 표시하지 않음
  if (!hasAccess) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>통합 문서 작성</title>
        <meta property="og:title" content="통합 문서 작성" />
        <meta
          property="og:description"
          content="다양한 양식을 선택하여 전자문서를 작성하고 제출합니다."
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works/iform/user`}
        />
      </Helmet>
      <div className={styles.content}>
        {loading && (
          <div
            className={styles.loadingBar}
            role="status"
            aria-label="데이터 로딩 중"
          >
            <div className={styles.loadingBarIndicator} />
          </div>
        )}
        <div className={styles.adminHeader}>
          <div className={styles.adminHeaderText}>
            <h1>iForm 전자문서 작성</h1>
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
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myDocuments.map((doc) => (
                        <tr key={doc.docId}>
                          <td>{doc.title}</td>
                          <td>
                            <span className={styles['status-' + doc.status]}>
                              {getStatusLabel(doc.status)}
                            </span>
                          </td>
                          <td>
                            {doc.createdAt
                              ? new Date(doc.createdAt).toLocaleDateString(
                                  'ko-KR',
                                )
                              : '-'}
                          </td>
                          <td>
                            {doc.updatedAt
                              ? new Date(doc.updatedAt).toLocaleDateString(
                                  'ko-KR',
                                )
                              : '-'}
                          </td>
                          <td>
                            <button
                              className={styles.btnView}
                              onClick={() =>
                                navigate(`/works/iform/user/${doc.docId}`)
                              }
                              aria-label="문서 상세보기"
                            >
                              보기
                            </button>
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
              onSaveDraft={handleSaveDraft}
              onChange={handleFormDataChange}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
