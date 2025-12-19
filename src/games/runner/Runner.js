import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet-async';
import './Runner.css';

// 컴포넌트
// import BackgroundEffects from './components/BackgroundEffects';
import PlayerCharacter from './components/PlayerCharacter';
import GameObstacles from './components/GameObstacles';
import ParticleEffects from './components/ParticleEffects';

// 훅
import { useCommonElements } from './hooks/useCommonElements';

// 유틸리티
import { playJumpSound } from './utils/audioUtils';
import { getSeasonEffects, randomDifferentIndex } from './utils/seasonUtils';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -20;
const BASE_GAME_SPEED = 5;
const SPEED_INCREASE_PER_LEVEL = 0.5;
// const OBSTACLE_WIDTH = 30;
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;
// 러닝 바운스 효과 상수
const BOBBING_AMPLITUDE = 3; // 2~3px 권장
const BOBBING_FREQUENCY = 4; // 빠르게 흔들림(Hz 유사)
// 시즌 배경
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

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
  const [coins, setCoins] = useState([]); // 코인 목록
  const [jumpCount, setJumpCount] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(BASE_GAME_SPEED);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [coinCount, setCoinCount] = useState(0);

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

      // 장애물 위 코인 스폰 (랜덤): 30% 확률로 1개 또는 2개 생성
      const shouldSpawnCoins = Math.random() < 0.3;
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

      <div className="runner-game">
        <div className="runner-header">
          <h1>🏃 러너 게임</h1>
          <div className="runner-scores">
            <div className="score">점수: {score}</div>
            <div className="speed">속도: {gameSpeed.toFixed(1)}x</div>
            <div className="high-score">최고점수: {highScore}</div>
            <div className="coins">코인: {coinCount} 💰</div>
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
              <p>🚀 50점마다 속도가 빨라집니다!</p>
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className="game-container">
            <div
              className={`game-canvas season-${seasonEffects.season} ${
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
                ghosts={ghosts}
              />

              {/* 장애물, 새, 코인 */}
              <GameObstacles
                obstacles={obstacles}
                birds={birds}
                coins={coins}
              />

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
              <ParticleEffects particles={particles} />
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
