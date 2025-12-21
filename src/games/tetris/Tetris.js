import './Tetris.css';
import React, { useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

// Components
import TetrisBoard from './components/TetrisBoard';
import NextPiecePreview from './components/NextPiecePreview';
import ScoreBoard from './components/ScoreBoard';
import GameModal from './components/GameModal';

// Hooks
import { useTetrisGame } from './hooks/useTetrisGame';
import { useScoreManagement } from './hooks/useScoreManagement';

// Utils
import { addBloodOverlay, addScreenShake } from './utils/effectsUtils';

const Tetris = () => {
  const canvasRef = useRef(null);
  const nextPieceCanvasRef = useRef(null);

  // 게임 로직 훅
  const {
    gameStarted,
    score,
    gameOver,
    timeLeft,
    level,
    nextPiece,
    userId,
    board,
    currentPiece,
    gameStateRef,
    startGame,
  } = useTetrisGame(canvasRef);

  // 점수 관리 훅
  const {
    highScores,
    isLoadingScores,
    showNameModal,
    setShowNameModal,
    playerName,
    setPlayerName,
    isSaving,
    saveLimitMessage,
    saveAttemptsLeft,
    handleSaveName,
    handleCancelModal,
  } = useScoreManagement();

  // Kakao 광고 스크립트 로드
  useEffect(() => {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
      script.async = true;
      document.body.appendChild(script);
    }, 500);
  }, []);

  // 게임 오버 시 공포 이펙트
  useEffect(() => {
    if (gameOver) {
      addScreenShake();
      const cleanup = addBloodOverlay();
      return cleanup;
    }
  }, [gameOver]);

  // 게임 종료 시 닉네임 모달 표시
  useEffect(() => {
    if (!gameOver || score <= 0) return;
    setShowNameModal(true);
  }, [gameOver, score, setShowNameModal]);

  return (
    <>
      <Helmet>
        <title>테트리스 게임</title>
        <meta property="og:title" content="테트리스 게임" />
        <meta
          property="og:description"
          content="5분 동안 최대한 많은 점수를 획득하세요! 시간이 지날수록 블록이 빨라지고, 회색 블록이 추가되어 난이도가 상승합니다."
        />
        <meta
          property="og:url"
          content={`https://f1works.netlify.app/games/tetris`}
        />
      </Helmet>
      <div className="tetris-main">
        <div className="tetris-header">
          <div className="tetris-header-top">
            <h1 className="game-title" aria-label="TETRIS">TETRIS</h1>
            <div className="header-center" aria-live="polite">
              <div className="time-text" aria-label="남은 시간">
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="header-badges">
              <div className="badge badge-level" aria-label={`레벨 ${level}`}>
                <span className="badge-label">LV</span>
                <span className="badge-value">{level}</span>
              </div>
              <div className="badge badge-score" aria-label={`점수 ${score}`}>
                <span className="badge-label">점수</span>
                <span className="badge-value">{score}</span>
              </div>
            </div>
          </div>
          <div className="tetris-header-bottom">
            <div className="time-bar" role="meter" aria-valuemin={0} aria-valuemax={300} aria-valuenow={timeLeft}>
              <div
                className="time-bar-fill"
                style={{ width: `${(timeLeft / 300) * 100}%` }}
              />
            </div>
          </div>
          <div className="controls-inline">← → 이동 · ↑ 회전 · SPACE 하드드롭</div>
        </div>
        <section className="tetris-content">
          <div className="tetris-board-wrap">
            <div className="tetris-next-stack">
              <NextPiecePreview
                canvasRef={nextPieceCanvasRef}
                nextPiece={nextPiece}
              />
              <div className="tetris-ad">
                <ins
                  className="kakao_ad_area"
                  data-ad-unit="DAN-OsuvBWYzUobzL8DU"
                  data-ad-width="160"
                  data-ad-height="600"
                />
              </div>
            </div>
            <TetrisBoard
              canvasRef={canvasRef}
              board={board || []}
              currentPiece={currentPiece || null}
              bloodParticles={gameStateRef.current.bloodParticles || []}
            />
            {!gameStarted && (
              <div className="msg">
                <h3>{gameOver ? '게임 오버!' : '테트리스'}</h3>
                {gameOver && (
                  <>
                    <p style={{ color: '#a01b1b', fontWeight: 'bold' }}>
                      최종 점수: {score}
                    </p>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                      닉네임을 입력하고 점수를 저장해보세요!
                    </p>
                  </>
                )}
                <button onClick={startGame}>게임 시작</button>
              </div>
            )}
          </div>

          <ScoreBoard
            highScores={highScores}
            isLoadingScores={isLoadingScores}
          />
        </section>

        <GameModal
          showModal={showNameModal && gameOver}
          score={score}
          playerName={playerName}
          setPlayerName={setPlayerName}
          saveAttemptsLeft={saveAttemptsLeft}
          saveLimitMessage={saveLimitMessage}
          isSaving={isSaving}
          onSave={() => handleSaveName(playerName, score, userId)}
          onCancel={handleCancelModal}
        />
      </div>
    </>
  );
};

export default Tetris;
