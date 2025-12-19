import React from 'react';
import styles from '../RunnerExtras.module.css';

const GameModal = ({
  showModal,
  score,
  coins,
  isNewRecord,
  playerName,
  setPlayerName,
  saveAttemptsLeft,
  saveLimitMessage,
  isSaving,
  onSave,
  onCancel,
}) => {
  if (!showModal) return null;

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']}>
        <h2>게임 종료!</h2>
        {isNewRecord && (
          <div className={styles['celebrate-banner']}>🎉 최고 기록 갱신! 🎉</div>
        )}
        <div className={styles['final-stats']}>
          <p className={styles['final-score']}>
            최종 점수: <strong>{score}</strong>
          </p>
          <p className={styles['final-coins']}>
            획득 코인: <strong>💰 {coins}</strong>
          </p>
          {isNewRecord && (
            <p className={styles['new-record-text']}>신기록입니다! 멋져요! 🎊</p>
          )}
        </div>

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
              const colors = ['#ff3366', '#ffd700', '#00d4ff', '#ff66ff', '#66ff66', '#ff9933', '#cc66ff'];
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
                      const color = colors[Math.floor(Math.random() * colors.length)];
                      const delay = (baseDelay + Math.random() * 0.15).toFixed(2) + 's';
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

        {saveLimitMessage ? (
          <>
            <p
              className={styles['limit-message']}
              dangerouslySetInnerHTML={{ __html: saveLimitMessage }}
            />
            <div className={styles['modal-buttons']}>
              <button onClick={onCancel} className={styles['btn-cancel']}>
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles['save-info']}>
              오늘 남은 서버 점수 기록: <strong>{saveAttemptsLeft}회</strong>
              <br />
              <small>연습은 무제한으로 가능해요!</small>
            </p>
            <div className={styles['name-input-group']}>
              <input
                type="text"
                placeholder="닉네임 입력 (최대 20자)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                disabled={isSaving}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    onSave();
                  }
                }}
              />
            </div>
            <div className={styles['modal-buttons']}>
              <button
                onClick={onSave}
                disabled={isSaving || !playerName.trim()}
                className={styles['btn-save']}
              >
                {isSaving ? '저장 중...' : '점수 저장'}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className={styles['btn-cancel']}
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameModal;
