import React, { useEffect, useState, useMemo } from 'react';
import { sampleTemplate } from '../api';
import styles from './TemplateEditor.module.css';

export default function TemplateEditor({ onSave, templates = [] }) {
  const [templateText, setTemplateText] = useState('');
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // 템플릿 목록이 들어오면 자동으로 첫 번째 템플릿을 선택하고 JSON을 에디터에 채운다.
  useEffect(() => {
    if (!templates.length) {
      setSelectedTemplateId('');
      setTemplateText(JSON.stringify(sampleTemplate, null, 2));
      setIsDirty(false);
      return;
    }

    setSelectedTemplateId((prev) => {
      if (prev && templates.some((tpl) => tpl.id === prev)) return prev;
      return templates[0].id;
    });
  }, [templates]);

  useEffect(() => {
    if (!templates.length || !selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl?.rawTemplate) {
      setTemplateText(JSON.stringify(tpl.rawTemplate, null, 2));
      setIsDirty(false);
    }
  }, [templates, selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    const keyword = search.toLowerCase();
    if (!keyword) return templates;
    return templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(keyword) ||
        t.id?.toLowerCase().includes(keyword)
    );
  }, [templates, search]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  const handleSave = () => {
    setError('');
    try {
      const tpl = JSON.parse(templateText);
      onSave && onSave(tpl);
      setIsDirty(false);
    } catch (e) {
      setError('JSON 파싱 오류: 올바른 형식을 입력하세요');
    }
  };

  const handleReloadSelected = () => {
    if (!selectedTemplateId) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl?.rawTemplate) {
      setTemplateText(JSON.stringify(tpl.rawTemplate, null, 2));
      setIsDirty(false);
    }
  };

  const handleTextChange = (text) => {
    setTemplateText(text);
    setIsDirty(true);
  };

  const handlePreview = () => {
    setError('');
    try {
      const tpl = JSON.parse(templateText);
      // _preview 플래그를 추가하면 부모에서 미리보기 탭으로 전환
      onSave && onSave({ ...tpl, _preview: true });
    } catch (e) {
      setError('JSON 파싱 오류: 올바른 형식을 입력하세요');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '4px' }}>템플릿 편집</h3>
          <p style={{ margin: 0, color: '#667085', fontSize: '14px' }}>
            템플릿을 선택하고 JSON을 직접 편집한 후 저장합니다.
          </p>
        </div>
        {isDirty && (
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            ⚠️ 저장 필요
          </div>
        )}
      </div>

      <div className={styles.mainLayout}>
        {/* 좌측: 템플릿 목록 */}
        <div className={styles.leftPanel}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="템플릿명/ID 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.templateList}>
            {!templates.length ? (
              <div className={styles.emptyState}>등록된 템플릿이 없습니다.</div>
            ) : filteredTemplates.length === 0 ? (
              <div className={styles.emptyState}>검색 결과가 없습니다.</div>
            ) : (
              filteredTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`${styles.templateItem} ${
                    selectedTemplateId === tpl.id
                      ? styles.templateItemActive
                      : ''
                  }`}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                >
                  <div className={styles.templateItemName}>{tpl.name}</div>
                  <div className={styles.templateItemMeta}>
                    <span className={styles.templateItemId}>{tpl.id}</span>
                    <span className={styles.templateItemVersion}>
                      v{tpl.version || '1.0'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 우측: 에디터 */}
        <div className={styles.rightPanel}>
          {selectedTemplate ? (
            <>
              <div className={styles.editorHeader}>
                <div>
                  <h4 style={{ margin: 0, marginBottom: '4px' }}>
                    {selectedTemplate.name}
                  </h4>
                  <div style={{ fontSize: '13px', color: '#667085' }}>
                    ID: <code>{selectedTemplateId}</code> | v
                    {selectedTemplate.version || '1.0'}
                  </div>
                </div>
              </div>

              <label className={styles.label}>JSON 편집</label>
              <textarea
                value={templateText}
                onChange={(e) => handleTextChange(e.target.value)}
                className={`${styles.textarea} ${styles.editorTextarea}`}
              />

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.editorActions}>
                <button
                  className={styles.primary}
                  onClick={handleSave}
                  disabled={!isDirty}
                >
                  저장
                </button>
                <button
                  className={styles.secondary}
                  onClick={handleReloadSelected}
                  disabled={!isDirty}
                >
                  변경사항 폐기
                </button>
                <button
                  className={styles.preview}
                  onClick={handlePreview}
                  title="JSON이 유효한 형식이면 미리보기 탭에서 확인할 수 있습니다"
                >
                  미리보기
                </button>
              </div>

              <div className={styles.guide}>
                <div className={styles.guideTitle}>📋 JSON 구조</div>
                <ul>
                  <li>
                    <strong>templateId</strong>: 고유 ID (영문, 언더스코어)
                  </li>
                  <li>
                    <strong>title</strong>: 템플릿 이름
                  </li>
                  <li>
                    <strong>version</strong>: 버전 ("1.0", "1.1" 등)
                  </li>
                  <li>
                    <strong>sections[]</strong>: 폼 섹션 배열
                  </li>
                  <li>
                    <strong>agreement</strong>: 약관 동의 (선택사항)
                  </li>
                  <li>
                    <strong>signatures[]</strong>: 서명 필드 배열 (선택사항)
                  </li>
                </ul>
              </div>

              <div className={styles.notice}>
                <div className={styles.noticeTitle}>⚡ 안내사항</div>
                <ul>
                  <li>JSON 포맷이 정확한지 확인 후 저장하세요</li>
                  <li>
                    버전 업데이트 시 templateId는 유지, version만 변경합니다
                  </li>
                  <li>sections[]의 fields 배열에 필드 정보를 추가합니다</li>
                  <li>type: "lookup"인 경우 lookup 객체 필수입니다</li>
                  <li>저장 후 템플릿 목록에 즉시 반영됩니다</li>
                  <li>편집 중 저장하지 않으면 변경사항이 사라집니다</li>
                </ul>
              </div>
            </>
          ) : (
            <div className={styles.emptyEditor}>
              좌측에서 템플릿을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
