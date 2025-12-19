import React from 'react';
import styles from '../RunnerExtras.module.css';

const GameModal = ({
  showModal,
  score,
  coins,
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
        <div className={styles['final-stats']}>
          <p className={styles['final-score']}>
            최종 점수: <strong>{score}</strong>
          </p>
          <p className={styles['final-coins']}>
            획득 코인: <strong>💰 {coins}</strong>
          </p>
        </div>

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
