import React from 'react';

const GROUND_HEIGHT = 50;

const GameObstacles = ({ obstacles, birds, coins = [] }) => {
  return (
    <>
      {/* 지상 장애물 */}
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className="obstacle"
          style={{
            left: `${obstacle.x}px`,
            bottom: `${GROUND_HEIGHT}px`,
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
            bottom: `${bird.y}px`,
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
            bottom: `${GROUND_HEIGHT + coin.y}px`,
            fontSize: `${coin.size}px`,
            zIndex: 8,
          }}
        >
          {coin.emoji || '💰'}
        </div>
      ))}
    </>
  );
};

export default GameObstacles;
