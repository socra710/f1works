import './Tetris.css';
import React, { useState, useEffect, useRef } from 'react';

// expense와 동일한 방식의 API 베이스 URL 사용
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Tetris = () => {
  const canvasRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [level, setLevel] = useState(1);
  const [highScores, setHighScores] = useState([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState(''); // 사용자 ID (sessionStorage에서 받음)
  const gameStateRef = useRef({
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    gameRunning: false,
    dropSpeed: 500,
    dropInterval: null,
    gameStartTime: null,
    lastSpeedIncrease: 0,
  });

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 35;

  // 오리지널 테트리스 회전 시스템 (SRS)
  const TETRIS_PIECES = [
    {
      name: 'I',
      color: '#00f0f0',
      states: [
        [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
        ],
        [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
        ],
      ],
    },
    {
      name: 'O',
      color: '#f0f000',
      states: [
        [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      ],
    },
    {
      name: 'T',
      color: '#f00000',
      states: [
        [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        [
          [0, 1, 0],
          [0, 1, 1],
          [0, 1, 0],
        ],
        [
          [0, 0, 0],
          [1, 1, 1],
          [0, 1, 0],
        ],
        [
          [0, 1, 0],
          [1, 1, 0],
          [0, 1, 0],
        ],
      ],
    },
    {
      name: 'S',
      color: '#f000f0',
      states: [
        [
          [0, 1, 1],
          [1, 1, 0],
          [0, 0, 0],
        ],
        [
          [0, 1, 0],
          [0, 1, 1],
          [0, 0, 1],
        ],
        [
          [0, 0, 0],
          [0, 1, 1],
          [1, 1, 0],
        ],
        [
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
        ],
      ],
    },
    {
      name: 'Z',
      color: '#00f000',
      states: [
        [
          [1, 1, 0],
          [0, 1, 1],
          [0, 0, 0],
        ],
        [
          [0, 0, 1],
          [0, 1, 1],
          [0, 1, 0],
        ],
        [
          [0, 0, 0],
          [1, 1, 0],
          [0, 1, 1],
        ],
        [
          [0, 1, 0],
          [1, 1, 0],
          [1, 0, 0],
        ],
      ],
    },
    {
      name: 'J',
      color: '#0000f0',
      states: [
        [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        [
          [0, 1, 1],
          [0, 1, 0],
          [0, 1, 0],
        ],
        [
          [0, 0, 0],
          [1, 1, 1],
          [0, 0, 1],
        ],
        [
          [0, 1, 0],
          [0, 1, 0],
          [1, 1, 0],
        ],
      ],
    },
    {
      name: 'L',
      color: '#f0a000',
      states: [
        [
          [0, 0, 1],
          [1, 1, 1],
          [0, 0, 0],
        ],
        [
          [0, 1, 0],
          [0, 1, 0],
          [0, 1, 1],
        ],
        [
          [0, 0, 0],
          [1, 1, 1],
          [1, 0, 0],
        ],
        [
          [1, 1, 0],
          [0, 1, 0],
          [0, 1, 0],
        ],
      ],
    },
  ];

  // 순위 데이터 로드 (expense와 동일 패턴: API_BASE_URL 사용)
  const fetchHighScores = async () => {
    try {
      const url = `${API_BASE_URL}/jvWorksGetTetrisScores?limit=7`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('순위 조회 API 호출 실패');
      const json = await res.json();
      if (json && (json.success === true || json.success === 'true')) {
        const scores = Array.isArray(json.data) ? json.data : [];
        setHighScores(
          scores.map((s) => ({
            name: s.name,
            score: s.score,
            date: s.date,
          }))
        );
      } else {
        setHighScores([]);
      }
    } catch (e) {
      console.error('순위 조회 실패:', e);
      setHighScores([]);
    }
  };

  useEffect(() => {
    fetchHighScores();
    // 저장된 닉네임 불러오기
    const savedName = localStorage.getItem('tetrisPlayerName');
    if (savedName) {
      setPlayerName(savedName);
    }

    setTimeout(() => {
      // sessionStorage에서 userId 받아오기
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (sessionUser) {
        setUserId(atob(sessionUser));
      }
    }, 500);
  }, []);

  // 게임 종료 시 닉네임 모달 표시
  useEffect(() => {
    if (!gameOver || score <= 0) {
      console.log('모달 표시 안함:', { gameOver, score });
      return;
    }
    console.log('모달 표시:', { gameOver, score });
    setShowNameModal(true);
  }, [gameOver, score]);

  // 서버에 점수 저장 (expense와 동일 패턴: API_BASE_URL 사용, userId 포함)
  const saveScoreToServer = async (name) => {
    setIsSaving(true);
    try {
      const url = `${API_BASE_URL}/jvWorksSetTetrisScore`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || '',
          score: score,
          date: new Date().toISOString(),
          userId: userId || '', // userId 포함
        }),
      });

      if (!response.ok) {
        throw new Error(`점수 저장 API 오류: ${response.status}`);
      }
      const data = await response.json();
      if (data && (data.success === true || data.success === 'true')) {
        // 닉네임을 localStorage에 저장
        localStorage.setItem('tetrisPlayerName', name);
        await fetchHighScores();
      } else {
        console.error('점수 저장 실패:', data && data.message);
      }
    } catch (error) {
      console.error('API 호출 오류:', error);
    } finally {
      setIsSaving(false);
      // 저장 완료 후 모달 닫기
      setShowNameModal(false);
      setPlayerName('');
    }
  };

  const handleSaveName = () => {
    const name = playerName.trim() || '';
    saveScoreToServer(name);
  };

  const handleCancelModal = () => {
    setShowNameModal(false);
    setPlayerName('');
  };

  // 게임 종료 시 자동 저장 없음 (모달에서 API로 저장)

  const formatDate = (ts) => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const initBoard = () => {
    return Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(0));
  };

  const getRandomPiece = () => {
    const piece =
      TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    return {
      type: piece.name,
      color: piece.color,
      states: piece.states,
      rotationIndex: 0,
      shape: piece.states[0],
      x: Math.floor(COLS / 2) - 2,
      y: 0,
    };
  };

  const canMove = (piece, board, dx, dy) => {
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          if (
            boardX < 0 ||
            boardX >= COLS ||
            boardY >= ROWS ||
            (boardY >= 0 && board[boardY][boardX])
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // SRS 벽 킥 시스템
  const getWallKickOffsets = (type, rotationIndex) => {
    if (type === 'I') {
      // I 피스 벽 킥 오프셋
      const iKickTable = [
        [
          [0, 0],
          [-2, 0],
          [1, 0],
          [-2, -1],
          [1, 2],
        ],
        [
          [0, 0],
          [-1, 0],
          [2, 0],
          [-1, 2],
          [2, -1],
        ],
        [
          [0, 0],
          [2, 0],
          [-1, 0],
          [2, 1],
          [-1, -2],
        ],
        [
          [0, 0],
          [1, 0],
          [-2, 0],
          [1, -2],
          [-2, 1],
        ],
      ];
      return iKickTable[rotationIndex];
    } else if (type === 'O') {
      return [[0, 0]];
    } else {
      // 일반 피스 벽 킥 오프셋
      const normalKickTable = [
        [
          [0, 0],
          [-1, 0],
          [-1, 1],
          [0, -2],
          [-1, -2],
        ],
        [
          [0, 0],
          [1, 0],
          [1, -1],
          [0, 2],
          [1, 2],
        ],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, -2],
          [1, -2],
        ],
        [
          [0, 0],
          [-1, 0],
          [-1, -1],
          [0, 2],
          [-1, 2],
        ],
      ];
      return normalKickTable[rotationIndex];
    }
  };

  const rotatePiece = (piece) => {
    const nextRotationIndex = (piece.rotationIndex + 1) % 4;
    const nextShape = piece.states[nextRotationIndex];
    const board = gameStateRef.current.board;
    const kickOffsets = getWallKickOffsets(piece.type, piece.rotationIndex);

    // 벽 킥 오프셋 시도
    for (const [offsetX, offsetY] of kickOffsets) {
      const testPiece = {
        ...piece,
        shape: nextShape,
        x: piece.x + offsetX,
        y: piece.y + offsetY,
      };

      if (canMove(testPiece, board, 0, 0)) {
        testPiece.rotationIndex = nextRotationIndex;
        return testPiece;
      }
    }

    // 회전 불가능
    return piece;
  };

  const placePiece = (piece, board) => {
    const newBoard = board.map((row) => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    return newBoard;
  };

  const clearLines = (board) => {
    let newBoard = board.filter((row) => row.some((cell) => !cell));
    const linesCleared = board.length - newBoard.length;
    newBoard.unshift(
      ...Array(linesCleared)
        .fill(null)
        .map(() => Array(COLS).fill(0))
    );
    return { newBoard, linesCleared };
  };

  const drawBoard = (board, currentPiece) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.className = 'Tetris-canvas';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = board[y][x];
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE - 1,
            BLOCK_SIZE - 1
          );
        }
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }

    // Draw current piece
    if (currentPiece) {
      ctx.fillStyle = currentPiece.color;
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardX = currentPiece.x + x;
            const boardY = currentPiece.y + y;
            if (boardY >= 0) {
              ctx.fillRect(
                boardX * BLOCK_SIZE,
                boardY * BLOCK_SIZE,
                BLOCK_SIZE - 1,
                BLOCK_SIZE - 1
              );
            }
          }
        }
      }
    }
  };

  const dropPiece = () => {
    const gameState = gameStateRef.current;

    if (!gameState.currentPiece) {
      gameState.currentPiece = getRandomPiece();
    }

    if (canMove(gameState.currentPiece, gameState.board, 0, 1)) {
      gameState.currentPiece.y++;
    } else {
      gameState.board = placePiece(gameState.currentPiece, gameState.board);

      // 게임 오버 체크
      if (gameState.currentPiece.y <= 0) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        return;
      }

      const { newBoard, linesCleared } = clearLines(gameState.board);
      gameState.board = newBoard;

      if (linesCleared > 0) {
        gameState.score += linesCleared * 100;
        setScore(gameState.score);
      }

      gameState.currentPiece = getRandomPiece();

      if (!canMove(gameState.currentPiece, gameState.board, 0, 0)) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        return;
      }
    }

    drawBoard(gameState.board, gameState.currentPiece);
  };

  const startGame = () => {
    const gameState = gameStateRef.current;
    gameState.board = initBoard();
    gameState.currentPiece = getRandomPiece();
    gameState.score = 0;
    gameState.gameRunning = true;
    gameState.dropSpeed = 500;
    gameState.gameStartTime = Date.now();
    gameState.lastSpeedIncrease = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setTimeLeft(300);
    setLevel(1);

    drawBoard(gameState.board, gameState.currentPiece);

    if (gameState.dropInterval) {
      clearInterval(gameState.dropInterval);
    }

    gameState.dropInterval = setInterval(dropPiece, gameState.dropSpeed);
  };

  const handleKeyPress = (e) => {
    if (!gameStarted || gameOver) return;

    const gameState = gameStateRef.current;
    const piece = gameState.currentPiece;
    let shouldDraw = false;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (canMove(piece, gameState.board, -1, 0)) {
          piece.x--;
          shouldDraw = true;
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (canMove(piece, gameState.board, 1, 0)) {
          piece.x++;
          shouldDraw = true;
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        dropPiece();
        return;
      case 'ArrowUp':
      case 'z':
      case 'Z':
        e.preventDefault();
        gameState.currentPiece = rotatePiece(piece);
        shouldDraw = true;
        break;
      case ' ':
        e.preventDefault();
        // 스페이스바: 빠르게 내리기 (한 번에 완전히 내림)
        while (canMove(piece, gameState.board, 0, 1)) {
          piece.y++;
        }
        dropPiece();
        return;
      default:
        return;
    }

    if (shouldDraw) {
      drawBoard(gameState.board, gameState.currentPiece);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameStarted, gameOver]);

  // 타이머 및 속도 증가 효과
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timerInterval = setInterval(() => {
      const gameState = gameStateRef.current;
      const elapsedSeconds = Math.floor(
        (Date.now() - gameState.gameStartTime) / 1000
      );
      const remaining = Math.max(0, 300 - elapsedSeconds);

      setTimeLeft(remaining);

      // 1분(60초)마다 속도 증가
      const newLevel = Math.floor(elapsedSeconds / 60) + 1;
      // 레벨이 증가했을 때만 속도 갱신
      if (newLevel > gameState.lastSpeedIncrease) {
        gameState.lastSpeedIncrease = newLevel;
        // 더 공격적인 속도 증가: 분당 150ms 감소, 최소 60ms
        gameState.dropSpeed = Math.max(60, 500 - (newLevel - 1) * 150);

        // 새로운 속도로 드롭 인터벌 재설정
        clearInterval(gameState.dropInterval);
        gameState.dropInterval = setInterval(dropPiece, gameState.dropSpeed);
        setLevel(newLevel);
      }

      // 시간 종료
      if (remaining === 0) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        clearInterval(timerInterval);
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameStarted, gameOver]);

  return (
    <>
      <div className="tetris-main">
        <div className="tetris-header">
          <div className="header-container">
            <div className="level-display">
              <span className="level-label">LV</span>
              <span className="level-value">{level}</span>
            </div>
            <div className="timer-display">
              <div className="time-text">
                {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, '0')}
              </div>
              <div className="time-bar">
                <div
                  className="time-bar-fill"
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>
            </div>
            <div className="score-display">
              <span className="score-label">점수</span>
              <span className="score-value">{score}</span>
            </div>
          </div>
        </div>
        <section className="tetris-content">
          <div className="tetris-board-wrap">
            <canvas
              ref={canvasRef}
              width={COLS * BLOCK_SIZE}
              height={ROWS * BLOCK_SIZE}
              className="tetris-board"
            />
            {!gameStarted && (
              <div className="msg">
                <h3>{gameOver ? '게임 오버!' : '테트리스'}</h3>
                {gameOver && (
                  <>
                    <p style={{ color: '#a01b1b' }}>최종 점수: {score}</p>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}></p>
                  </>
                )}
                <button onClick={startGame}>게임 시작</button>
              </div>
            )}
          </div>

          <aside className="tetris-sidebar">
            <div className="sidebar-panel leaderboard">
              <div className="panel-title">순위</div>
              {highScores.length === 0 ? (
                <div className="panel-empty">아직 기록이 없어요.</div>
              ) : (
                <ol className="scores-list">
                  {highScores.map((s, idx) => (
                    <li
                      key={`${s.score}-${s.date}-${idx}`}
                      className="score-row"
                    >
                      <span className="rank">{idx + 1}</span>
                      <span className="name" style={{ textAlign: 'left' }}>
                        {s.name}
                      </span>
                      <span className="pts">{s.score}</span>
                      <span className="dt">{formatDate(s.date)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="sidebar-panel game-description">
              <div className="panel-title">게임 설명</div>
              <div className="panel-body">
                <p>
                  블록을 회전하고 이동하여 빈 칸 없이 줄을 만들면 라인이
                  제거되고 점수를 획득합니다. 시간은 5분으로 제한되며, 1분마다
                  블록 하강 속도가 빨라집니다.
                </p>
                <p className="controls-inline">
                  ←→ 이동 · ↑/Z 회전 · ↓ 빠르게 내리기 · SPACE 즉시 하강
                </p>
              </div>
            </div>
          </aside>
        </section>
        {/* <section className="controls-info">
          <p className="control-text">
            ←→: 이동 | ↑/Z: 회전 | ↓: 빠르게 내리기 | SPACE: 즉시 하강
          </p>
        </section> */}

        {/* 닉네임 저장 모달 - 최상단에 렌더링 */}
        {showNameModal && gameOver && (
          <div className="tetris-modal-overlay">
            <div className="tetris-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tetris-modal-content">
                {/* <h2>🎉 나의 위대함 알리기!</h2> */}
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
                        handleSaveName();
                      }
                    }}
                    maxLength={20}
                    disabled={isSaving}
                    className="tetris-modal-input"
                  />
                </div>
                <div className="tetris-modal-buttons">
                  <button
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="tetris-btn-save"
                  >
                    {isSaving ? '저장 중...' : '점수 저장 및 공유'}
                  </button>
                  <button
                    onClick={handleCancelModal}
                    disabled={isSaving}
                    className="tetris-btn-cancel"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Tetris;
