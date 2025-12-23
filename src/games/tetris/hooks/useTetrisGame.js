import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GAME_DURATION,
  INITIAL_DROP_SPEED,
  MIN_DROP_SPEED,
  SPEED_DECREASE_PER_LEVEL,
  LEVEL_DURATION,
  SCORE_PER_LINE,
} from '../utils/constants';
import {
  initBoard,
  getRandomPiece,
  canMove,
  rotatePiece,
  placePiece,
  clearLines,
  addGrayLine,
} from '../utils/gameLogic';
import { playWarningSound } from '../utils/audioUtils';
import { addGrayLineWarning } from '../utils/effectsUtils';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../../common/extensionLogin';

export const useTetrisGame = (canvasRef) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [level, setLevel] = useState(1);
  const [nextPiece, setNextPiece] = useState(null);
  const [userId, setUserId] = useState('');
  const [board, setBoard] = useState([]);
  const [currentPiece, setCurrentPiece] = useState(null);

  const gameStateRef = useRef({
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    gameRunning: false,
    dropSpeed: INITIAL_DROP_SPEED,
    dropInterval: null,
    gameStartTime: null,
    lastSpeedIncrease: 1,
    grayLineActive: false,
    grayLineRow: -1,
    grayLineInterval: null,
    bloodParticles: [],
  });

  // userId 로드 (공통 유틸 사용)
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const encoded = await waitForExtensionLogin({
          minWait: 0,
          maxWait: 2000,
        });
        if (cancelled) return;
        if (encoded) {
          setUserId(decodeUserId(encoded));
        }
      } catch (e) {
        // ignore
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // 블록 드롭
  const dropPiece = useCallback(() => {
    const gameState = gameStateRef.current;

    if (!gameState.currentPiece) {
      gameState.currentPiece = getRandomPiece();
      setCurrentPiece(gameState.currentPiece);
      if (!gameState.nextPiece) {
        gameState.nextPiece = getRandomPiece();
        setNextPiece(gameState.nextPiece);
      }
    }

    if (canMove(gameState.currentPiece, gameState.board, 0, 1)) {
      gameState.currentPiece.y++;
      setCurrentPiece({ ...gameState.currentPiece });
    } else {
      gameState.board = placePiece(gameState.currentPiece, gameState.board);
      setBoard([...gameState.board]);

      if (gameState.currentPiece.y <= 0) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        return;
      }

      const { newBoard, linesCleared } = clearLines(gameState.board);
      gameState.board = newBoard;
      setBoard([...gameState.board]);

      if (linesCleared > 0) {
        gameState.score += linesCleared * SCORE_PER_LINE;
        setScore(gameState.score);
      }

      gameState.currentPiece = gameState.nextPiece;
      setCurrentPiece(gameState.currentPiece);
      gameState.nextPiece = getRandomPiece();
      setNextPiece(gameState.nextPiece);

      if (
        !gameState.currentPiece ||
        !canMove(gameState.currentPiece, gameState.board, 0, 0)
      ) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        return;
      }
    }
  }, []);

  // 게임 시작
  const startGame = useCallback(() => {
    const gameState = gameStateRef.current;
    gameState.board = initBoard();
    setBoard([...gameState.board]);
    gameState.currentPiece = getRandomPiece();
    setCurrentPiece(gameState.currentPiece);
    gameState.nextPiece = getRandomPiece();
    gameState.score = 0;
    gameState.gameRunning = true;
    gameState.dropSpeed = INITIAL_DROP_SPEED;
    gameState.gameStartTime = Date.now();
    gameState.lastSpeedIncrease = 1;
    gameState.grayLineActive = false;
    gameState.grayLineRow = -1;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setNextPiece(gameState.nextPiece);

    if (gameState.dropInterval) {
      clearInterval(gameState.dropInterval);
    }

    gameState.dropInterval = setInterval(dropPiece, gameState.dropSpeed);
  }, [dropPiece]);

  // 키 입력 처리
  const handleKeyPress = useCallback(
    (e) => {
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
          gameState.currentPiece = rotatePiece(piece, gameState.board);
          shouldDraw = true;
          break;
        case ' ':
          e.preventDefault();
          while (canMove(piece, gameState.board, 0, 1)) {
            piece.y++;
          }
          dropPiece();
          return;
        default:
          return;
      }

      if (shouldDraw) {
        setCurrentPiece({ ...gameState.currentPiece });
      }
    },
    [gameStarted, gameOver, dropPiece]
  );

  // 키 이벤트 리스너
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // 타이머 및 레벨 시스템
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timerInterval = setInterval(() => {
      const gameState = gameStateRef.current;
      const elapsedSeconds = Math.floor(
        (Date.now() - gameState.gameStartTime) / 1000
      );
      const remaining = Math.max(0, GAME_DURATION - elapsedSeconds);

      setTimeLeft(remaining);

      const newLevel = Math.floor(elapsedSeconds / LEVEL_DURATION) + 1;
      if (newLevel > gameState.lastSpeedIncrease) {
        gameState.lastSpeedIncrease = newLevel;
        gameState.dropSpeed = Math.max(
          MIN_DROP_SPEED,
          INITIAL_DROP_SPEED - (newLevel - 1) * SPEED_DECREASE_PER_LEVEL
        );

        clearInterval(gameState.dropInterval);
        gameState.dropInterval = setInterval(dropPiece, gameState.dropSpeed);
        setLevel(newLevel);

        let grayLineCount = 1;
        if (remaining <= 60) {
          grayLineCount = 3;
        } else if (remaining <= 120) {
          grayLineCount = 2;
        } else if (remaining <= 180) {
          grayLineCount = 2;
        } else {
          grayLineCount = 1;
        }

        for (let i = 0; i < grayLineCount; i++) {
          playWarningSound();
          addGrayLineWarning();
          gameState.board = addGrayLine(gameState.board);
          setBoard([...gameState.board]);
        }
      }

      if (remaining === 0) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        clearInterval(timerInterval);
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameStarted, gameOver, dropPiece]);

  return {
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
    handleKeyPress,
  };
};
