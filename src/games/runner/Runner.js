import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet-async';
import './Runner.css';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -20;
const BASE_GAME_SPEED = 5;
const SPEED_INCREASE_PER_LEVEL = 0.25;
const OBSTACLE_WIDTH = 30;
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;
// 러닝 바운스 효과 상수
const BOBBING_AMPLITUDE = 3; // 2~3px 권장
const BOBBING_FREQUENCY = 5; // 빠르게 흔들림(Hz 유사)
// 시즌 배경
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// 장애물 종류
const OBSTACLE_TYPES = [
  { id: 'rock', emoji: '💣', height: 50, width: 30 },
  { id: 'cactus', emoji: '🌵', height: 80, width: 35 },
  { id: 'tree', emoji: '🌲', height: 90, width: 35 },
  { id: 'fire', emoji: '🔥', height: 55, width: 30 },
  { id: 'cone', emoji: '🚧', height: 45, width: 30 },
  { id: 'barrel', emoji: '🛢️', height: 60, width: 30 },
  { id: 'bush', emoji: '🌿', height: 50, width: 30 },
];

// 랜덤 시즌 선택 헬퍼 (현재 인덱스와 다른 값 반환)
const randomDifferentIndex = (current) => {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * SEASONS.length);
  } while (newIndex === current);
  return newIndex;
};

// 캐릭터 목록
const CHARACTERS = [
  { id: 'cat', name: '🐱', emoji: '🐱' },
  { id: 'dog', name: '🐶', emoji: '🐶' },
  { id: 'rabbit', name: '🐰', emoji: '🐰' },
  { id: 'devil', name: '👿', emoji: '👿' },
  { id: 'ghost', name: '👻', emoji: '👻' },
  { id: 'alien', name: '👽', emoji: '👽' },
  { id: 'robot', name: '🤖', emoji: '🤖' },
  { id: 'panda', name: '🐼', emoji: '🐼' },
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
  const [isJumping, setIsJumping] = useState(false);
  const [jumpCount, setJumpCount] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(BASE_GAME_SPEED);
  const [seasonIndex, setSeasonIndex] = useState(0);

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

  // 시즌별 요소 생성 (재렌더링 시에도 고정)
  const seasonElements = useMemo(
    () => ({
      spring: Array.from({ length: 20 }).map((_, i) => ({
        id: `petal-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${6 + Math.random() * 4}s`,
      })),
      springClouds: Array.from({ length: 3 }).map((_, i) => ({
        id: `cloud-spring-${i}`,
        left: `${i * 35 + Math.random() * 10}%`,
        delay: `${i * 6}s`,
      })),
      // 봄: 별
      springStars: Array.from({ length: 8 }).map((_, i) => ({
        id: `star-spring-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 30}%`,
        delay: `${Math.random() * 3}s`,
      })),
      summer: Array.from({ length: 30 }).map((_, i) => ({
        id: `rain-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
      })),
      summerClouds: Array.from({ length: 2 }).map((_, i) => ({
        id: `cloud-summer-${i}`,
        left: `${i * 50 + Math.random() * 15}%`,
        delay: `${i * 8}s`,
      })),
      // 여름: 별 (야간용)
      summerStars: Array.from({ length: 10 }).map((_, i) => ({
        id: `star-summer-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 30}%`,
        delay: `${Math.random() * 3}s`,
      })),
      // 여름: 햇빛 광선
      summerRays: Array.from({ length: 5 }).map((_, i) => ({
        id: `ray-${i}`,
        angle: `${200 + i * 12}deg`,
        delay: `${i * 0.5}s`,
      })),
      // 여름: 가끔 무지개 (20% 확률)
      summerRainbow: Math.random() < 0.2 ? [{ id: 'rainbow-1' }] : [],
      autumn: Array.from({ length: 15 }).map((_, i) => ({
        id: `leaf-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${5 + Math.random() * 5}s`,
      })),
      autumnClouds: Array.from({ length: 4 }).map((_, i) => ({
        id: `cloud-autumn-${i}`,
        left: `${i * 25 + Math.random() * 8}%`,
        delay: `${i * 5}s`,
      })),
      // 가을: 별 (야간용)
      autumnStars: Array.from({ length: 12 }).map((_, i) => ({
        id: `star-autumn-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 28}%`,
        delay: `${Math.random() * 3.5}s`,
      })),
      // 가을: 바람 효과 강화 (추가 잎들)
      autumnWindLeaves: Array.from({ length: 10 }).map((_, i) => ({
        id: `wind-leaf-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${3 + Math.random() * 3}s`,
      })),
      winter: Array.from({ length: 20 }).map((_, i) => ({
        id: `snow-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${8 + Math.random() * 6}s`,
      })),
      winterClouds: Array.from({ length: 5 }).map((_, i) => ({
        id: `cloud-winter-${i}`,
        left: `${i * 20 + Math.random() * 5}%`,
        delay: `${i * 4}s`,
      })),
      // 겨울: 별
      winterStars: Array.from({ length: 10 }).map((_, i) => ({
        id: `star-winter-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 35}%`,
        delay: `${Math.random() * 4}s`,
      })),
      // 겨울: 번개
      winterLightning: Array.from({ length: 2 }).map((_, i) => ({
        id: `lightning-${i}`,
        delay: `${3 + i * 4}s`,
      })),
      // 겨울/가을: 안개
      autumnFog: Array.from({ length: 1 }).map((_, i) => ({
        id: `fog-autumn-${i}`,
      })),
      winterFog: Array.from({ length: 1 }).map((_, i) => ({
        id: `fog-winter-${i}`,
      })),
      // 모든 계절: 배경 새들
      springBirds: Array.from({ length: 2 }).map((_, i) => ({
        id: `bg-bird-spring-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${10 + Math.random() * 20}%`,
        delay: `${i * 8}s`,
        duration: `${12 + Math.random() * 4}s`,
      })),
      summerBirds: Array.from({ length: 3 }).map((_, i) => ({
        id: `bg-bird-summer-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${8 + Math.random() * 22}%`,
        delay: `${i * 6}s`,
        duration: `${10 + Math.random() * 4}s`,
      })),
      autumnBirds: Array.from({ length: 2 }).map((_, i) => ({
        id: `bg-bird-autumn-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${12 + Math.random() * 18}%`,
        delay: `${i * 10}s`,
        duration: `${14 + Math.random() * 4}s`,
      })),
      winterBirds: Array.from({ length: 1 }).map((_, i) => ({
        id: `bg-bird-winter-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${15 + Math.random() * 20}%`,
        delay: `${i * 12}s`,
        duration: `${16 + Math.random() * 4}s`,
      })),
    }),
    []
  );

  // 여름 날씨 분기: 비/맑음 및 무지개 노출 여부
  const summerWeather = useMemo(() => {
    const isSummer = SEASONS[seasonIndex] === 'summer';
    if (!isSummer) return { rainy: false, sunny: false, showRainbow: false };
    const rainy = Math.random() < 0.8; // 80% 확률로 비
    const showRainbow = rainy && Math.random() < 0.25; // 비가 올 때 25% 확률로 무지개
    return { rainy, sunny: !rainy, showRainbow };
  }, [seasonIndex, gameState]);

  // 밤/낮 분기: 시즌 변경 시 확률적으로 밤 결정
  const isNight = useMemo(() => {
    // 35% 확률로 밤
    return Math.random() < 0.35;
  }, [seasonIndex]);

  // 로컬 스토리지에서 최고 점수 불러오기
  useEffect(() => {
    const savedHighScore = localStorage.getItem('runnerHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // 캐릭터 선택
  const selectCharacter = (character) => {
    setSelectedCharacter(character);
    if (gameState === 'menu') {
      startGame();
    }
  };

  // 게임 시작
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setPlayerY(0);
    playerVelocityRef.current = 0;
    setObstacles([]);
    setBirds([]);
    setGhosts([]);
    setParticles([]);
    setIsJumping(false);
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
      setIsJumping(true);
      setJumpCount((prev) => prev + 1);
    }
  }, [gameState, jumpCount]);

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
        // 100점마다 속도 증가
        if (newScore % 100 === 0) {
          setGameSpeed((prevSpeed) => prevSpeed + SPEED_INCREASE_PER_LEVEL);
        }
        // 300점마다 시즌 변경
        if (newScore % 300 === 0) {
          setSeasonIndex((prevIdx) => randomDifferentIndex(prevIdx));
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

      // 다음 장애물 생성까지 랜덤 간격 (1초 ~ 2초)
      const nextInterval = 1000 + Math.random() * 1000;
      obstacleIntervalRef.current = setTimeout(spawnObstacle, nextInterval);
    };

    // 첫 장애물 생성
    obstacleIntervalRef.current = setTimeout(spawnObstacle, 1500);

    // 날아다니는 새 생성 (랜덤 간격)
    const spawnBird = () => {
      const newBird = {
        id: Date.now(),
        x: 800,
        y: 80 + Math.random() * 150, // 80~230px 높이에서 랜덤
        emoji: '🦅',
        size: 40,
      };
      setBirds((prev) => [...prev, newBird]);

      // 다음 새 생성까지 랜덤 간격 (2.5초 ~ 4초)
      const nextInterval = 2500 + Math.random() * 1500;
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

      // 플레이어 위치 업데이트
      setPlayerY((prevY) => {
        // 중력 적용 (아래로 떨어지도록)
        playerVelocityRef.current -= GRAVITY;
        const newY = prevY + playerVelocityRef.current;

        // 바닥에 닿았을 때
        if (newY <= 0) {
          playerVelocityRef.current = 0;
          setIsJumping(false);
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

        if (shouldSpawn) {
          particleCooldownRef.current = spawnInterval;
          const baseX = 100 + 20; // 캐릭터 약간 뒤
          const baseY = GROUND_HEIGHT + 8; // 발 근처
          const size = 4 + Math.random() * 3;
          const newParticle = {
            id: Date.now() + Math.random(),
            x: baseX,
            y: baseY,
            vx: 150 + 50 * Math.random() * Math.max(1, gameSpeed), // 좌측으로 빠르게
            vy: -20 - 20 * Math.random(), // 약간 위로 튐
            size,
            life: 0.5 + Math.random() * 0.3,
            opacity: 0.6,
          };
          updated.push(newParticle);
        }
        return updated;
      });

      // 장애물 이동 및 충돌 감지
      setObstacles((prevObstacles) => {
        const newObstacles = prevObstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - gameSpeed,
          }))
          .filter((obstacle) => obstacle.x > -obstacle.width);

        return newObstacles;
      });

      // 새 이동
      setBirds((prevBirds) => {
        const newBirds = prevBirds
          .map((bird) => ({
            ...bird,
            x: bird.x - gameSpeed * 1.2, // 새는 조금 더 빠르게
          }))
          .filter((bird) => bird.x > -bird.size);

        return newBirds;
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
    };

    checkCollision();
  }, [obstacles, birds, playerY, gameState, score, highScore]);

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

      <div className="runner-game">
        <div className="runner-header">
          <h1>🏃 러너 게임</h1>
          <div className="runner-scores">
            <div className="score">점수: {score}</div>
            <div className="speed">속도: {gameSpeed.toFixed(1)}x</div>
            <div className="high-score">최고점수: {highScore}</div>
          </div>
        </div>

        {gameState === 'menu' && (
          <div className="runner-menu">
            <h2>캐릭터를 선택하세요</h2>
            <div className="character-selection">
              {CHARACTERS.map((character) => (
                <button
                  key={character.id}
                  className={`character-btn ${
                    selectedCharacter.id === character.id ? 'selected' : ''
                  }`}
                  onClick={() => selectCharacter(character)}
                >
                  <span className="character-emoji">{character.emoji}</span>
                  <span className="character-name">{character.name}</span>
                </button>
              ))}
            </div>
            <button className="start-btn" onClick={startGame}>
              게임 시작
            </button>
            <div className="instructions">
              <p>💡 스페이스바, 클릭 또는 터치로 점프!</p>
              <p>⭐ 공중에서 한 번 더 점프 가능! (더블 점프)</p>
              <p>장애물을 피하며 최대한 오래 달리세요!</p>
              <p>🦅 날아다니는 새도 조심하세요!</p>
              <p>🚀 100점마다 속도가 빨라집니다!</p>
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className="game-container">
            <div
              className={`game-canvas season-${SEASONS[seasonIndex]} ${
                isNight ? 'night' : 'day'
              } ${
                SEASONS[seasonIndex] === 'summer' && !isNight
                  ? summerWeather.rainy
                    ? 'rainy'
                    : 'sunny'
                  : ''
              }`}
              onClick={() => gameState === 'playing' && jump()}
              onTouchStart={() => gameState === 'playing' && jump()}
            >
              {/* 시즌 오버레이 */}
              {SEASONS[seasonIndex] === 'spring' && (
                <div className="season-layer spring">
                  {seasonElements.spring.map((item) => (
                    <span
                      key={item.id}
                      className="petal"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                      }}
                    >
                      🌸
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'summer' && summerWeather.rainy && (
                <div className="season-layer summer">
                  {seasonElements.summer.map((item) => (
                    <span
                      key={item.id}
                      className="raindrop"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                      }}
                    />
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'autumn' && (
                <div className="season-layer autumn">
                  {seasonElements.autumn.map((item) => (
                    <span
                      key={item.id}
                      className="leaf"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                      }}
                    >
                      🍁
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'winter' && (
                <div className="season-layer winter">
                  {seasonElements.winter.map((item) => (
                    <span
                      key={item.id}
                      className="snowflake"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                      }}
                    >
                      ❄️
                    </span>
                  ))}
                </div>
              )}

              {/* 계절별 구름 렌더링 */}
              {SEASONS[seasonIndex] === 'spring' && !isNight && (
                <div className="clouds-layer spring">
                  {seasonElements.springClouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        animationDelay: cloud.delay,
                      }}
                    >
                      ☁️
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'summer' && !isNight && (
                <div className="clouds-layer summer">
                  {seasonElements.summerClouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        animationDelay: cloud.delay,
                      }}
                    >
                      ☁️
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'autumn' && !isNight && (
                <div className="clouds-layer autumn">
                  {seasonElements.autumnClouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        animationDelay: cloud.delay,
                      }}
                    >
                      ☁️
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'winter' && !isNight && (
                <div className="clouds-layer winter">
                  {seasonElements.winterClouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        animationDelay: cloud.delay,
                      }}
                    >
                      ☁️
                    </span>
                  ))}
                </div>
              )}

              {/* 1. 봄: 별 (야간만) */}
              {SEASONS[seasonIndex] === 'spring' && isNight && (
                <div className="effects-layer">
                  {seasonElements.springStars.map((star) => (
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

              {/* 2. 여름: 햇빛 광선 (주간만) */}
              {SEASONS[seasonIndex] === 'summer' &&
                !isNight &&
                summerWeather.sunny && (
                  <div className="effects-layer">
                    {seasonElements.summerRays.map((ray) => (
                      <div
                        key={ray.id}
                        className="sun-ray"
                        style={{
                          '--ray-angle': ray.angle,
                          animationDelay: ray.delay,
                        }}
                      />
                    ))}
                  </div>
                )}

              {/* 3. 여름: 무지개 (가끔, 주간 비) */}
              {SEASONS[seasonIndex] === 'summer' &&
                !isNight &&
                summerWeather.rainy &&
                seasonElements.summerRainbow.length > 0 && (
                  <div className="effects-layer">
                    <div className="rainbow" />
                  </div>
                )}

              {/* 여름: 별 (야간) */}
              {SEASONS[seasonIndex] === 'summer' && isNight && (
                <div className="effects-layer">
                  {seasonElements.summerStars.map((star) => (
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

              {/* 4. 가을: 바람 효과 강화 (주간만) */}
              {SEASONS[seasonIndex] === 'autumn' && !isNight && (
                <div className="effects-layer">
                  {seasonElements.autumnWindLeaves.map((leaf) => (
                    <span
                      key={leaf.id}
                      className="wind-leaf"
                      style={{
                        left: leaf.left,
                        animationDelay: leaf.delay,
                        animationDuration: leaf.duration,
                      }}
                    >
                      🍃
                    </span>
                  ))}
                </div>
              )}

              {/* 가을: 별 (야간) */}
              {SEASONS[seasonIndex] === 'autumn' && isNight && (
                <div className="effects-layer">
                  {seasonElements.autumnStars.map((star) => (
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

              {/* 5. 겨울: 번개 */}
              {SEASONS[seasonIndex] === 'winter' && (
                <div className="effects-layer">
                  {seasonElements.winterLightning.map((lightning) => (
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

              {/* 6. 겨울/가을: 안개 */}
              {SEASONS[seasonIndex] === 'autumn' && (
                <div className="fog-layer" />
              )}
              {SEASONS[seasonIndex] === 'winter' && (
                <div className="fog-layer winter-fog" />
              )}

              {/* 7. 배경 새들 */}
              {SEASONS[seasonIndex] === 'spring' && (
                <div className="background-birds">
                  {seasonElements.springBirds.map((bird) => (
                    <span
                      key={bird.id}
                      className="bg-bird"
                      style={{
                        left: bird.left,
                        top: bird.top,
                        animationDelay: bird.delay,
                        animationDuration: bird.duration,
                      }}
                    >
                      🐦
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'summer' && (
                <div className="background-birds">
                  {seasonElements.summerBirds.map((bird) => (
                    <span
                      key={bird.id}
                      className="bg-bird"
                      style={{
                        left: bird.left,
                        top: bird.top,
                        animationDelay: bird.delay,
                        animationDuration: bird.duration,
                      }}
                    >
                      🦅
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'autumn' && (
                <div className="background-birds">
                  {seasonElements.autumnBirds.map((bird) => (
                    <span
                      key={bird.id}
                      className="bg-bird"
                      style={{
                        left: bird.left,
                        top: bird.top,
                        animationDelay: bird.delay,
                        animationDuration: bird.duration,
                      }}
                    >
                      🦆
                    </span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'winter' && (
                <div className="background-birds">
                  {seasonElements.winterBirds.map((bird) => (
                    <span
                      key={bird.id}
                      className="bg-bird"
                      style={{
                        left: bird.left,
                        top: bird.top,
                        animationDelay: bird.delay,
                        animationDuration: bird.duration,
                      }}
                    >
                      🕊️
                    </span>
                  ))}
                </div>
              )}

              {/* 플레이어 */}
              {/* 잔상 */}
              {ghosts.map((g, idx) => (
                <div
                  key={`ghost-${idx}`}
                  className="ghost"
                  style={{
                    left: `${100 - idx * 6}px`,
                    bottom: `${g.bottom}px`,
                    fontSize: `${PLAYER_SIZE}px`,
                    opacity: `${Math.max(0.1, 0.35 - idx * 0.05)}`,
                  }}
                >
                  {selectedCharacter.emoji}
                </div>
              ))}
              <div
                className="player"
                style={{
                  bottom: `${
                    GROUND_HEIGHT +
                    playerY +
                    (gameState === 'playing' && isOnGroundRef.current
                      ? bobOffsetRef.current
                      : 0)
                  }px`,
                  fontSize: `${PLAYER_SIZE}px`,
                }}
              >
                {selectedCharacter.emoji}
              </div>

              {/* 장애물 */}
              {obstacles.map((obstacle) => (
                <div
                  key={obstacle.id}
                  className="obstacle"
                  style={{
                    left: `${obstacle.x}px`,
                    bottom: `${GROUND_HEIGHT}px`,
                    fontSize: `${obstacle.height}px`,
                  }}
                >
                  {obstacle.type.emoji}
                </div>
              ))}

              {/* 날아다니는 새 */}
              {birds.map((bird) => (
                <div
                  key={bird.id}
                  className="bird"
                  style={{
                    left: `${bird.x}px`,
                    bottom: `${bird.y}px`,
                    fontSize: `${bird.size}px`,
                  }}
                >
                  {bird.emoji}
                </div>
              ))}

              {/* 바닥 */}
              <div className="ground">
                <div
                  className="ground-pattern"
                  style={{
                    animationDuration: `${Math.max(
                      0.6,
                      2 / Math.max(1, gameSpeed)
                    )}s`,
                  }}
                />
              </div>

              {/* 먼지 파티클 */}
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="particle"
                  style={{
                    left: `${p.x}px`,
                    bottom: `${p.y}px`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    opacity: p.opacity,
                  }}
                />
              ))}
            </div>

            {gameState === 'gameOver' && (
              <div className="game-over-overlay">
                <div className="game-over-modal">
                  <h2>게임 오버!</h2>
                  <p className="final-score">점수: {score}</p>
                  {score === highScore && score > 0 && (
                    <p className="new-record">🎉 새로운 최고 기록!</p>
                  )}
                  <button
                    className="restart-btn"
                    onClick={() => setGameState('menu')}
                  >
                    다시 시작
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Runner;
