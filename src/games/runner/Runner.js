import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import './Runner.css';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -20;
const BASE_GAME_SPEED = 5;
const SPEED_INCREASE_PER_LEVEL = 0.5;
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
  { id: 'rock', emoji: '🪨', height: 50, width: 30 },
  { id: 'cactus', emoji: '🌵', height: 80, width: 35 },
  { id: 'tree', emoji: '🌲', height: 90, width: 35 },
  { id: 'fire', emoji: '🔥', height: 55, width: 30 },
  { id: 'cone', emoji: '🚧', height: 45, width: 30 },
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
  const lastTsRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  // 지면 여부 (state 지연 없이 즉시 판단용)
  const isOnGroundRef = useRef(true);
  // 파티클 스폰 간격 관리
  const particleCooldownRef = useRef(0);

  // 시즌별 요소 생성 (재렌더링 시에도 고정)
  const seasonElements = useMemo(() => ({
    spring: Array.from({ length: 12 }).map((_, i) => ({
      id: `spr-${i}`,
      left: `${i * 8}%`
    })),
    summer: Array.from({ length: 30 }).map((_, i) => ({
      id: `rain-${i}`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`
    })),
    autumn: Array.from({ length: 15 }).map((_, i) => ({
      id: `leaf-${i}`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`
    })),
    winter: Array.from({ length: 20 }).map((_, i) => ({
      id: `snow-${i}`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`
    }))
  }), []);

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
    lastTsRef.current = typeof performance !== 'undefined' ? performance.now() : 0;
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
        // 200점마다 시즌 변경
        if (newScore % 200 === 0) {
          setSeasonIndex((prevIdx) => randomDifferentIndex(prevIdx));
        }
        return newScore;
      });
    }, 100);

    // 장애물 생성 (랜덤 간격)
    const spawnObstacle = () => {
      const randomType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
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
      const dt = now && lastTsRef.current ? (now - lastTsRef.current) / 1000 : 1 / 60;
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
        bobOffsetRef.current = Math.sin(bobTimeRef.current * effectiveFrequency) * BOBBING_AMPLITUDE;
      } else {
        bobOffsetRef.current = 0;
      }

      // 러너 잔상 업데이트: 최근 위치 6개 유지
      if (gameState === 'playing') {
        const playerBottomNow = GROUND_HEIGHT + playerYRef.current + (isOnGroundRef.current ? bobOffsetRef.current : 0);
        setGhosts((prev) => {
          const next = [{ bottom: playerBottomNow, leftOffset: 0 }].concat(prev);
          return next.slice(0, 6);
        });
      } else {
        setGhosts([]);
      }

      // 먼지 파티클 스폰 및 이동 업데이트
      particleCooldownRef.current = Math.max(0, particleCooldownRef.current - dt);
      const spawnInterval = Math.max(0.03, 0.08 / Math.max(1, gameSpeed));
      const shouldSpawn = gameState === 'playing' && isOnGroundRef.current && particleCooldownRef.current <= 0;
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
            x: bird.x - (gameSpeed * 1.2), // 새는 조금 더 빠르게
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
        <meta property="og:url" content="https://codefeat.netlify.app/games/runner" />
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
              className={`game-canvas season-${SEASONS[seasonIndex]}`}
              onClick={() => gameState === 'playing' && jump()}
              onTouchStart={() => gameState === 'playing' && jump()}
            >
              {/* 시즌 오버레이 */}
              {SEASONS[seasonIndex] === 'spring' && (
                <div className="season-layer spring">
                  {seasonElements.spring.map((item) => (
                    <span key={item.id} className="sprout" style={{ left: item.left }}>🌱</span>
                  ))}
                </div>
              )}
              {SEASONS[seasonIndex] === 'summer' && (
                <div className="season-layer summer">
                  {seasonElements.summer.map((item) => (
                    <span 
                      key={item.id} 
                      className="raindrop" 
                      style={{ 
                        left: item.left,
                        animationDelay: item.delay
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
                        animationDelay: item.delay
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
                        animationDelay: item.delay
                      }}
                    >
                      ❄️
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
                  bottom: `${GROUND_HEIGHT + playerY + ((gameState === 'playing' && isOnGroundRef.current) ? bobOffsetRef.current : 0)}px`,
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
                  style={{ animationDuration: `${Math.max(0.6, 2 / Math.max(1, gameSpeed))}s` }}
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
                  <button className="restart-btn" onClick={() => setGameState('menu')}>
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
