import React from 'react';

const GROUND_HEIGHT = 50;

const GameObstacles = ({ obstacles, birds, coins = [], powerUps = [], terrainOffset = 0 }) => {
  return (
    <>
      {/* 지상 장애물 */}
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className="obstacle"
          style={{
            left: `${obstacle.x}px`,
            bottom: `${GROUND_HEIGHT + terrainOffset}px`,
            width: `${obstacle.width}px`,
            height: `${obstacle.height}px`,
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
            bottom: `${bird.y + terrainOffset}px`,
            fontSize: `${bird.size}px`,
          }}
        >
          {bird.emoji}
        </div>
      ))}

      {/* 코인 */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin"
          style={{
            position: 'absolute',
            left: `${coin.x}px`,
            bottom: `${GROUND_HEIGHT + coin.y + terrainOffset}px`,
            fontSize: `${coin.size}px`,
            zIndex: 8,
          }}
        >
          {coin.emoji || '💰'}
        </div>
      ))}

      {/* 파워업 아이템 */}
      {powerUps && powerUps.length > 0 && (
        <>
          {powerUps.map((powerUp) => (
            <div
              key={powerUp.id}
              className="powerup"
              style={{
                position: 'absolute',
                left: `${powerUp.x}px`,
                bottom: `${GROUND_HEIGHT + powerUp.y + terrainOffset}px`,
                fontSize: `${powerUp.size}px`,
                zIndex: 10,
                filter: 'drop-shadow(0 0 4px rgba(255,255,100,0.6))',
                animation: 'pulse-glow 0.6s ease-in-out infinite',
              }}
            >
              {powerUp.emoji}
            </div>
          ))}
        </>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            text-shadow: 0 0 2px rgba(255,255,100,0.4);
          }
          50% {
            text-shadow: 0 0 8px rgba(255,255,100,0.8);
          }
        }
      `}</style>
    </>
  );
};

export default GameObstacles;
