import React, { useState } from 'react';
import styles from '../RunnerExtras.module.css';

const GameModal = ({
  showModal,
  score,
  coins,
  isNewRecord,
  playerName,
  userId,
  onNameChange,
  onClose,
  title,
  showStats = true,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showShareToast, setShowShareToast] = useState(false);

  if (!showModal) return null;

  const displayName =
    playerName || `Runner${Math.floor(Math.random() * 10000)}`;

  const handleEditClick = () => {
    setTempName(displayName);
    setEditingName(true);
  };

  const handleSaveName = () => {
    if (!tempName || tempName.trim().length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    if (tempName.length > 20) {
      alert('닉네임은 20자 이하로 입력해주세요!');
      return;
    }
    onNameChange(tempName.trim(), userId);
    setEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setTempName('');
  };

  const handleShare = () => {
    // 점수를 시각화 (100점당 하나의 별)
    const starCount = Math.floor(score / 100);
    const stars = '⭐'.repeat(Math.min(starCount, 10)); // 최대 10개

    // 코인을 시각화 (10개당 하나의 코인)
    const coinVisual = Math.floor(coins / 10);
    const coinIcons = '💰'.repeat(Math.min(coinVisual, 10)); // 최대 10개

    // 점수 구간별 이모지
    let trophy = '🏃';
    if (score >= 1000) trophy = '🏆';
    else if (score >= 500) trophy = '🥇';
    else if (score >= 300) trophy = '🥈';
    else if (score >= 100) trophy = '🥉';

    // 공유 텍스트 생성
    const shareText =
      `🏃 러너 게임 결과 ${trophy}\n\n` +
      `👤 ${displayName}\n` +
      `📊 점수: ${score}점 ${stars}\n` +
      `💰 코인: ${coins}개 ${coinIcons}\n` +
      (isNewRecord ? `\n🎉 신기록 달성! 🎉\n` : '') +
      `\nhttps://f1works.netlify.app/games/runner`;

    // 클립보드에 복사
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 2000);
        })
        .catch(() => {
          // 폴백: 구형 브라우저용
          fallbackCopyToClipboard(shareText);
        });
    } else {
      fallbackCopyToClipboard(shareText);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
    document.body.removeChild(textArea);
  };

  const modalTitle =
    title || (isNewRecord ? '🎉 신기록 달성! 🎉' : '게임 종료');

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']}>
        {isNewRecord && <div className={styles['trophy-icon']}>🏆</div>}

        <h2 className={styles['modal-title']}>{modalTitle}</h2>

        {showStats && (
          <div className={styles['stats-container']}>
            <div className={styles['stat-item']}>
              <div className={styles['stat-icon']}>⭐</div>
              <div className={styles['stat-content']}>
                <span className={styles['stat-label']}>최종 점수</span>
                <span className={styles['stat-value']}>{score}</span>
              </div>
            </div>

            <div className={styles['stat-item']}>
              <div className={styles['stat-icon']}>💰</div>
              <div className={styles['stat-content']}>
                <span className={styles['stat-label']}>획득 코인</span>
                <span className={styles['stat-value']}>{coins}</span>
              </div>
            </div>
          </div>
        )}

        {isNewRecord && (
          <div className={styles['modal-celebration']} aria-hidden>
            {/* 폭죽 6개: 순차적으로 터지며 화려하게 */}
            {Array.from({ length: 6 }).map((_, idx) => {
              const positions = [
                { left: 15, top: 20 },
                { left: 50, top: 15 },
                { left: 85, top: 22 },
                { left: 30, top: 45 },
                { left: 70, top: 40 },
                { left: 50, top: 60 },
              ];
              const pos = positions[idx];
              const sparks = 35 + Math.floor(Math.random() * 10); // 35~44개
              const baseDelay = idx * 0.15; // 순차적 폭발
              const colors = [
                '#ff3366',
                '#ffd700',
                '#00d4ff',
                '#ff66ff',
                '#66ff66',
                '#ff9933',
                '#cc66ff',
              ];
              return (
                <div key={idx}>
                  {/* 폭발 링 */}
                  <div
                    className={styles['firework-ring']}
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      animationDelay: `${baseDelay}s`,
                    }}
                  />
                  {/* 스파크들 */}
                  <div
                    className={styles['firework']}
                    style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                  >
                    {Array.from({ length: sparks }).map((__, j) => {
                      const angle = (360 / sparks) * j;
                      const color =
                        colors[Math.floor(Math.random() * colors.length)];
                      const delay =
                        (baseDelay + Math.random() * 0.15).toFixed(2) + 's';
                      const dist = 100 + Math.random() * 100; // 100~200px
                      return (
                        <span
                          key={`${idx}-${j}`}
                          className={styles['spark']}
                          style={{
                            '--angle': `${angle}deg`,
                            '--burstDist': `${dist}px`,
                            '--delay': delay,
                            '--color': color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles['nickname-section']}>
          {!editingName ? (
            <>
              <div className={styles['nickname-card']}>
                <div className={styles['nickname-label']}>플레이어</div>
                <div className={styles['nickname-value']}>{displayName}</div>
              </div>
              <button onClick={handleEditClick} className={styles['btn-edit']}>
                <span>✏️</span> 닉네임 변경
              </button>
            </>
          ) : (
            <>
              <div className={styles['name-input-wrapper']}>
                <input
                  type="text"
                  placeholder="새로운 닉네임 (최대 20자)"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={20}
                  className={styles['name-input']}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className={styles['edit-buttons']}>
                <button
                  onClick={handleSaveName}
                  disabled={!tempName.trim()}
                  className={styles['btn-save']}
                >
                  ✓ 저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className={styles['btn-cancel-edit']}
                >
                  ✕ 취소
                </button>
              </div>
            </>
          )}
        </div>

        {!editingName && (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={handleShare}
              className={styles['btn-share']}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 25px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              <span>📤</span> 공유하기
            </button>
            <button
              onClick={onClose}
              className={styles['btn-close']}
              style={{ flex: 1 }}
            >
              확인
            </button>
          </div>
        )}

        {showShareToast && (
          <div
            style={{
              position: 'fixed',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              zIndex: 10000,
              animation: 'fadeInOut 2s ease-in-out',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            ✅ 클립보드에 복사되었습니다!
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModal;
