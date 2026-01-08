import './Tetris.css';
import React, { useRef, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../common/Toast';

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
  const navigate = useNavigate();
  const { showToast } = useToast();
  const mobileCheckDone = useRef(false);

  useEffect(() => {
    if (mobileCheckDone.current) return;
    mobileCheckDone.current = true;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobile) {
      showToast('모바일에서는 플레이 할 수 없습니다.', 'error');
      navigate('/works');
    }
  }, [navigate, showToast]);
  const canvasRef = useRef(null);
  const nextPieceCanvasRef = useRef(null);
  const themes = [
    { id: 'red', label: 'Red' },
    { id: 'blue', label: 'Blue' },
    { id: 'green', label: 'Green' },
    { id: 'mono', label: 'Mono' },
  ];
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tetris-theme') || 'red';
  });

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('tetris-theme', newTheme);
  };

  const basePieceColors = [
    '#ff3333',
    '#ee5555',
    '#ff5555',
    '#dd4444',
    '#ff6666',
    '#ff4444',
    '#ff7777',
  ];

  const themePalettes = {
    red: [
      '#ff3333',
      '#ee5555',
      '#ff5555',
      '#dd4444',
      '#ff6666',
      '#ff4444',
      '#ff7777',
    ],
    blue: [
      '#4f8bff',
      '#65a5ff',
      '#7aa8ff',
      '#5c7cff',
      '#4f6bff',
      '#4560ff',
      '#7f96ff',
    ],
    green: [
      '#2ecc71',
      '#3fd68a',
      '#2fcf82',
      '#29b46f',
      '#34d399',
      '#27ae60',
      '#5adea8',
    ],
    mono: [
      '#b4b4b4',
      '#c2c2c2',
      '#a8a8a8',
      '#8f8f8f',
      '#9a9a9a',
      '#7f7f7f',
      '#cfcfcf',
    ],
  };

  const colorMap = React.useMemo(() => {
    const palette = themePalettes[theme] || themePalettes.red;
    const map = {};
    basePieceColors.forEach((c, idx) => {
      map[c] = palette[idx] || c;
    });
    return map;
  }, [theme]);

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
      <div className={`tetris-main theme-${theme}`}>
        <div className="tetris-header">
          <div className="tetris-header-top">
            <h1 className="game-title" aria-label="TETRIS">
              TETRIS
            </h1>
            <div className="header-badges">
              <div className="badge badge-level" aria-label={`레벨 ${level}`}>
                <span className="badge-label">LV</span>
                <span className="badge-value">{level}</span>
              </div>
              <div
                className="badge badge-time"
                aria-label="남은 시간"
                aria-live="polite"
              >
                <span className="badge-label">TIME</span>
                <span className="badge-value">
                  {Math.floor(timeLeft / 60)}:
                  {String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="badge badge-score" aria-label={`점수 ${score}`}>
                <span className="badge-label">점수</span>
                <span className="badge-value">{score}</span>
              </div>
            </div>
            <div className="header-right">
              <select
                className="theme-select"
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                aria-label="테마 변경"
              >
                {themes.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="tetris-header-bottom">
            <div
              className="time-bar"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={300}
              aria-valuenow={timeLeft}
            >
              <div
                className="time-bar-fill"
                style={{ width: `${(timeLeft / 300) * 100}%` }}
              />
            </div>
          </div>
          <div className="controls-inline">
            ← → 이동 · ↑ 회전 · SPACE 하드드롭
          </div>
        </div>
        <section className="tetris-content">
          <div className="tetris-board-wrap">
            <div className="tetris-next-stack">
              <NextPiecePreview
                canvasRef={nextPieceCanvasRef}
                nextPiece={nextPiece}
                colorMap={colorMap}
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
              colorMap={colorMap}
            />
            {!gameStarted && (
              <div className="msg">
                <h3>{gameOver ? '게임 오버!' : '테트리스'}</h3>
                {gameOver && (
                  <>
                    <p className="final-score">최종 점수: {score}</p>
                    <p className="final-score-sub">
                      닉네임을 입력하고 점수를 저장해보세요!
                    </p>
                  </>
                )}
                {!gameOver && (
                  <div className="controls-guide">
                    <p>← → 이동 · ↑ 회전 · SPACE 하드드롭</p>
                  </div>
                )}
                <button onClick={startGame}>게임 시작</button>
              </div>
            )}
          </div>

          <ScoreBoard
            highScores={highScores}
            isLoadingScores={isLoadingScores}
            theme={theme}
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
          level={level}
          board={board}
        />
      </div>
    </>
  );
};

export default Tetris;
