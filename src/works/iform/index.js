import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import FormRenderer from './components/FormRenderer';
import TemplateEditor from './components/TemplateEditor';
import {
  listTemplates,
  getTemplate,
  createDocument,
  saveTemplate,
  getDocumentList,
  buildRjsfSchema,
} from './api';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';
import { useToast } from '../../common/Toast';
import { checkAdminRole } from '../admin/adminAPI';
import styles from './index.module.css';

export default function IFormPage() {
  const STORAGE_KEY = 'iform.templates.selectedTemplateId';
  const STORAGE_TAB_KEY = 'iform.activeTab';
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const hasShownToastRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [schema, setSchema] = useState(null);
  const [uiSchema, setUiSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [rawTemplate, setRawTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docFilterTemplate, setDocFilterTemplate] = useState('');
  const [docFilterStatus, setDocFilterStatus] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [tabReady, setTabReady] = useState(false);

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
          setLoading(false);
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
            navigate('/works');
          }
          setLoading(false);
          return;
        }

        setHasAccess(true);

        const savedTab = sessionStorage.getItem(STORAGE_TAB_KEY);
        if (savedTab) {
          setActiveTab(savedTab);
        }
        setTabReady(true);

        const templatesData = await listTemplates(showToast);
        setTemplates(templatesData);
      } catch (err) {
        if (!isMounted) return;

        console.error('[IFormPage] init error', err);
        if (!hasShownToastRef.current && !isNavigatingRef.current) {
          hasShownToastRef.current = true;
          isNavigatingRef.current = true;
          showToast('초기 데이터를 불러오는 데 실패했습니다.', 'error');
          setTimeout(() => navigate('/works'), 300);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 문서 목록 로드
  const loadDocuments = React.useCallback(async () => {
    try {
      const docs = await getDocumentList();
      setDocuments(docs || []);
    } catch (e) {
      showToast('문서 목록 로드 실패', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!templates.length) return;
    setSelectedTemplateId((prev) => {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved && templates.some((t) => t.id === saved)) return saved;
      if (prev && templates.some((t) => t.id === prev)) return prev;
      return prev || null;
    });
  }, [templates]);

  useEffect(() => {
    if (!selectedTemplateId) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, selectedTemplateId);
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!tabReady || !activeTab) return;
    sessionStorage.setItem(STORAGE_TAB_KEY, activeTab);
  }, [activeTab, tabReady]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    setRawTemplate(null);
    getTemplate(selectedTemplateId, showToast).then((tpl) => {
      if (tpl) {
        setSchema(tpl.schema || {});
        setUiSchema(tpl.uiSchema || {});
        setFormData(tpl.defaultData || {});
        setRawTemplate(tpl.rawTemplate || null);
      }
    });
  }, [selectedTemplateId, showToast]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  );

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return templates;
    return templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(keyword) ||
        t.id?.toLowerCase().includes(keyword),
    );
  }, [templates, search]);

  // 문서 필터링: 템플릿/상태/제목 검색
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) =>
        docFilterTemplate ? doc.templateId === docFilterTemplate : true,
      )
      .filter((doc) =>
        docFilterStatus ? doc.status === docFilterStatus : true,
      )
      .filter((doc) =>
        docSearch
          ? (doc.title || '').toLowerCase().includes(docSearch.toLowerCase())
          : true,
      );
  }, [documents, docFilterTemplate, docFilterStatus, docSearch]);

  const handleSaveTemplate = async (tpl) => {
    // _preview 플래그가 있으면 미리보기 탭으로 전환하고 스키마 업데이트
    if (tpl?._preview) {
      const { schema, uiSchema, formData } = buildRjsfSchema(tpl);
      setRawTemplate(tpl);
      setSchema(schema);
      setUiSchema(uiSchema);
      setFormData(formData);
      setActiveTab('new');
      return;
    }

    try {
      const result = await saveTemplate(tpl, showToast);
      if (result && result.ok) {
        const next = await listTemplates(showToast);
        setTemplates(next);
      }
    } catch (e) {
      showToast('템플릿 저장 실패', 'error');
    }
  };

  const handleCreateDocument = async (data) => {
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
        templateId: selectedTemplateId,
        title: selectedTemplate?.name || 'Untitled',
        formData: cleanedData,
        status: 'SUBMITTED',
      };

      const res = await createDocument(doc, showToast);
      if (res) {
        setFormData(cleanedData);
      }
    } catch (e) {
      showToast('문서 저장 실패', 'error');
    }
  };

  const openDocument = (doc) => {
    const docId = doc?.docId || doc?.id;
    if (!docId) {
      showToast('문서 정보가 없습니다', 'warning');
      return;
    }
    navigate(`/works/iform/manager/${docId}`);
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>통합 문서 관리</title>
        <meta property="og:title" content="통합 문서 관리" />
        <meta
          property="og:description"
          content="iForm 전자문서 템플릿을 관리하고 문서를 확인하세요."
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works/iform`}
        />
      </Helmet>
      {loading && (
        <div
          className={styles.loadingBar}
          role="status"
          aria-label="데이터 로딩 중"
        >
          <div className={styles.loadingBarIndicator} />
        </div>
      )}
      {!loading && hasAccess && (
        <div className={styles.container}>
          <div className={styles.shell}>
            <div className={styles.header}>
              <div>
                <p className={styles.breadcrumb}>전자문서 / iForm</p>
                <h1 className={styles.title}>iForm 전자문서</h1>
              </div>
              {/* <div className={styles.headerActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setActiveTab('editor')}
              >
                템플릿 편집으로 이동
              </button>
            </div> */}
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>템플릿 수</div>
                <div className={styles.summaryValue}>{templates.length}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>선택된 템플릿</div>
                <div className={styles.summaryValue}>
                  {selectedTemplate ? selectedTemplate.name : '미선택'}
                </div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>작성 상태</div>
                <div className={styles.summaryValue}>임시저장</div>
              </div>
            </div>

            <div className={styles.tabBar}>
              <button
                className={`${styles.tab} ${
                  activeTab === 'templates' ? styles.tabActive : ''
                }`}
                onClick={() => setActiveTab('templates')}
              >
                템플릿
              </button>
              <button
                className={`${styles.tab} ${
                  activeTab === 'editor' ? styles.tabActive : ''
                }`}
                onClick={() => setActiveTab('editor')}
              >
                템플릿 편집
              </button>
              <button
                className={`${styles.tab} ${
                  activeTab === 'new' ? styles.tabActive : ''
                } ${!schema ? styles.tabDisabled : ''}`}
                onClick={() => setActiveTab('new')}
                disabled={!schema}
              >
                템플릿 미리보기
              </button>
              <button
                className={`${styles.tab} ${
                  activeTab === 'docs' ? styles.tabActive : ''
                }`}
                onClick={() => setActiveTab('docs')}
              >
                문서 현황
              </button>
            </div>

            {activeTab === 'templates' && (
              <div className={styles.templatesGrid}>
                <div className={styles.card}>
                  <div className={styles.cardTitleRow}>
                    <h3 style={{ margin: 0 }}>템플릿 목록</h3>
                    <span className={styles.muted}>
                      {filteredTemplates.length}개
                    </span>
                  </div>
                  <div className={styles.searchBox}>
                    <input
                      placeholder="템플릿명/ID 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div>
                    {filteredTemplates.map((t) => (
                      <div
                        key={t.id}
                        className={`${styles.listItemHover} ${
                          selectedTemplateId === t.id
                            ? styles.listItemActive
                            : ''
                        }`}
                      >
                        <div className={styles.listItemHeader}>
                          <div>
                            <div className={styles.listTitle}>{t.name}</div>
                            <div className={styles.pillId}>ID: {t.id}</div>
                          </div>
                          <span className={styles.pill}>
                            v{t.version || '1.0'}
                          </span>
                        </div>
                        <div className={styles.listItemFooter}>
                          <span className={styles.muted}>선택</span>
                          <button
                            className={styles.ghostButton}
                            onClick={() => setSelectedTemplateId(t.id)}
                          >
                            선택
                          </button>
                        </div>
                      </div>
                    ))}
                    {!filteredTemplates.length && (
                      <div className={styles.muted}>검색 결과가 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.detailPanel}>
                    {selectedTemplate ? (
                      <>
                        <div className={styles.detailHeader}>
                          <h3 className={styles.detailTitle}>
                            {selectedTemplate.name}
                          </h3>
                          <div className={styles.detailMeta}>
                            <span className={styles.pill}>
                              v{selectedTemplate.version || '1.0'}
                            </span>
                            <span className={styles.pillSoft}>템플릿</span>
                          </div>
                        </div>
                        <div className={styles.detailCodeBox}>
                          {rawTemplate
                            ? JSON.stringify(rawTemplate, null, 2)
                            : '템플릿 본문을 불러오는 중입니다.'}
                        </div>
                      </>
                    ) : (
                      <div className={styles.muted}>
                        좌측에서 템플릿을 선택하세요.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className={styles.card}>
                <TemplateEditor
                  onSave={handleSaveTemplate}
                  templates={templates}
                />
              </div>
            )}

            {activeTab === 'new' && schema && (
              <div className={styles.card}>
                <div className={styles.formHeader}>
                  <h3 style={{ margin: 0 }}>
                    {selectedTemplate
                      ? selectedTemplate.name
                      : '템플릿 미리보기'}
                  </h3>
                  <div className={styles.muted}>템플릿 기반으로 바로 입력</div>
                </div>
                <FormRenderer
                  schema={schema}
                  uiSchema={uiSchema}
                  formData={formData}
                  onSubmit={handleCreateDocument}
                  onChange={setFormData}
                />
              </div>
            )}

            {activeTab === 'docs' && (
              <div className={styles.card}>
                <div className={styles.formHeader}>
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '4px' }}>
                      문서 현황
                    </h3>
                    <div className={styles.muted}>
                      {filteredDocuments.length}개의 문서 | 전체{' '}
                      {documents.length}개
                    </div>
                  </div>
                </div>

                <div className={styles.filterContainer}>
                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>템플릿</label>
                    <select
                      className={styles.filterInput}
                      value={docFilterTemplate}
                      onChange={(e) => setDocFilterTemplate(e.target.value)}
                    >
                      <option value="">전체</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>상태</label>
                    <select
                      className={styles.filterInput}
                      value={docFilterStatus}
                      onChange={(e) => setDocFilterStatus(e.target.value)}
                    >
                      <option value="">전체</option>
                      <option value="DRAFT">임시저장</option>
                      <option value="SUBMITTED">제출됨</option>
                      <option value="APPROVED">승인됨</option>
                      <option value="REJECTED">반려됨</option>
                    </select>
                  </div>

                  <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>검색</label>
                    <input
                      className={styles.filterInput}
                      placeholder="제목으로 검색"
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                    />
                  </div>

                  <div className={styles.filterGroup}>
                    <button
                      className={styles.filterButton}
                      onClick={loadDocuments}
                    >
                      🔄 새로고침
                    </button>
                  </div>
                </div>

                <div className={styles.docTableWrapper}>
                  {filteredDocuments.length ? (
                    <table className={styles.docTable}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'center' }}>제목</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>
                            템플릿
                          </th>
                          <th style={{ width: '12%', textAlign: 'center' }}>
                            상태
                          </th>
                          <th style={{ width: '12%', textAlign: 'center' }}>
                            작성자
                          </th>
                          <th style={{ width: '15%', textAlign: 'center' }}>
                            작성일
                          </th>
                          <th style={{ width: '15%', textAlign: 'center' }}>
                            수정일
                          </th>
                          <th style={{ width: '10%', textAlign: 'center' }}>
                            보기
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc) => (
                          <tr key={doc.docId || doc.id}>
                            <td className={styles.docTitle}>
                              {doc.title || '-'}
                            </td>
                            <td
                              style={{ textAlign: 'center' }}
                              className={styles.docTemplate}
                            >
                              {doc.templateId}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`${styles.docStatusBadge} ${
                                  styles['status-' + (doc.status || 'unknown')]
                                }`}
                              >
                                {getStatusLabel(doc.status)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {doc.createdByName || doc.createdBy || '-'}
                            </td>
                            <td
                              style={{ textAlign: 'center' }}
                              className={styles.docDate}
                            >
                              {doc.createdAt
                                ? new Date(doc.createdAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td
                              style={{ textAlign: 'center' }}
                              className={styles.docDate}
                            >
                              {doc.updatedAt
                                ? new Date(doc.updatedAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className={styles.docViewButton}
                                onClick={() => openDocument(doc)}
                                title="상세 보기"
                              >
                                →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className={styles.emptyDocTable}>
                      표시할 문서가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
