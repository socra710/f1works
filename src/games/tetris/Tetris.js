import './Tetris.css';
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';

// expense와 동일한 방식의 API 베이스 URL 사용
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const MAX_DAILY_SERVER_SAVES = 3;
const DAILY_SAVE_STORAGE_KEY = 'tetrisDailyServerSaves';

const Tetris = () => {
  const canvasRef = useRef(null);
  const nextPieceCanvasRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [level, setLevel] = useState(1);
  const [highScores, setHighScores] = useState([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState(''); // 사용자 ID (sessionStorage에서 받음)
  const [nextPiece, setNextPiece] = useState(null); // 다음 블록 미리보기용
  const [saveLimitMessage, setSaveLimitMessage] = useState('');
  const [saveAttemptsLeft, setSaveAttemptsLeft] = useState(
    MAX_DAILY_SERVER_SAVES
  );
  const gameStateRef = useRef({
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    gameRunning: false,
    dropSpeed: 800,
    dropInterval: null,
    gameStartTime: null,
    lastSpeedIncrease: 1,
    grayLineActive: false, // 회색 블록 활성화
    grayLineRow: -1, // 회색 블록이 있는 행
    grayLineInterval: null, // 회색 블록 전용 인터벌
    bloodParticles: [], // 피 튀김 파티클
  });

  const COLS = 10;
  const ROWS = 21;
  const BLOCK_SIZE = 35;

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
      const mainElement = document.querySelector('.tetris-main');
      if (mainElement) {
        // 화면 흔들림 효과
        mainElement.classList.add('screen-shake');
        setTimeout(() => {
          mainElement.classList.remove('screen-shake');
        }, 500);

        // 피 오버레이 추가
        const overlay = document.createElement('div');
        overlay.className = 'blood-overlay';
        mainElement.appendChild(overlay);

        // 피 흘림 이펙트 추가
        const drips = [
          'drip1',
          'drip2',
          'drip3',
          'drip4',
          'drip5',
          'drip6',
          'drip7',
        ];
        drips.forEach((cls, idx) => {
          const drip = document.createElement('div');
          drip.className = `blood-drip ${cls}`;
          drip.style.top = '0';
          mainElement.appendChild(drip);
        });

        // 정리 함수
        return () => {
          const existingOverlay = mainElement.querySelector('.blood-overlay');
          if (existingOverlay) existingOverlay.remove();
          document
            .querySelectorAll('.blood-drip')
            .forEach((drip) => drip.remove());
        };
      }
    }
  }, [gameOver]);

  // 오리지널 테트리스 회전 시스템 (SRS)
  const TETRIS_PIECES = [
    {
      name: 'I',
      color: '#ff3333',
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
      color: '#ee5555',
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
      color: '#ff5555',
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
      color: '#dd4444',
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
      color: '#ff6666',
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
      color: '#ff4444',
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
      color: '#ff7777',
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
    setIsLoadingScores(true);
    try {
      const url = `${API_BASE_URL}/jvWorksGetTetrisScores?limit=8`;
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
    } finally {
      setIsLoadingScores(false);
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
      // console.log('모달 표시 안함:', { gameOver, score });
      return;
    }
    // console.log('모달 표시:', { gameOver, score });
    setShowNameModal(true);
  }, [gameOver, score]);

  useEffect(() => {
    if (!showNameModal) return;
    const info = getDailySaveInfo();
    const remaining = Math.max(0, MAX_DAILY_SERVER_SAVES - info.count);
    setSaveAttemptsLeft(remaining);
    if (info.count >= MAX_DAILY_SERVER_SAVES) {
      setSaveLimitMessage(
        '아쉽지만 서버 점수 기록은 하루에 3번만 가능해요. 하지만 연습은 계속할 수 있어요!'
      );
    } else {
      setSaveLimitMessage('');
    }
  }, [showNameModal]);

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
        const info = getDailySaveInfo();
        const updatedCount =
          info.date === getTodayString() ? info.count + 1 : 1;
        setDailySaveInfo({ date: getTodayString(), count: updatedCount });
        setSaveAttemptsLeft(Math.max(0, MAX_DAILY_SERVER_SAVES - updatedCount));
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
    const info = getDailySaveInfo();
    if (info.count >= MAX_DAILY_SERVER_SAVES) {
      setSaveLimitMessage(
        '아쉽지만 서버 점수 기록은 하루에 3번만 가능해요. 하지만 연습은 계속할 수 있어요!'
      );
      setSaveAttemptsLeft(0);
      return;
    }
    setSaveLimitMessage('');
    setSaveAttemptsLeft(Math.max(0, MAX_DAILY_SERVER_SAVES - info.count));
    saveScoreToServer(name);
  };

  const handleCancelModal = () => {
    setShowNameModal(false);
    setPlayerName('');
    setSaveLimitMessage('');
    setSaveAttemptsLeft(MAX_DAILY_SERVER_SAVES);
  };

  // 게임 종료 시 자동 저장 없음 (모달에서 API로 저장)

  const formatDate = (ts) => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTodayString = () => formatDate(Date.now());

  const getDailySaveInfo = () => {
    try {
      const raw = localStorage.getItem(DAILY_SAVE_STORAGE_KEY);
      if (!raw) {
        return { date: getTodayString(), count: 0 };
      }
      const parsed = JSON.parse(raw);
      if (!parsed.date || typeof parsed.count !== 'number') {
        return { date: getTodayString(), count: 0 };
      }
      if (parsed.date !== getTodayString()) {
        return { date: getTodayString(), count: 0 };
      }
      return parsed;
    } catch (e) {
      console.error('일일 저장 정보 파싱 실패:', e);
      return { date: getTodayString(), count: 0 };
    }
  };

  const setDailySaveInfo = (info) => {
    try {
      localStorage.setItem(DAILY_SAVE_STORAGE_KEY, JSON.stringify(info));
    } catch (e) {
      console.error('일일 저장 정보 저장 실패:', e);
    }
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
    // 회색 블록(#808080)을 제외하고 완전히 채워진 줄만 제거
    let newBoard = board.filter((row) => {
      // 빈 칸이 있으면 유지
      if (row.some((cell) => !cell)) return true;
      // 모두 회색 블록이면 유지
      if (row.every((cell) => cell === '#808080')) return true;
      // 회색 블록이 아닌 블록으로 완전히 채워진 줄만 제거
      return false;
    });
    const linesCleared = board.length - newBoard.length;
    newBoard.unshift(
      ...Array(linesCleared)
        .fill(null)
        .map(() => Array(COLS).fill(0))
    );
    return { newBoard, linesCleared };
  };

  // 피 튀김 효과 생성 - 모니터 화면으로 튀기는 느낌
  const spawnBloodParticles = (linesClearedCount) => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    // 지워진 라인의 Y 위치 계산 (캔버스 중앙 근처)
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const particleCount = linesClearedCount * 8; // 라인당 8개 파티클

    for (let i = 0; i < particleCount; i++) {
      // 더 넓은 각도로 분산 - 모니터 화면 전체로 튀기는 느낌
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8; // 더 빠른 속도
      const tx = Math.cos(angle) * speed * 40; // 더 멀리 날아감
      const ty = Math.sin(angle) * speed * 40;

      const particle = {
        id: Date.now() + Math.random(),
        // 캔버스 중앙에서 시작
        x: containerRect.left + canvasRect.width / 2 + window.scrollX,
        y: containerRect.top + canvasRect.height * 0.6 + window.scrollY,
        tx: tx,
        ty: ty,
        size: 8 + Math.random() * 15, // 더 큰 사이즈
        life: 1,
        opacity: 0.9,
        maxLife: 1,
        isScreenParticle: true, // 화면 좌표 파티클 플래그
      };

      gameStateRef.current.bloodParticles.push(particle);
    }

    // 파티클 애니메이션 업데이트 함수
    const animateParticles = () => {
      const particles = gameStateRef.current.bloodParticles;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.04; // 약간 더 오래 지속
        p.x += p.tx * 0.15; // 더 빠른 이동
        p.y += p.ty * 0.15;
        p.ty += 0.8; // 더 강한 중력 효과

        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    };

    // 애니메이션 프레임 반복
    let frameCount = 0;
    const particleInterval = setInterval(() => {
      animateParticles();
      frameCount++;

      if (frameCount > 25) {
        // 약 1000ms
        clearInterval(particleInterval);
      }

      // 화면 파티클과 캔버스 파티클 모두 렌더링
      drawBoard(gameStateRef.current.board, gameStateRef.current.currentPiece);
      drawScreenBloodParticles();
    }, 40);
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

    // 피 튀김 파티클 그리기
    const particles = gameStateRef.current.bloodParticles;
    for (const p of particles) {
      ctx.fillStyle = `rgba(255, 0, 0, ${p.life * 0.8})`;
      ctx.shadowColor = `rgba(255, 0, 0, ${p.life * 0.6})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  // 다음 블록 미리보기 렌더링
  const drawNextPiece = (piece) => {
    const canvas = nextPieceCanvasRef.current;
    if (!canvas || !piece) return;

    const ctx = canvas.getContext('2d');
    const previewBlockSize = 20;

    // 배경 초기화
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 블록의 실제 크기 계산
    const shape = piece.shape;
    let minX = 4,
      maxX = 0,
      minY = 4,
      maxY = 0;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const pieceWidth = (maxX - minX + 1) * previewBlockSize;
    const pieceHeight = (maxY - minY + 1) * previewBlockSize;
    const offsetX = (canvas.width - pieceWidth) / 2 - minX * previewBlockSize;
    const offsetY = (canvas.height - pieceHeight) / 2 - minY * previewBlockSize;

    // 블록 그리기
    ctx.fillStyle = piece.color;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          ctx.fillRect(
            offsetX + x * previewBlockSize,
            offsetY + y * previewBlockSize,
            previewBlockSize - 1,
            previewBlockSize - 1
          );
        }
      }
    }
  };

  // 경고음 재생 함수
  const playWarningSound = () => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A 음
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // 맨 아래에 회색 블록 한 줄을 추가하고 모든 블록을 위로 밀어올림
  const addGrayLineAtCurrentLevel = () => {
    const gameState = gameStateRef.current;

    // 경고 효과 실행
    playWarningSound();

    // 화면 흔들림 효과
    const mainElement = document.querySelector('.tetris-main');
    if (mainElement) {
      mainElement.classList.add('gray-line-warning');
      setTimeout(() => {
        mainElement.classList.remove('gray-line-warning');
      }, 500);
    }

    // 모든 행을 한 칸씩 위로 이동 (맨 위 줄은 제거됨)
    const newBoard = gameState.board.slice(1);

    // 맨 아래에 회색 블록 한 줄 추가
    const grayLine = Array(COLS).fill('#808080');
    newBoard.push(grayLine);

    gameState.board = newBoard;

    // 캔버스에 회색 블록 등장 효과를 위해 플래시 추가
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
      ctx.fillRect(0, (ROWS - 1) * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
      ctx.restore();
    }

    drawBoard(gameState.board, gameState.currentPiece);
  };

  // 화면 좌표에서 피 파티클 렌더링
  const drawScreenBloodParticles = () => {
    const screenParticles = gameStateRef.current.bloodParticles.filter(
      (p) => p.isScreenParticle
    );

    if (screenParticles.length === 0) return;

    // 임시 오버레이 div 생성 또는 기존 것 사용
    let overlay = document.getElementById('blood-particle-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'blood-particle-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '999';
      document.body.appendChild(overlay);
    }

    // 기존 파티클 제거
    overlay.innerHTML = '';

    // 파티클 렌더링
    screenParticles.forEach((p) => {
      const div = document.createElement('div');
      const opacity = p.life * p.opacity;

      div.style.position = 'fixed';
      div.style.left = p.x + 'px';
      div.style.top = p.y + 'px';
      div.style.width = p.size + 'px';
      div.style.height = p.size + 'px';
      div.style.borderRadius = '50%';
      div.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
      div.style.boxShadow = `0 0 ${p.size * 0.8}px rgba(255, 0, 0, ${
        opacity * 0.6
      })`;
      div.style.transform = 'translate(-50%, -50%)';
      div.style.pointerEvents = 'none';

      overlay.appendChild(div);
    });
  };

  const dropPiece = () => {
    const gameState = gameStateRef.current;

    if (!gameState.currentPiece) {
      gameState.currentPiece = getRandomPiece();
      // 다음 블록도 미리 생성
      if (!gameState.nextPiece) {
        gameState.nextPiece = getRandomPiece();
        setNextPiece(gameState.nextPiece);
      }
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
        // 피 튀김 효과 발동
        // spawnBloodParticles(linesCleared);
      }

      // 다음 블록을 현재 블록으로, 새로운 다음 블록 생성
      gameState.currentPiece = gameState.nextPiece;
      gameState.nextPiece = getRandomPiece();
      setNextPiece(gameState.nextPiece);

      if (!canMove(gameState.currentPiece, gameState.board, 0, 0)) {
        gameState.gameRunning = false;
        setGameOver(true);
        setGameStarted(false);
        clearInterval(gameState.dropInterval);
        return;
      }
    }

    drawBoard(gameState.board, gameState.currentPiece, gameState.grayLineY);
  };

  const startGame = () => {
    const gameState = gameStateRef.current;
    gameState.board = initBoard();
    gameState.currentPiece = getRandomPiece();
    gameState.nextPiece = getRandomPiece();
    gameState.score = 0;
    gameState.gameRunning = true;
    gameState.dropSpeed = 800;
    gameState.gameStartTime = Date.now();
    gameState.lastSpeedIncrease = 1;
    gameState.grayLineActive = false; // 회색 블록 비활성화
    gameState.grayLineRow = -1; // 회색 블록 행 초기화
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setTimeLeft(300);
    setLevel(1);
    setNextPiece(gameState.nextPiece);

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

    // 키 입력 시 즉시 화면에 반영
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

  // 다음 블록 미리보기 렌더링
  useEffect(() => {
    if (nextPiece) {
      drawNextPiece(nextPiece);
    }
  }, [nextPiece]);

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

      // 1분(60초)마다 속도 증가 및 회색 블록 시작
      const newLevel = Math.floor(elapsedSeconds / 60) + 1;
      // 레벨이 증가했을 때만 속도 갱신 및 회색 블록 추가
      if (newLevel > gameState.lastSpeedIncrease) {
        gameState.lastSpeedIncrease = newLevel;
        // 완만한 속도 증가: 분당 50ms 감소, 최소 100ms
        gameState.dropSpeed = Math.max(100, 800 - (newLevel - 1) * 50);

        // 새로운 속도로 드롭 인터벌 재설정
        clearInterval(gameState.dropInterval);
        gameState.dropInterval = setInterval(dropPiece, gameState.dropSpeed);
        setLevel(newLevel);

        // 남은 시간에 따라 회색 블록 개수 결정
        // 1분 경과(4분 남음): 1줄, 2분(3분 남음): 1줄, 3분(2분 남음): 2줄, 4분(1분 남음): 3줄
        let grayLineCount = 1;
        if (remaining <= 60) {
          grayLineCount = 3; // 4분 경과 (1분 남음)
        } else if (remaining <= 120) {
          grayLineCount = 2; // 3분 경과 (2분 남음)
        } else if (remaining <= 180) {
          grayLineCount = 2; // 2분 경과 (3분 남음)
        } else {
          grayLineCount = 1; // 1분 경과 (4분 남음)
        }

        // 회색 블록을 지정된 개수만큼 추가
        for (let i = 0; i < grayLineCount; i++) {
          addGrayLineAtCurrentLevel();
        }
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

  const getRankLabel = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    return '';
  };

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
          <div className="tetris-header-container">
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
            <div className="tetris-next-stack">
              <div className="next-piece-preview">
                <div className="preview-label">다음 블록</div>
                <canvas
                  ref={nextPieceCanvasRef}
                  width={130}
                  height={80}
                  className="next-piece-canvas"
                />
              </div>
              <div className="tetris-ad">
                <ins
                  className="kakao_ad_area"
                  data-ad-unit="DAN-OsuvBWYzUobzL8DU"
                  data-ad-width="160"
                  data-ad-height="600"
                />
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={COLS * BLOCK_SIZE}
              height={ROWS * BLOCK_SIZE}
              className="tetris-board canvas-glow"
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
                      오늘 남은 서버 점수 기록: {saveAttemptsLeft}회<br />
                      연습은 무제한으로 가능해요!
                    </p>
                  </>
                )}
                <button onClick={startGame}>게임 시작</button>
              </div>
            )}
          </div>

          <aside className="tetris-sidebar">
            <div className="sidebar-panel leaderboard">
              <div className="panel-title">순위</div>
              {isLoadingScores ? (
                <div className="skeleton-loader">
                  {[...Array(7)].map((_, idx) => (
                    <div key={idx} className="skeleton-score-row">
                      <span className="skeleton-rank"></span>
                      <span className="skeleton-name"></span>
                      <span className="skeleton-pts"></span>
                      <span className="skeleton-dt"></span>
                    </div>
                  ))}
                </div>
              ) : highScores.length === 0 ? (
                <div className="panel-empty">아직 기록이 없어요.</div>
              ) : (
                <ol className="scores-list">
                  {highScores.map((s, idx) => (
                    <li
                      key={`${s.score}-${s.date}-${idx}`}
                      className={`score-row ${getRankClass(idx + 1)}`.trim()}
                    >
                      <span className="rank">{getRankLabel(idx + 1)}</span>
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
                  시간은 5분으로 제한되며, 1분마다 블록 하강 속도가 빨라집니다.
                  또한, 시간이 지남에 따라 맨 아래에 회색 블록이 추가되어 게임
                  난이도가 상승합니다.
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
                <p
                  className="tetris-modal-remaining"
                  style={{
                    color: '#555',
                    fontSize: '0.9rem',
                    marginTop: '6px',
                  }}
                >
                  오늘 남은 서버 점수 기록: {saveAttemptsLeft}회
                </p>
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
                    onClick={handleSaveName}
                    disabled={isSaving || !!saveLimitMessage}
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
