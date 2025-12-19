import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet-async';
import styles from './Runner.module.css';
import extraStyles from './RunnerExtras.module.css';

// 컴포넌트
// import BackgroundEffects from './components/BackgroundEffects';
import PlayerCharacter from './components/PlayerCharacter';
import GameObstacles from './components/GameObstacles';
import ParticleEffects from './components/ParticleEffects';
import ScoreBoard from './components/ScoreBoard';
import GameModal from './components/GameModal';

// 훅
import { useCommonElements } from './hooks/useCommonElements';
import { useScoreManagement } from './hooks/useScoreManagement';

// 유틸리티
import { playJumpSound } from './utils/audioUtils';
import { getSeasonEffects, randomDifferentIndex } from './utils/seasonUtils';

// 캐릭터 이미지
// import f1EmojiImage from './image/f1soft.png';
import f1RunImage from './image/f1-run.png';
const GRAVITY = 0.6;
const BASE_JUMP_STRENGTH = -20;
const JUMP_STRENGTH =
  process.env.NODE_ENV === 'production'
    ? BASE_JUMP_STRENGTH / 2
    : BASE_JUMP_STRENGTH;
const BASE_GAME_SPEED = 5; // 원래 값
const SPEED_INCREASE_PER_LEVEL = 0.5;
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;
const BOBBING_AMPLITUDE = 3;
const BOBBING_FREQUENCY = 4;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const MAX_PARTICLES = 30;
// const MAX_GHOSTS = 4;
const MAX_MOTION_BLURS = 8;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

// 장애물 종류
const OBSTACLE_TYPES = [
  { id: 'rock', emoji: '💣', height: 50, width: 30 },
  { id: 'cactus', emoji: '🌵', height: 80, width: 35 },
  { id: 'tree', emoji: '🌲', height: 90, width: 35 },
  { id: 'fire', emoji: '🔥', height: 55, width: 30 },
  { id: 'cone', emoji: '🚧', height: 45, width: 35 },
  { id: 'barrel', emoji: '🛢️', height: 60, width: 30 },
  { id: 'bush', emoji: '🌿', height: 50, width: 30 },
];

// 캐릭터 목록
const CHARACTERS = [
  // { id: 'f1', name: 'F1', emoji: 'f1-emoji', image: f1EmojiImage },
  { id: 'dog', name: '🐶', emoji: '🐶' },
  { id: 'cat', name: '🐱', emoji: '🐱' },

  // { id: 'lion', name: '🦁', emoji: '🦁' },
  // { id: 'rabbit', name: '🐰', emoji: '🐰' },
  // { id: 'devil', name: '👿', emoji: '👿' },
  // { id: 'ghost', name: '👻', emoji: '👻' },
  // { id: 'alien', name: '👽', emoji: '👽' },
  // { id: 'robot', name: '🤖', emoji: '🤖' },
  // { id: 'panda', name: '🐼', emoji: '🐼' },
];

const Runner = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameOver
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [birds, setBirds] = useState([]);
  const [ghosts, setGhosts] = useState([]); // 러너 잔상
  const [particles, setParticles] = useState([]); // 먼지 파티클
  const [motionBlurs, setMotionBlurs] = useState([]); // 모션 블러 라인
  const [jumpDusts, setJumpDusts] = useState([]); // 점프 착지 이펙트
  const [coins, setCoins] = useState([]); // 코인 목록
  const [jumpCount, setJumpCount] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(BASE_GAME_SPEED);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0); // 현재 게임에서 획득한 코인
  const [hasLoadedServerCoins, setHasLoadedServerCoins] = useState(false);

  // userId 생성: 테트리스와 동일하게 sessionStorage 'extensionLogin'을 우선 사용
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (sessionUser) {
        const decoded = atob(sessionUser);
        setUserId(decoded);
        localStorage.setItem('runnerUserId', decoded);
        return;
      }

      let id = localStorage.getItem('runnerUserId');
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('runnerUserId', id);
      }
      setUserId(id);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const gameLoopRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const obstacleIntervalRef = useRef(null);
  const birdIntervalRef = useRef(null);
  const playerVelocityRef = useRef(0);
  const playerYRef = useRef(0);
  // 러닝 바운스 계산용
  const bobTimeRef = useRef(0);
  const bobOffsetRef = useRef(0);
  const lastTsRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : 0
  );
  // 지면 여부 (state 지연 없이 즉시 판단용)
  const isOnGroundRef = useRef(true);
  // 파티클 스폰 간격 관리
  const particleCooldownRef = useRef(0);

  // 훅으로 공통 엘리먼트 가져오기
  const commonElements = useCommonElements();

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
    saveCoinsAuto,
  } = useScoreManagement();

  const syncCoinBank = useCallback(
    async (uid, totalCoins, highScoreValue, nameForServer = '') => {
      if (!uid || totalCoins == null || Number.isNaN(totalCoins)) return;
      try {
        await fetch(`${API_BASE_URL}/jvWorksSetRunnerCoins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: uid,
            coins: Math.max(0, Math.floor(totalCoins)),
            highScore: Math.max(0, Math.floor(highScoreValue || 0)),
            name: (nameForServer || '').slice(0, 20),
          }),
        });
      } catch (error) {
        console.error('코인 동기화 실패:', error);
      }
    },
    []
  );

  const fetchServerCoins = useCallback(
    async (uid) => {
      if (!uid || hasLoadedServerCoins) return;

      const localCoinsRaw = localStorage.getItem('runnerCoins');
      const localCoins = localCoinsRaw ? parseInt(localCoinsRaw, 10) : 0;
      const localName = localStorage.getItem('runnerPlayerName') || '';

      try {
        const res = await fetch(
          `${API_BASE_URL}/jvWorksGetRunnerCoins?userId=${encodeURIComponent(
            uid
          )}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (res.ok) {
          const json = await res.json();
          if (json && (json.success === true || json.success === 'true')) {
            const exists = json.exists === true || json.exists === 'true';
            const serverCoins = Number(json.coins);
            const serverHighScore = Number(json.highScore);
            const serverName = json.name || '';

            if (exists) {
              const resolved = Number.isFinite(serverCoins) ? serverCoins : 0;
              setCoinCount(resolved);
              localStorage.setItem('runnerCoins', resolved.toString());

              // 서버 최고점수 세팅
              const resolvedHighScore = Number.isFinite(serverHighScore)
                ? serverHighScore
                : 0;
              setHighScore(resolvedHighScore);
              localStorage.setItem(
                'runnerHighScore',
                resolvedHighScore.toString()
              );

              // 서버에서 닉네임도 가져와서 세팅
              if (serverName && serverName.trim()) {
                setPlayerName(serverName.trim());
                localStorage.setItem('runnerPlayerName', serverName.trim());
              }
            } else {
              const resolved = Number.isFinite(localCoins) ? localCoins : 0;
              setCoinCount(resolved);
              localStorage.setItem('runnerCoins', resolved.toString());

              // 로컬 닉네임 사용
              if (localName && localName.trim()) {
                setPlayerName(localName.trim());
              }

              if (resolved > 0) {
                const nameForServer =
                  (localName && localName.trim()) || 'Runner';
                const localHighScoreRaw =
                  localStorage.getItem('runnerHighScore');
                const localHighScore = localHighScoreRaw
                  ? parseInt(localHighScoreRaw, 10)
                  : 0;
                await syncCoinBank(
                  uid,
                  resolved,
                  localHighScore,
                  nameForServer
                );
              }
            }

            setHasLoadedServerCoins(true);
            return;
          }
        }
      } catch (error) {
        console.error('서버 코인 조회 실패:', error);
      }

      setHasLoadedServerCoins(true);
      if (Number.isFinite(localCoins)) {
        setCoinCount(localCoins);
      }
      if (localName && localName.trim()) {
        setPlayerName(localName.trim());
      }
    },
    [hasLoadedServerCoins, setPlayerName, syncCoinBank]
  );

  useEffect(() => {
    if (!userId) return;
    fetchServerCoins(userId);
  }, [userId, fetchServerCoins]);

  // 시즌별 배경 이펙트 조합 (낮/밤 + 최대 2개 이펙트)
  const seasonEffects = useMemo(() => {
    return getSeasonEffects(seasonIndex, SEASONS);
  }, [seasonIndex]);

  // 로컬 스토리지에서 최고 점수 불러오기
  useEffect(() => {
    const savedHighScore = localStorage.getItem('runnerHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }

    const savedCoins = localStorage.getItem('runnerCoins');
    if (savedCoins) {
      setCoinCount(parseInt(savedCoins, 10));
    }
  }, []);

  // 게임 종료 시 모달 표시
  useEffect(() => {
    if (gameState === 'gameOver' && score > 0) {
      setShowNameModal(true);
    }
  }, [gameState, score, setShowNameModal]);

  // 게임 종료 시 코인 잔고 동기화
  useEffect(() => {
    if (gameState !== 'gameOver') return;
    if (!userId) return;
    const nameForServer = (playerName && playerName.trim()) || 'Auto';
    syncCoinBank(userId, coinCount, highScore, nameForServer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, userId, coinCount, highScore, syncCoinBank]);

  // 캐릭터 선택
  const selectCharacter = (character) => {
    setSelectedCharacter(character);
  };

  // 게임 시작
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setSessionCoins(0); // 게임 시작 시 현재 게임 코인 초기화
    setPlayerY(0);
    playerVelocityRef.current = 0;
    setObstacles([]);
    setBirds([]);
    setGhosts([]);
    setParticles([]);
    setMotionBlurs([]);
    setJumpDusts([]);
    setCoins([]);
    setJumpCount(0);
    setGameSpeed(BASE_GAME_SPEED);
    setSeasonIndex(Math.floor(Math.random() * SEASONS.length));
    isOnGroundRef.current = true;
    lastTsRef.current =
      typeof performance !== 'undefined' ? performance.now() : 0;
  };

  // 점프 (더블 점프 가능)
  const jump = useCallback(() => {
    if (gameState === 'playing' && jumpCount < 2) {
      playerVelocityRef.current = Math.abs(JUMP_STRENGTH); // 위로 점프
      setJumpCount((prev) => prev + 1);
      playJumpSound(); // 점프 효과음 재생

      // 점프 시 모션 블러 생성
      const blurCount = 3 + Math.floor(Math.random() * 2);
      const newBlurs = [];
      for (let i = 0; i < blurCount; i++) {
        newBlurs.push({
          id: Date.now() + Math.random(),
          left: 100 + (Math.random() - 0.5) * 20,
          top:
            GROUND_HEIGHT +
            playerYRef.current +
            25 +
            (Math.random() - 0.5) * 10,
          delay: i * 0.05,
        });
      }
      setMotionBlurs((prev) => [...prev, ...newBlurs]);

      // 점프 시작 시 발 부분에 먼지 생성 (착지 이펙트)
      if (jumpCount === 0) {
        const dustCount = 4 + Math.floor(Math.random() * 3);
        const newDusts = [];
        for (let i = 0; i < dustCount; i++) {
          const angle = (i / dustCount) * Math.PI * 2 - Math.PI / 2;
          const power = 60 + Math.random() * 40;
          newDusts.push({
            id: Date.now() + Math.random(),
            left: 100 - 5,
            top: GROUND_HEIGHT,
            burstX: Math.cos(angle) * power,
            burstY: Math.sin(angle) * power,
            size: 5 + Math.random() * 4,
            delay: 0,
          });
        }
        setJumpDusts((prev) => [...prev, ...newDusts]);
      }
    }
  }, [gameState, jumpCount]);

  // 탭 비활성화 감지 - 게임 일시정지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'playing') {
        // 탭이 비활성화되면 게임을 게임오버 상태로 전환
        setGameState('gameOver');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState]);

  // 키보드 이벤트만 사용 (전역 클릭/터치는 금지)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
          jump();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, jump]);

  // 게임 루프
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
      if (obstacleIntervalRef.current) {
        clearTimeout(obstacleIntervalRef.current);
      }
      if (birdIntervalRef.current) {
        clearTimeout(birdIntervalRef.current);
      }
      return;
    }

    // 점수 증가
    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => {
        const newScore = prev + 1;
        // 50점마다 속도 증가
        if (newScore % 50 === 0) {
          setGameSpeed((prevSpeed) => prevSpeed + SPEED_INCREASE_PER_LEVEL);
        }
        // 100점마다 시즌 변경 (중복 방지)
        if (newScore % 200 === 0) {
          setSeasonIndex((prevIdx) =>
            randomDifferentIndex(prevIdx, SEASONS.length)
          );
        }
        return newScore;
      });
    }, 100);

    // 장애물 생성 (랜덤 간격)
    const spawnObstacle = () => {
      const randomType =
        OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const newObstacle = {
        id: Date.now(),
        x: 800,
        type: randomType,
        height: randomType.height,
        width: randomType.width,
      };
      setObstacles((prev) => [...prev, newObstacle]);

      // 장애물 위 코인 스폰 (랜덤): 10% 확률로 1개 또는 2개 생성
      const shouldSpawnCoins = Math.random() < 0.1;
      if (shouldSpawnCoins) {
        const coinsToSpawn = [];
        const baseHeight = newObstacle.height; // 지면 기준 높이
        const count = Math.random() < 0.5 ? 1 : 2; // 1개 또는 2개 랜덤

        // 코인 위치 프리셋
        const singleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 10 + Math.random() * 60,
          y: baseHeight + (60 + Math.random() * 30), // 싱글 점프 높이
          size: 26,
          type: 'single',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: '💰',
        };
        const doubleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 60 + Math.random() * 80,
          y: baseHeight + (140 + Math.random() * 40), // 더블 점프 높이
          size: 26,
          type: 'double',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: '💰',
        };

        if (count === 1) {
          // 하나만 생성: 싱글/더블 중 랜덤
          coinsToSpawn.push(Math.random() < 0.5 ? singleCoin : doubleCoin);
        } else {
          // 두 개 모두 생성
          coinsToSpawn.push(singleCoin, doubleCoin);
        }

        setCoins((prev) => [...prev, ...coinsToSpawn]);
      }

      // 속도에 비례하여 간격 조정 (난이도 밸런스 유지)
      // 속도가 빨라지면 간격도 짧아지되, 약간의 난이도 증가
      const speedRatio = gameSpeed / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85); // 속도 2배 → 간격 1.8배
      const baseInterval = 800 + Math.random() * 800; // 0.8초 ~ 1.6초
      const nextInterval = baseInterval * adjustedRatio;
      obstacleIntervalRef.current = setTimeout(spawnObstacle, nextInterval);
    };

    // 첫 장애물 생성
    obstacleIntervalRef.current = setTimeout(spawnObstacle, 1200);

    // 날아다니는 새 생성 (랜덤 간격)
    const spawnBird = () => {
      const newBird = {
        id: Date.now(),
        x: 800,
        y: 80 + Math.random() * 150, // 80~230px 높이에서 랜덤
        emoji: seasonEffects.isNight ? '🦉' : '🦅', // 밤 시즌에는 부엉이, 낮 시즌에는 독수리
        size: 40,
        speed: 1.0 + Math.random() * 0.6, // 1.0 ~ 1.6 랜덤 스피드
      };
      setBirds((prev) => [...prev, newBird]);

      // 속도에 비례하여 새 생성 간격도 조정
      const speedRatio = gameSpeed / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85);
      const baseInterval = 2500 + Math.random() * 1500; // 2.5초 ~ 4초
      const nextInterval = baseInterval * adjustedRatio;
      birdIntervalRef.current = setTimeout(spawnBird, nextInterval);
    };

    // 첫 새 생성
    birdIntervalRef.current = setTimeout(spawnBird, 4000);

    // 물리 엔진 및 충돌 감지
    const gameLoop = () => {
      // 시간 경과 계산 (초)
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const dt =
        now && lastTsRef.current ? (now - lastTsRef.current) / 1000 : 1 / 60;
      lastTsRef.current = now || lastTsRef.current;

      // 플레이어 위치 업데이트 (dt 기반 물리)
      setPlayerY((prevY) => {
        // 중력 적용 (아래로 떨어지도록)
        playerVelocityRef.current -= GRAVITY * dt * 60;
        const newY = prevY + playerVelocityRef.current * dt * 60;

        // 바닥에 닿았을 때
        if (newY <= 0) {
          playerVelocityRef.current = 0;

          // 착지 시 먼지 이펙트 생성
          if (!isOnGroundRef.current && prevY > 10) {
            const dustCount = 5 + Math.floor(Math.random() * 3);
            const newDusts = [];
            for (let i = 0; i < dustCount; i++) {
              const angle = (i / dustCount) * Math.PI * 2 - Math.PI / 2;
              const power = 50 + Math.random() * 50;
              newDusts.push({
                id: Date.now() + Math.random(),
                left: 100 - 5,
                top: GROUND_HEIGHT,
                burstX: Math.cos(angle) * power,
                burstY: Math.sin(angle) * power,
                size: 4 + Math.random() * 5,
                delay: 0,
              });
            }
            setJumpDusts((prev) => [...prev, ...newDusts]);
          }

          setJumpCount(0); // 바닥에 닿으면 점프 카운트 리셋
          isOnGroundRef.current = true;
          playerYRef.current = 0;
          return 0;
        }
        isOnGroundRef.current = false;
        playerYRef.current = newY;
        return newY;
      });

      // 러닝 바운스 오프셋 계산: 바닥에서 달릴 때만 적용
      if (gameState === 'playing' && isOnGroundRef.current) {
        // 시간 진행은 고정 dt 누적, 바운스 주파수만 속도에 비례
        bobTimeRef.current += dt;
        const effectiveFrequency = BOBBING_FREQUENCY * Math.max(1, gameSpeed);
        bobOffsetRef.current =
          Math.sin(bobTimeRef.current * effectiveFrequency) * BOBBING_AMPLITUDE;
      } else {
        bobOffsetRef.current = 0;
      }

      // 러너 잔상 업데이트: 최근 위치 6개 유지
      if (gameState === 'playing') {
        const playerBottomNow =
          GROUND_HEIGHT +
          playerYRef.current +
          (isOnGroundRef.current ? bobOffsetRef.current : 0);
        setGhosts((prev) => {
          const next = [{ bottom: playerBottomNow, leftOffset: 0 }].concat(
            prev
          );
          return next.slice(0, 6);
        });
      } else {
        setGhosts([]);
      }

      // 먼지 파티클 스폰 및 이동 업데이트
      particleCooldownRef.current = Math.max(
        0,
        particleCooldownRef.current - dt
      );
      const spawnInterval = Math.max(0.03, 0.08 / Math.max(1, gameSpeed));
      const shouldSpawn =
        gameState === 'playing' &&
        isOnGroundRef.current &&
        particleCooldownRef.current <= 0;
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x - p.vx * dt,
            y: p.y + p.vy * dt,
            life: p.life - dt,
            opacity: Math.max(0, p.opacity - dt * 2),
          }))
          .filter((p) => p.life > 0 && p.x > -p.size);

        if (shouldSpawn && updated.length < MAX_PARTICLES) {
          particleCooldownRef.current = spawnInterval;
          const baseX = 100 + 20;
          const baseY = GROUND_HEIGHT + 8;
          const size = 6 + Math.random() * 4;
          const newParticle = {
            id: Date.now() + Math.random(),
            x: baseX,
            y: baseY,
            vx: 150 + 50 * Math.random() * Math.max(1, gameSpeed),
            vy: -20 - 20 * Math.random(),
            size,
            life: 0.5 + Math.random() * 0.3,
            opacity: 0.8,
          };
          updated.push(newParticle);
        }
        return updated.slice(-MAX_PARTICLES);
      });

      // 모션 블러 업데이트 및 필터링
      setMotionBlurs((prev) =>
        prev
          .filter((blur) => (blur.delay -= dt) > -0.4)
          .slice(0, MAX_MOTION_BLURS)
      );

      // 점프 먼지 이펙트 업데이트 및 필터링
      setJumpDusts((prev) => {
        return prev
          .map((dust) => ({
            ...dust,
            age: (dust.age || 0) + dt,
          }))
          .filter((dust) => dust.age < 0.6);
      });

      // 장애물 이동 및 충돌 감지
      setObstacles((prevObstacles) => {
        const newObstacles = prevObstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - gameSpeed * dt * 60,
          }))
          .filter((obstacle) => obstacle.x > -obstacle.width);

        return newObstacles;
      });

      // 새 이동
      setBirds((prevBirds) => {
        const newBirds = prevBirds
          .map((bird) => ({
            ...bird,
            x: bird.x - gameSpeed * (bird.speed || 1.2) * dt * 60, // 개별 랜덤 스피드 적용
          }))
          .filter((bird) => bird.x > -bird.size);

        return newBirds;
      });

      // 코인 이동 및 화면 밖 제거
      setCoins((prevCoins) => {
        const moved = prevCoins
          .map((coin) => ({
            ...coin,
            x: coin.x - gameSpeed * (coin.speed || 1.2) * dt * 60,
          }))
          .filter((coin) => coin.x > -coin.size);
        return moved;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
      if (obstacleIntervalRef.current) {
        clearTimeout(obstacleIntervalRef.current);
      }
      if (birdIntervalRef.current) {
        clearTimeout(birdIntervalRef.current);
      }
    };
  }, [gameState, gameSpeed]);

  // 충돌 감지 (별도 useEffect)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkCollision = () => {
      const playerLeft = 100;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerBottom = playerY;
      const playerTop = playerBottom + PLAYER_SIZE;

      for (let obstacle of obstacles) {
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleTop = obstacle.height;

        if (
          playerRight > obstacleLeft + 10 &&
          playerLeft < obstacleRight - 10 &&
          playerBottom < obstacleTop - 10
        ) {
          // 충돌 발생
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          return;
        }
      }

      // 새와 충돌 감지
      for (let bird of birds) {
        const birdLeft = bird.x;
        const birdRight = bird.x + bird.size;
        const birdBottom = bird.y;
        const birdTop = bird.y + bird.size;

        if (
          playerRight > birdLeft + 10 &&
          playerLeft < birdRight - 10 &&
          playerTop > birdBottom + 10 &&
          playerBottom < birdTop - 10
        ) {
          // 새와 충돌 발생
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          return;
        }
      }

      // 코인 획득 감지
      let collected = false;
      const remaining = [];
      for (let coin of coins) {
        const coinLeft = coin.x;
        const coinRight = coin.x + coin.size;
        const coinBottom = coin.y;
        const coinTop = coin.y + coin.size;

        const hit =
          playerRight > coinLeft + 6 &&
          playerLeft < coinRight - 6 &&
          playerTop > coinBottom + 6 &&
          playerBottom < coinTop - 6;

        if (hit) {
          collected = true;
        } else {
          remaining.push(coin);
        }
      }
      if (collected) {
        setCoins(remaining);
        setCoinCount((prev) => {
          const next = prev + 1;
          localStorage.setItem('runnerCoins', next.toString());
          return next;
        });
        setSessionCoins((prev) => prev + 1);
      }
    };

    checkCollision();
  }, [obstacles, birds, coins, playerY, gameState, score, highScore]);

  return (
    <>
      <Helmet>
        <title>러너 게임</title>
        <meta property="og:title" content="러너 게임" />
        <meta
          property="og:description"
          content="캐릭터를 선택하고 장애물을 점프로 피하는 러너 게임입니다."
        />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/games/runner"
        />
      </Helmet>

      <div className={styles['runner-game']}>
        <div className={styles['runner-header']}>
          <h1 className={styles.title}>🏃 러너 게임</h1>
          <div className={styles['runner-scores']}>
            <div className={styles.score}>점수: {score}</div>
            <div className={styles.speed}>속도: {gameSpeed.toFixed(1)}x</div>
            <div className={styles['high-score']}>최고점수: {highScore}</div>
            <div className={extraStyles.coins}>코인: {coinCount} 💰</div>
          </div>
        </div>

        {gameState === 'menu' && (
          <>
            <div className={styles['runner-menu']}>
              <h2 className={styles.subtitle}>캐릭터를 선택하세요</h2>
              <div className={styles['character-selection']}>
                {CHARACTERS.map((character) => (
                  <button
                    key={character.id}
                    className={`${styles['character-btn']} ${
                      selectedCharacter.id === character.id
                        ? styles.selected
                        : ''
                    }`}
                    onClick={() => selectCharacter(character)}
                  >
                    <span className={styles['character-emoji']}>
                      {character.image ? (
                        <img
                          src={character.image}
                          alt={character.name}
                          style={{
                            width: '4rem',
                            objectFit: 'cover',
                            boxSizing: 'border-box',
                            // marginTop: '-1.3rem',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: '3rem',
                            objectFit: 'cover',
                            boxSizing: 'border-box',
                          }}
                        >
                          {character.emoji}
                        </div>
                      )}
                    </span>
                    <span
                      className={styles['character-name']}
                      // style={character.image ? { marginTop: '-3rem' } : {}}
                    >
                      {character.name}
                    </span>
                  </button>
                ))}
              </div>
              <button className={styles['start-btn']} onClick={startGame}>
                게임 시작
              </button>
            </div>

            <div className={styles.instructions}>
              <h3
                style={{
                  margin: '0 0 15px 0',
                  fontSize: '1.3rem',
                  textAlign: 'center',
                  color: '#ffd700',
                }}
              >
                📖 게임 설명
              </h3>
              <p>
                💡 <strong>조작</strong>: 스페이스바 또는 터치/마우스 클릭으로
                점프
              </p>
            </div>
            <div className={styles.instructions} style={{ marginTop: '20px' }}>
              <ScoreBoard
                highScores={highScores}
                isLoadingScores={isLoadingScores}
              />
            </div>
          </>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className={styles['game-container']}>
            <div
              className={`${
                styles['game-canvas']
              } ${`season-${seasonEffects.season}`} ${
                seasonEffects.isNight ? 'night' : 'day'
              }`}
              onClick={() => gameState === 'playing' && jump()}
              onTouchStart={() => gameState === 'playing' && jump()}
            >
              {/* 기본 이펙트 렌더링 */}
              {seasonEffects.base === 'sun' && (
                <div className="sky-object sun">☀️</div>
              )}
              {seasonEffects.base === 'moon' && (
                <div className="sky-object moon">🌙</div>
              )}
              {seasonEffects.base === 'clouds' && (
                <div className="clouds-layer">
                  {commonElements.clouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        top: cloud.top,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                      }}
                    >
                      {cloud.emoji}
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.base === 'leaves' && (
                <div className="season-layer autumn">
                  {commonElements.leaves.map((item) => (
                    <span
                      key={item.id}
                      className="leaf"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--leaf-x': item.left,
                      }}
                    >
                      🍁
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.base === 'snow' && (
                <div className="season-layer winter">
                  {commonElements.snow.map((item) => (
                    <span
                      key={item.id}
                      className="snowflake"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--snow-x': item.left,
                      }}
                    >
                      ❄️
                    </span>
                  ))}
                </div>
              )}

              {/* 추가 이펙트 렌더링 */}
              {seasonEffects.extra === 'petals' && (
                <div className="season-layer spring">
                  {commonElements.petals.map((item) => (
                    <span
                      key={item.id}
                      className="petal"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--petal-x': item.left,
                      }}
                    >
                      🌸
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'stars' && (
                <div className="effects-layer">
                  {commonElements.stars.map((star) => (
                    <span
                      key={star.id}
                      className="star twinkle"
                      style={{
                        left: star.left,
                        top: star.top,
                        animationDelay: star.delay,
                      }}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'rain' && (
                <div className="season-layer summer">
                  {commonElements.rain.map((item) => (
                    <span
                      key={item.id}
                      className="raindrop"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        '--rain-x': item.left,
                      }}
                    />
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'clouds' && (
                <div className="clouds-layer">
                  {commonElements.clouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        top: cloud.top,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                      }}
                    >
                      {cloud.emoji}
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'leaves' && (
                <div className="season-layer autumn">
                  {commonElements.leaves.map((item) => (
                    <span
                      key={item.id}
                      className="leaf"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--leaf-x': item.left,
                      }}
                    >
                      🍁
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'snow' && (
                <div className="season-layer winter">
                  {commonElements.snow.map((item) => (
                    <span
                      key={item.id}
                      className="snowflake"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--snow-x': item.left,
                      }}
                    >
                      ❄️
                    </span>
                  ))}
                </div>
              )}

              {/* 특수 이펙트 렌더링 (단독 연출) */}
              {seasonEffects.special === 'lightning' && (
                <div className="effects-layer">
                  {commonElements.lightning.map((lightning) => (
                    <div
                      key={lightning.id}
                      className="lightning-flash"
                      style={{
                        animationDelay: lightning.delay,
                      }}
                    />
                  ))}
                </div>
              )}
              {seasonEffects.special === 'sleet' && (
                <div className="season-layer winter">
                  {commonElements.sleet.map((item) => (
                    <span
                      key={item.id}
                      className="sleet"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        '--sleet-x': item.left,
                      }}
                    >
                      🌨️
                    </span>
                  ))}
                </div>
              )}

              {/* 플레이어 */}
              <PlayerCharacter
                selectedCharacter={selectedCharacter}
                playerY={playerY}
                bobOffset={
                  gameState === 'playing' && isOnGroundRef.current
                    ? bobOffsetRef.current
                    : 0
                }
                gameState={gameState}
                isOnGround={isOnGroundRef.current}
                runImage={f1RunImage}
                ghosts={ghosts}
              />

              {/* 장애물, 새, 코인 */}
              <GameObstacles
                obstacles={obstacles}
                birds={birds}
                coins={coins}
              />

              {/* 바닥 */}
              <div className={styles.ground}>
                <div
                  className={styles['ground-pattern']}
                  style={{
                    animationDuration: `${Math.max(
                      0.6,
                      2 / Math.max(1, gameSpeed)
                    )}s`,
                  }}
                />
              </div>

              {/* 먼지 파티클 */}
              <ParticleEffects particles={particles} />

              {/* 모션 블러 (속도선) */}
              {motionBlurs.map((blur) => (
                <div
                  key={blur.id}
                  className="motion-blur"
                  style={{
                    left: `${blur.left}px`,
                    top: `${blur.top}px`,
                    animationDelay: `${blur.delay}s`,
                  }}
                />
              ))}

              {/* 점프 착지 먼지 */}
              {jumpDusts.map((dust) => {
                const progress = Math.min(1, (dust.age || 0) / 0.6);
                const scale = 1 - progress * 0.7;
                const opacity = Math.max(0, 1 - progress);
                const offsetX = dust.burstX * progress;
                const offsetY = dust.burstY * progress;
                return (
                  <div
                    key={dust.id}
                    className="jump-dust"
                    style={{
                      left: `${dust.left}px`,
                      top: `${dust.top}px`,
                      width: `${dust.size}px`,
                      height: `${dust.size}px`,
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                      opacity: opacity,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <GameModal
          showModal={showNameModal && gameState === 'gameOver'}
          score={score}
          coins={sessionCoins}
          playerName={playerName}
          setPlayerName={setPlayerName}
          saveAttemptsLeft={saveAttemptsLeft}
          saveLimitMessage={saveLimitMessage}
          isSaving={isSaving}
          onSave={() => {
            handleSaveName(playerName, score, sessionCoins, userId);
            setTimeout(() => setGameState('menu'), 500);
          }}
          onCancel={() => {
            handleCancelModal();
            setGameState('menu');
          }}
        />
      </div>
    </>
  );
};

export default Runner;
