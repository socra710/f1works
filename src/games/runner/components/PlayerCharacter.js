import React, { useState, useEffect } from 'react';
import styles from '../Runner.module.css';

const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;

// 스프라이트 애니메이션 설정 (주석 처리)
/*
const SPRITE_CONFIG = {
  frameWidth: 256,
  frameHeight: 256,
  totalFrames: 4,
  frameDelay: 100, // 밀리초
};
*/

const PlayerCharacter = ({
  selectedCharacter,
  playerY,
  bobOffset,
  ghosts,
  scaleFactor = 1,
  gameState,
  isOnGround,
  runImage,
  jumpCount,
}) => {
  const playerSize = PLAYER_SIZE * scaleFactor;
  const isImage = selectedCharacter.image;
  const [rotation, setRotation] = useState(0);
  const prevJumpCountRef = React.useRef(0);

  // 더블 점프 시 회전
  useEffect(() => {
    // jumpCount가 1에서 2로 변할 때만 회전 시작
    if (jumpCount === 2 && prevJumpCountRef.current !== 2) {
      prevJumpCountRef.current = 2;
      let startTime = Date.now();
      let animationId;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 600, 1); // 0.6초 애니메이션
        const angle = progress * 360;
        setRotation(angle);

        if (progress < 1) {
          animationId = requestAnimationFrame(animate);
        } else {
          setRotation(0);
        }
      };

      animationId = requestAnimationFrame(animate);
      return () => {
        if (animationId) cancelAnimationFrame(animationId);
      };
    }

    // 땅에 닿으면 리셋
    if (jumpCount === 0) {
      prevJumpCountRef.current = 0;
      setRotation(0);
    }
  }, [jumpCount]);

  // 회전 스타일
  const getRotationStyle = () => {
    return {
      transform: rotation > 0 ? `rotateZ(${rotation}deg)` : 'rotateZ(0deg)',
      transformOrigin: 'center center',
      transition: 'none',
    };
  };

  // 스프라이트 프레임 관리 (주석 처리)
  // const [frame, setFrame] = useState(0);
  // const [frameTime, setFrameTime] = useState(0);

  // 게임 중일 때 달리는 이미지 사용, 아니면 일반 이미지 사용
  // const displayImage =
  //   gameState === 'playing' && isOnGround && runImage
  //     ? runImage
  //     : selectedCharacter.image;

  const displayImage = selectedCharacter.image;

  // 프레임 애니메이션 업데이트 (주석 처리)
  // useEffect(() => {
  //   if (gameState !== 'playing' || !isOnGround || !runImage) {
  //     setFrame(0);
  //     setFrameTime(0);
  //     return;
  //   }
  //
  //   const interval = setInterval(() => {
  //     setFrameTime((prev) => {
  //       const newTime = prev + 16; // 약 60fps 가정
  //       if (newTime > SPRITE_CONFIG.frameDelay) {
  //         setFrame((prevFrame) => (prevFrame + 1) % SPRITE_CONFIG.totalFrames);
  //         return 0;
  //       }
  //       return newTime;
  //     });
  //   }, 16);
  //
  //   return () => clearInterval(interval);
  // }, [gameState, isOnGround, runImage]);

  return (
    <>
      {/* 잔상 */}
      {ghosts.map((g, idx) =>
        isImage ? (
          <img
            key={`ghost-${idx}`}
            src={selectedCharacter.image}
            alt={selectedCharacter.name}
            className="ghost"
            style={{
              position: 'absolute',
              left: `${85 - idx * 6}px`,
              bottom: `${g.bottom}px`,
              width: `${playerSize}px`,
              height: `${playerSize}px`,
              opacity: `${Math.max(0.15, 0.35 - idx * 0.05)}`,
              objectFit: 'cover',
              display: 'block',
              ...getRotationStyle(),
            }}
          />
        ) : (
          <div
            key={`ghost-${idx}`}
            className="ghost"
            style={{
              left: `${85 - idx * 6}px`,
              bottom: `${g.bottom}px`,
              fontSize: `${playerSize}px`,
              opacity: `${Math.max(0.15, 0.35 - idx * 0.05)}`,
              ...getRotationStyle(),
            }}
          >
            {selectedCharacter.emoji}
          </div>
        )
      )}

      {/* 플레이어 */}
      {isImage ? (
        <img
          src={displayImage}
          alt={selectedCharacter.name}
          className="player"
          style={{
            position: 'absolute',
            left: '85px',
            bottom: `${GROUND_HEIGHT + playerY + bobOffset}px`,
            width: `${playerSize}px`,
            height: `${playerSize}px`,
            objectFit: 'cover',
            display: 'block',
            ...getRotationStyle(),
          }}
        />
      ) : (
        <div
          className="player"
          style={{
            bottom: `${GROUND_HEIGHT + playerY + bobOffset}px`,
            fontSize: `${playerSize}px`,
            ...getRotationStyle(),
          }}
        >
          {selectedCharacter.emoji}
        </div>
      )}
    </>
  );
};

export default PlayerCharacter;
