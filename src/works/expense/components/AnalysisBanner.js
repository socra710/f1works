import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function AnalysisBanner({ comment, isLoading, onExpand }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [displayedChars, setDisplayedChars] = useState(0);
  const timerRef = useRef(null);

  // 빈 줄(2줄 이상) 기준으로 그룹 분리, 그룹 내는 줄 단위
  const groups = useMemo(() => {
    return (comment || '')
      .split(/\n{2,}/)
      .map((g) =>
        g
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      )
      .filter((g) => g.length > 0);
  }, [comment]);

  // 텍스트 길이 계산 (태그 제외)
  const getTextLen = (html) => (html || '').replace(/<[^>]*>/g, '').length;
  const flatLines = useMemo(() => groups.flat(), [groups]);
  const lineLengths = useMemo(() => flatLines.map(getTextLen), [flatLines]);
  const totalCharsAll = useMemo(
    () => lineLengths.reduce((a, b) => a + b, 0),
    [lineLengths]
  );

  // 안전한 HTML 슬라이스 (문자 기준). 태그는 유지하고 텍스트만 자름.
  const sliceHtmlByChars = (html, count) => {
    if (!html || count <= 0) return '';
    let remaining = count;
    const tokens = html.split(/(<[^>]+>)/g).filter((t) => t.length > 0);
    const out = [];
    const stack = [];
    const isTag = (t) => t[0] === '<' && t[t.length - 1] === '>';
    const getTagName = (t) => {
      const m = t.match(/^<\/?\s*([a-zA-Z0-9]+)(\s|>|\/>)/);
      return m ? m[1].toLowerCase() : '';
    };
    const isClosing = (t) => /^<\//.test(t);
    const isSelfClosing = (t) =>
      /\/>$/.test(t) || /^(br|hr|img|input|meta|link)$/i.test(getTagName(t));

    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (isTag(tk)) {
        if (isClosing(tk)) {
          const tn = getTagName(tk);
          for (let si = stack.length - 1; si >= 0; si--) {
            if (stack[si] === tn) {
              stack.splice(si, 1);
              break;
            }
          }
          out.push(tk);
        } else if (isSelfClosing(tk)) {
          out.push(tk);
        } else {
          const tn = getTagName(tk);
          if (tn) stack.push(tn);
          out.push(tk);
        }
      } else {
        if (remaining <= 0) break;
        const take = tk.slice(0, remaining);
        out.push(take);
        remaining -= take.length;
        if (remaining <= 0) break;
      }
    }
    for (let i = stack.length - 1; i >= 0; i--) {
      out.push(`</${stack[i]}>`);
    }
    return out.join('');
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetStreaming = () => {
    stopTimer();
    setDisplayedChars(0);
    setIsStreaming(false);
    setHasFinished(false);
  };

  // 코멘트 변경 시 초기화 (접힘/펼침과 무관)
  useEffect(() => {
    resetStreaming();
  }, [comment]);

  // 확장 시에만 타이핑 시작. 접었다 펴도 진행 상태 유지.
  useEffect(() => {
    if (!isExpanded) return;
    if (hasFinished || isStreaming) return;

    // 내용이 없으면 바로 종료 처리해서 스피너가 멈추도록 함
    if (totalCharsAll === 0) {
      setHasFinished(true);
      setIsStreaming(false);
      setDisplayedChars(0);
      return;
    }

    setIsStreaming(true);
    // 로컬/폴백 텍스트일 땐 바로 시작, 실제 AI 로딩 중엔 약간 대기
    const startDelay = comment ? 150 : Math.floor(800 + Math.random() * 3200); // ms
    const tickMs = 24; // 프레임 간격
    const charsPerTick = 2; // 틱당 출력 문자 수

    const kickoff = () => {
      if (!totalCharsAll) return;
      stopTimer();
      timerRef.current = setInterval(() => {
        setDisplayedChars((prev) => {
          const next = Math.min(totalCharsAll, prev + charsPerTick);
          if (next >= totalCharsAll) {
            stopTimer();
            setIsStreaming(false);
            setHasFinished(true);
          }
          return next;
        });
      }, tickMs);
    };

    const t = setTimeout(kickoff, startDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, totalCharsAll, hasFinished]);

  // 언마운트/접힘 시 타이머 정리
  useEffect(() => () => stopTimer(), []);

  // onExpand가 있으면 클릭용 카드가 필요하므로 코멘트가 없어도 노출
  if (!comment && !isLoading && !onExpand) return null;

  return (
    <div
      style={{
        background: '#f3f0ff',
        border: '1px solid #e5deff',
        borderRadius: '12px',
        padding: '0',
        marginBottom: '32px',
        marginTop: '24px',
        marginLeft: '-20px',
        marginRight: '-20px',
        color: '#5b4b8a',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          if (next && typeof onExpand === 'function') onExpand();
        }}
        style={{
          padding: '16px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          background: 'rgba(139, 92, 246, 0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 256 256"
            style={{ color: '#7c3aed', flexShrink: 0 }}
          >
            <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#6d28d9',
                margin: 0,
                lineHeight: '1.4',
              }}
            >
              AI 요약
            </h4>
          </div>
        </div>
        <span
          style={{
            fontSize: '16px',
            transition: 'transform 0.3s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#7c3aed',
            flexShrink: 0,
            marginLeft: '16px',
          }}
        >
          ▼
        </span>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: '20px 24px',
            fontSize: '14px',
            lineHeight: '1.7',
            fontFamily: 'inherit',
            borderTop: '1px solid rgba(139, 92, 246, 0.1)',
            color: '#5b4b8a',
          }}
        >
          {(isLoading || (isStreaming && displayedChars === 0)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                aria-label="AI 분석 로딩"
                role="status"
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(124, 58, 237, 0.25)',
                  borderTopColor: '#7c3aed',
                  borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                }}
              />
              <span>AI가 분석을 하고 있습니다…</span>
              <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
            </div>
          )}

          {displayedChars > 0 && (
            <div style={{ marginTop: 10 }}>
              {(() => {
                let remainingGlobal = displayedChars;
                let lineIdx = 0;
                return groups.map((group, gi) => {
                  const rendered = [];
                  for (let li = 0; li < group.length; li++, lineIdx++) {
                    const html = group[li];
                    const len = lineLengths[lineIdx] || 0;
                    if (remainingGlobal <= 0) break;
                    if (remainingGlobal >= len) {
                      rendered.push(
                        <div
                          key={`g-${gi}-l-${li}`}
                          style={{ marginBottom: 4 }}
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      );
                      remainingGlobal -= len;
                    } else {
                      const sliced = sliceHtmlByChars(html, remainingGlobal);
                      rendered.push(
                        <div
                          key={`g-${gi}-l-${li}`}
                          style={{ marginBottom: 4 }}
                          dangerouslySetInnerHTML={{ __html: sliced }}
                        />
                      );
                      remainingGlobal = 0;
                      break;
                    }
                  }
                  if (rendered.length === 0) return null;
                  return (
                    <div
                      key={`g-${gi}`}
                      style={{ marginBottom: gi < groups.length - 1 ? 14 : 0 }}
                    >
                      {rendered}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {displayedChars >= totalCharsAll && totalCharsAll > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                AI는 실수를 할 수 있습니다. 결과를 참고용으로만 활용하시고, 중요
                결정에는 직접 검토해 주세요. 🙏🏻
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
