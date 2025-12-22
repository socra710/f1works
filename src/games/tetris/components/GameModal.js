import React, { useState } from 'react';

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
  level,
  board,
}) => {
  const [showShareToast, setShowShareToast] = useState(false);

  if (!showModal) return null;

  // 보드 상태를 이모지로 변환 (상위 6줄만)
  const getBoardVisualization = () => {
    if (!board || board.length === 0) return '';

    const topRows = board.slice(0, 6); // 상위 6줄만
    return topRows
      .map((row) => {
        return row.map((cell) => (cell ? '⬛' : '⬜')).join('');
      })
      .join('\n');
  };

  const handleShare = () => {
    // 점수를 별로 시각화 (1000점당 별 1개)
    const starCount = Math.floor(score / 1000);
    const stars = '⭐'.repeat(Math.min(starCount, 10)); // 최대 10개

    // 레벨을 표현
    const levelEmoji = level >= 5 ? '🔥' : level >= 3 ? '⚡' : '📈';

    // 점수 구간별 이모지
    let trophy = '🎮';
    if (score >= 10000) trophy = '🏆';
    else if (score >= 5000) trophy = '🥇';
    else if (score >= 3000) trophy = '🥈';
    else if (score >= 1000) trophy = '🥉';

    // 보드 시각화
    const boardViz = getBoardVisualization();

    // 공유 텍스트 생성
    const shareText =
      `🎮 테트리스 결과 ${trophy}\n\n` +
      `👤 ${playerName || 'Player'}\n` +
      `📊 점수: ${score}점 ${stars}\n` +
      `${levelEmoji} 레벨: ${level}\n\n` +
      `📦 최종 보드 상태:\n${boardViz}\n\n` +
      `https://f1works.netlify.app/games/tetris`;

    // 클립보드에 복사
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 2000);
        })
        .catch(() => {
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
              onClick={handleShare}
              className="tetris-btn-share"
              style={{
                flex: 1,
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
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
              onClick={onSave}
              disabled={isSaving || !!saveLimitMessage}
              className="tetris-btn-save"
              style={{ flex: 1 }}
            >
              {isSaving ? '저장 중...' : '점수 저장'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="tetris-btn-cancel"
              style={{ flex: 1 }}
            >
              취소
            </button>
          </div>
        </div>

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
