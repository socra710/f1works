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

const GRAVITY = 0.6;
const JUMP_STRENGTH = -20;
const BASE_GAME_SPEED = 5;
const SPEED_INCREASE_PER_LEVEL = 0.5;
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;
const BOBBING_AMPLITUDE = 3;
const BOBBING_FREQUENCY = 4;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const OBSTACLE_TYPES = [
  { id: 'rock', emoji: '💣', height: 50, width: 30 },
  { id: 'cactus', emoji: '🌵', height: 80, width: 35 },
  { id: 'tree', emoji: '🌲', height: 90, width: 35 },
  { id: 'fire', emoji: '🔥', height: 55, width: 30 },
  { id: 'cone', emoji: '🚧', height: 45, width: 35 },
  { id: 'barrel', emoji: '🛢️', height: 60, width: 30 },
  { id: 'bush', emoji: '🌿', height: 50, width: 30 },
];

const CHARACTERS = [
  { id: 'dog', name: '🐶', emoji: '🐶' },
  { id: 'cat', name: '🐱', emoji: '🐱' },
];

const Runner = () => {
  const [gameState, setGameState] = useState('menu');
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [birds, setBirds] = useState([]);
  const [ghosts, setGhosts] = useState([]);
  const [particles, setParticles] = useState([]);
  const [motionBlurs, setMotionBlurs] = useState([]);
  const [jumpDusts, setJumpDusts] = useState([]);
  const [coins, setCoins] = useState([]);
  const [jumpCount, setJumpCount] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(BASE_GAME_SPEED);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [coinCount, setCoinCount] = useState(0);

  // userId 생성
  const [userId] = useState(() => {
    let id = localStorage.getItem('runnerUserId');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('runnerUserId', id);
    }
    return id;
  });

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

  const gameLoopRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const obstacleIntervalRef = useRef(null);
  const birdIntervalRef = useRef(null);
  const playerVelocityRef = useRef(0);
  const playerYRef = useRef(0);
  const bobTimeRef = useRef(0);
  const bobOffsetRef = useRef(0);
  const lastTsRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : 0
  );
  const isOnGroundRef = useRef(true);
  const particleCooldownRef = useRef(0);

  const commonElements = useCommonElements();

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

  const selectCharacter = (character) => {
    setSelectedCharacter(character);
    if (gameState === 'menu') {
      startGame();
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
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

  const jump = useCallback(() => {
    if (gameState === 'playing' && jumpCount < 2) {
      playerVelocityRef.current = Math.abs(JUMP_STRENGTH);
      setJumpCount((prev) => prev + 1);
      playJumpSound();

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

  // 탭 비활성화 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'playing') {
        setGameState('gameOver');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameState]);

  // 키보드 이벤트
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

  // 게임 루프 (기존 코드와 동일하므로 생략 - 실제로는 전체 게임 루프 코드 필요)
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

    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => {
        const newScore = prev + 1;
        if (newScore % 50 === 0) {
          setGameSpeed((prevSpeed) => prevSpeed + SPEED_INCREASE_PER_LEVEL);
        }
        if (newScore % 200 === 0) {
          setSeasonIndex((prevIdx) =>
            randomDifferentIndex(prevIdx, SEASONS.length)
          );
        }
        return newScore;
      });
    }, 100);

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

      const shouldSpawnCoins = Math.random() < 0.2;
      if (shouldSpawnCoins) {
        const coinsToSpawn = [];
        const baseHeight = newObstacle.height;
        const count = Math.random() < 0.5 ? 1 : 2;

        const singleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 10 + Math.random() * 60,
          y: baseHeight + (60 + Math.random() * 30),
          size: 26,
          type: 'single',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: '💰',
        };
        const doubleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 60 + Math.random() * 80,
          y: baseHeight + (140 + Math.random() * 40),
          size: 26,
          type: 'double',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: '💰',
        };

        if (count === 1) {
          coinsToSpawn.push(Math.random() < 0.5 ? singleCoin : doubleCoin);
        } else {
          coinsToSpawn.push(singleCoin, doubleCoin);
        }

        setCoins((prev) => [...prev, ...coinsToSpawn]);
      }

      const speedRatio = gameSpeed / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85);
      const baseInterval = 800 + Math.random() * 800;
      const nextInterval = baseInterval * adjustedRatio;
      obstacleIntervalRef.current = setTimeout(spawnObstacle, nextInterval);
    };

    obstacleIntervalRef.current = setTimeout(spawnObstacle, 1200);

    const spawnBird = () => {
      const newBird = {
        id: Date.now(),
        x: 800,
        y: 80 + Math.random() * 150,
        emoji: seasonEffects.isNight ? '🦉' : '🦅',
        size: 40,
        speed: 1.0 + Math.random() * 0.6,
      };
      setBirds((prev) => [...prev, newBird]);

      const speedRatio = gameSpeed / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85);
      const baseInterval = 2500 + Math.random() * 1500;
      const nextInterval = baseInterval * adjustedRatio;
      birdIntervalRef.current = setTimeout(spawnBird, nextInterval);
    };

    birdIntervalRef.current = setTimeout(spawnBird, 4000);

    const gameLoop = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const dt =
        now && lastTsRef.current ? (now - lastTsRef.current) / 1000 : 1 / 60;
      lastTsRef.current = now || lastTsRef.current;

      setPlayerY((prevY) => {
        playerVelocityRef.current -= GRAVITY * dt * 60;
        const newY = prevY + playerVelocityRef.current * dt * 60;

        if (newY <= 0) {
          playerVelocityRef.current = 0;

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

          setJumpCount(0);
          isOnGroundRef.current = true;
          playerYRef.current = 0;
          return 0;
        }
        isOnGroundRef.current = false;
        playerYRef.current = newY;
        return newY;
      });

      if (gameState === 'playing' && isOnGroundRef.current) {
        bobTimeRef.current += dt;
        const effectiveFrequency = BOBBING_FREQUENCY * Math.max(1, gameSpeed);
        bobOffsetRef.current =
          Math.sin(bobTimeRef.current * effectiveFrequency) * BOBBING_AMPLITUDE;
      } else {
        bobOffsetRef.current = 0;
      }

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
        return updated;
      });

      setMotionBlurs((prev) =>
        prev.filter((blur) => (blur.delay -= dt) > -0.4)
      );

      setJumpDusts((prev) => {
        return prev
          .map((dust) => ({
            ...dust,
            age: (dust.age || 0) + dt,
          }))
          .filter((dust) => dust.age < 0.6);
      });

      setObstacles((prevObstacles) => {
        const newObstacles = prevObstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - gameSpeed * dt * 60,
          }))
          .filter((obstacle) => obstacle.x > -obstacle.width);

        return newObstacles;
      });

      setBirds((prevBirds) => {
        const newBirds = prevBirds
          .map((bird) => ({
            ...bird,
            x: bird.x - gameSpeed * (bird.speed || 1.2) * dt * 60,
          }))
          .filter((bird) => bird.x > -bird.size);

        return newBirds;
      });

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
  }, [gameState, gameSpeed, seasonEffects.isNight]);

  // 충돌 감지
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
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          return;
        }
      }

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
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          return;
        }
      }

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
          <div className={styles['runner-menu']}>
            <h2 className={styles.subtitle}>캐릭터를 선택하세요</h2>
            <div className={styles['character-selection']}>
              {CHARACTERS.map((character) => (
                <button
                  key={character.id}
                  className={`${styles['character-btn']} ${
                    selectedCharacter.id === character.id ? styles.selected : ''
                  }`}
                  onClick={() => selectCharacter(character)}
                >
                  <span className={styles['character-emoji']}>
                    {character.emoji}
                  </span>
                  <span className={styles['character-name']}>
                    {character.name}
                  </span>
                </button>
              ))}
            </div>
            <button className={styles['start-btn']} onClick={startGame}>
              게임 시작
            </button>
            <div className={styles.instructions}>
              <p>💡 스페이스바, 클릭 또는 터치로 점프!</p>
              <p>⭐ 공중에서 한 번 더 점프 가능! (더블 점프)</p>
              <p>장애물을 피하며 최대한 오래 달리세요!</p>
              <p>🦅 날아다니는 새도 조심하세요!</p>
              <p>🚀 50점마다 속도가 빨라집니다!</p>
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className={extraStyles['runner-content']}>
            <div className={styles['game-container']}>
              <div
                className={`${styles['game-canvas']} season-${
                  seasonEffects.season
                } ${seasonEffects.isNight ? 'night' : 'day'}`}
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

                {/* 특수 이펙트 렌더링 */}
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

                <GameObstacles
                  obstacles={obstacles}
                  birds={birds}
                  coins={coins}
                />

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

                <ParticleEffects particles={particles} />

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

              {gameState === 'gameOver' && (
                <div className={styles['game-over-overlay']}>
                  <div className={styles['game-over-modal']}>
                    <h2 className={styles.subtitle}>게임 오버!</h2>
                    <p className={styles['final-score']}>점수: {score}</p>
                    {score === highScore && score > 0 && (
                      <p className={styles['new-record']}>
                        🎉 새로운 최고 기록!
                      </p>
                    )}
                    <button
                      className={styles['restart-btn']}
                      onClick={() => setGameState('menu')}
                    >
                      다시 시작
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ScoreBoard
              highScores={highScores}
              isLoadingScores={isLoadingScores}
            />
          </div>
        )}

        <GameModal
          showModal={showNameModal && gameState === 'gameOver'}
          score={score}
          coins={coinCount}
          playerName={playerName}
          setPlayerName={setPlayerName}
          saveAttemptsLeft={saveAttemptsLeft}
          saveLimitMessage={saveLimitMessage}
          isSaving={isSaving}
          onSave={() => handleSaveName(playerName, score, coinCount, userId)}
          onCancel={handleCancelModal}
        />
      </div>
    </>
  );
};

export default Runner;
