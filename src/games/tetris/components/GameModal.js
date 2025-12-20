import React from 'react';

const GameModal = ({
  showModal,
  score,
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
    <div className="tetris-modal-overlay">
      <div className="tetris-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tetris-modal-content">
          <p className="tetris-modal-score">
            당신의 점수: <strong>{score}</strong>
          </p>
          <div className="tetris-modal-form">
            <input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isSaving) {
                  onSave();
                }
              }}
              maxLength={20}
              disabled={isSaving}
              className="tetris-modal-input"
            />
          </div>
          {/* <p
            className="tetris-modal-remaining"
            style={{
              color: '#555',
              fontSize: '0.9rem',
              marginTop: '6px',
            }}
          >
            오늘 남은 서버 점수 기록: {saveAttemptsLeft}회
          </p> */}
          {saveLimitMessage && (
            <p
              className="tetris-modal-limit"
              style={{ color: '#a01b1b', fontSize: '0.9rem' }}
            >
              {saveLimitMessage}
            </p>
          )}
          <div className="tetris-modal-buttons">
            <button
              onClick={onSave}
              disabled={isSaving || !!saveLimitMessage}
              className="tetris-btn-save"
            >
              {isSaving ? '저장 중...' : '점수 저장 및 공유'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="tetris-btn-cancel"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameModal;
