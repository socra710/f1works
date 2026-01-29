import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDocument, getTemplate, updateDocumentStatus } from '../api';
import FormRenderer from '../components/FormRenderer';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../../common/extensionLogin';
import { useToast } from '../../../common/Toast';
import { checkAdminRole } from '../../admin/adminAPI';
import styles from '../user/UserForm.module.css';

export default function ManagerDocumentView() {
  const navigate = useNavigate();
  const { docId } = useParams();
  const { showToast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
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

  const loadDocument = useCallback(async () => {
    try {
      const doc = await getDocument(docId);
      if (!doc) {
        showToast('문서를 찾을 수 없습니다.', 'error');
        setTimeout(() => navigate('/works/iform'), 300);
        return;
      }
      setDocument(doc);
      setFormData(doc.formData || {});

      if (doc.templateId) {
        const tpl = await getTemplate(doc.templateId);
        setTemplate(tpl);
      }
    } catch (err) {
      console.error('문서 로드 실패:', err);
      showToast('문서를 불러오는 데 실패했습니다.', 'error');
      setTimeout(() => navigate('/works/iform'), 300);
    }
  }, [docId, showToast, navigate]);

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
        const role = await checkAdminRole({
          userId: decoded,
          menuKey: 'IFORM',
        });

        if (!isMounted) return;

        const isSuper = !!role?.isSuperAdmin;
        const isGlobalAdmin = !!role?.isGlobalAdmin;
        const isMenuAdmin = !!role?.isMenuAdmin;

        if (!isSuper && !isGlobalAdmin && !isMenuAdmin) {
          if (!hasShownToastRef.current && !isNavigatingRef.current) {
            hasShownToastRef.current = true;
            isNavigatingRef.current = true;
            showToast('해당 사용자는 접근 권한이 없습니다.', 'warning');
            setTimeout(() => navigate('/works'), 300);
          }
          setInitialLoading(false);
          return;
        }

        setHasAccess(true);
        await loadDocument();
      } catch (err) {
        if (!isMounted) return;

        console.error('[ManagerDocumentView] init error', err);
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
  }, [docId]);

  const handleConfirm = useCallback(async () => {
    if (!document?.docId) return;

    const confirmed = window.confirm(
      '이 문서를 확인 처리하시겠습니까?\n확인 처리된 문서는 상태가 "완료 처리"로 변경됩니다.',
    );
    if (!confirmed) return;

    setSaveLoading(true);
    try {
      const success = await updateDocumentStatus(
        document.docId,
        'COMPLETED',
        showToast,
      );
      if (success) {
        await loadDocument();
      }
    } finally {
      setSaveLoading(false);
    }
  }, [document, showToast, loadDocument]);

  const handleReject = useCallback(async () => {
    if (!document?.docId) return;

    const confirmed = window.confirm(
      '이 문서를 반려하시겠습니까?\n반려된 문서는 상태가 "반려됨"으로 변경됩니다.',
    );
    if (!confirmed) return;

    setSaveLoading(true);
    try {
      const success = await updateDocumentStatus(
        document.docId,
        'REJECTED',
        showToast,
      );
      if (success) {
        await loadDocument();
      }
    } finally {
      setSaveLoading(false);
    }
  }, [document, showToast, loadDocument]);

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
            <h1>문서 상세보기 (관리자)</h1>
            <p className={styles.heroSub}>제출된 문서의 내용을 확인합니다.</p>
          </div>
          <div className={styles.adminHeaderActions}>
            {document?.status === 'SUBMITTED' && (
              <>
                <button
                  className={styles.btnHome}
                  onClick={handleConfirm}
                  style={{
                    color: '#fff',
                    backgroundColor: '#66bb6a',
                    border: 'none',
                  }}
                >
                  ✓ 확인
                </button>
                <button
                  className={styles.btnHome}
                  onClick={handleReject}
                  style={{
                    color: '#fff',
                    backgroundColor: '#ef5350',
                    border: 'none',
                  }}
                >
                  ✕ 반려
                </button>
              </>
            )}
            <button
              className={styles.btnHome}
              onClick={() => navigate('/works/iform')}
              aria-label="목록으로 이동"
            >
              목록으로
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
              readonly
              readOnly
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
