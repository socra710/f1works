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

  if (!showModal) return null;

  const displayName = playerName || `Runner${Math.floor(Math.random() * 10000)}`;

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

  const modalTitle = title || (isNewRecord ? '🎉 신기록 달성! 🎉' : '게임 종료');

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']}>
        {isNewRecord && (
          <div className={styles['trophy-icon']}>🏆</div>
        )}
        
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

        <div className={styles['nickname-section']}>
          {!editingName ? (
            <>
              <div className={styles['nickname-card']}>
                <div className={styles['nickname-label']}>플레이어</div>
                <div className={styles['nickname-value']}>{displayName}</div>
              </div>
              <button 
                onClick={handleEditClick} 
                className={styles['btn-edit']}
              >
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
          <button onClick={onClose} className={styles['btn-close']}>
            확인
          </button>
        )}
      </div>
    </div>
  );
};

export default GameModal;
