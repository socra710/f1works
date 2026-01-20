import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDocument, getTemplate, createDocument } from '../api';
import FormRenderer from '../components/FormRenderer';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../../common/extensionLogin';
import { useToast } from '../../../common/Toast';
import styles from './UserForm.module.css';

export default function UserDocumentView() {
  const navigate = useNavigate();
  const { docId } = useParams();
  const { showToast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const hasShownToastRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const [document, setDocument] = useState(null);
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

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

        await loadDocument();
      } catch (err) {
        if (!isMounted) return;

        console.error('[UserDocumentView] init error', err);
        if (!hasShownToastRef.current && !isNavigatingRef.current) {
          hasShownToastRef.current = true;
          isNavigatingRef.current = true;
          showToast('초기 데이터를 불러오는 데 실패했습니다.', 'error');
          setTimeout(() => navigate('/works/iform/user'), 300);
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
  }, [docId]);

  const loadDocument = useCallback(async () => {
    try {
      const doc = await getDocument(docId);
      if (!doc) {
        showToast('문서를 찾을 수 없습니다.', 'error');
        setTimeout(() => navigate('/works/iform/user'), 300);
        return;
      }
      setDocument(doc);
      setFormData(doc.formData || {});

      // 템플릿 정보 로드
      if (doc.templateId) {
        const tpl = await getTemplate(doc.templateId);
        setTemplate(tpl);
      }
    } catch (err) {
      console.error('문서 로드 실패:', err);
      showToast('문서를 불러오는 데 실패했습니다.', 'error');
      setTimeout(() => navigate('/works/iform/user'), 300);
    }
  }, [docId, showToast, navigate]);

  const handleFormDataChange = useCallback((newFormData) => {
    setFormData(newFormData);
  }, []);

  const handleSave = useCallback(
    async (data) => {
      if (!document) return;

      setSaveLoading(true);

      try {
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

        // DRAFT 상태에서는 MODIFY로 변경, 아니면 그대로
        const newStatus =
          document.status === 'DRAFT' ? 'MODIFY' : document.status;

        const updatedDoc = {
          docId: document.docId,
          userId: document.userId || currentUserId,
          templateId: document.templateId,
          title: document.title,
          formData: cleanedData,
          status: newStatus,
        };

        await createDocument(updatedDoc);

        await loadDocument();
        showToast('문서가 수정되었습니다.', 'success');
      } catch (err) {
        console.error('문서 수정 실패:', err);
        showToast('문서 수정에 실패했습니다.', 'error');
      } finally {
        setSaveLoading(false);
      }
    },
    [document, showToast, currentUserId, loadDocument],
  );

  const handleSubmit = useCallback(
    async (data) => {
      if (!document) return;

      // 필수 필드 검증
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

      setSaveLoading(true);

      try {
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

        const updatedDoc = {
          docId: document.docId,
          userId: document.userId || currentUserId,
          templateId: document.templateId,
          title: document.title,
          formData: cleanedData,
          status: 'SUBMITTED',
        };

        await createDocument(updatedDoc);

        await loadDocument();
        showToast('문서가 제출되었습니다.', 'success');
      } catch (err) {
        console.error('문서 제출 실패:', err);
        showToast('문서 제출에 실패했습니다.', 'error');
      } finally {
        setSaveLoading(false);
      }
    },
    [document, showToast, currentUserId, loadDocument],
  );

  const handleBack = () => {
    navigate('/works/iform/user');
  };

  // 수정 가능한 상태인지 확인 (DRAFT, MODIFY만 수정 가능)
  const isEditable =
    document && (document.status === 'DRAFT' || document.status === 'MODIFY');

  console.log('문서 상태:', document?.status, 'isEditable:', isEditable);

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
      <div className={styles.content}>
        {saveLoading && (
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
            <h1>문서 상세보기</h1>
            <p className={styles.heroSub}>제출된 문서의 내용을 확인합니다.</p>
          </div>
          <div className={styles.adminHeaderActions}>
            <button
              className={styles.btnHome}
              onClick={handleBack}
              aria-label="목록으로 이동"
            >
              목록으로
            </button>
            <button
              className={styles.btnHome}
              onClick={() => navigate('/works')}
              aria-label="홈으로 이동"
            >
              홈으로
            </button>
          </div>
        </div>

        {document && template ? (
          <div className={styles.formView}>
            <div className={styles.formHeader}>
              <div className={styles.formHeaderText}>
                <h2>{document.title}</h2>
                <div className={styles.documentInfo}>
                  <span className={styles['status-' + document.status]}>
                    {getStatusLabel(document.status)}
                  </span>
                  <span className={styles.documentMeta}>
                    작성일:{' '}
                    {document.createdAt
                      ? new Date(document.createdAt).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                  {document.updatedAt && (
                    <span className={styles.documentMeta}>
                      수정일:{' '}
                      {new Date(document.updatedAt).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <FormRenderer
              schema={template.schema}
              uiSchema={template.uiSchema}
              formData={formData}
              disabled={saveLoading}
              readonly={!isEditable}
              readOnly={!isEditable}
              onSubmit={isEditable ? handleSubmit : undefined}
              onSaveDraft={isEditable ? handleSave : undefined}
              onChange={isEditable ? handleFormDataChange : undefined}
            />
          </div>
        ) : (
          <div className={styles.emptyMessage}>
            문서 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
