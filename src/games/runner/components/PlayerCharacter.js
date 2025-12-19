import React from 'react';

const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;

const PlayerCharacter = ({
  selectedCharacter,
  playerY,
  bobOffset,
  ghosts,
  scaleFactor = 1,
}) => {
  const playerSize = PLAYER_SIZE * scaleFactor;

  return (
    <>
      {/* 잔상 */}
      {ghosts.map((g, idx) => (
        <div
          key={`ghost-${idx}`}
          className="ghost"
          style={{
            left: `${100 - idx * 6}px`,
            bottom: `${g.bottom}px`,
            fontSize: `${playerSize}px`,
            opacity: `${Math.max(0.1, 0.35 - idx * 0.05)}`,
          }}
        >
          {selectedCharacter.emoji}
        </div>
      ))}

      {/* 플레이어 */}
      <div
        className="player"
        style={{
          bottom: `${GROUND_HEIGHT + playerY + bobOffset}px`,
          fontSize: `${playerSize}px`,
        }}
      >
        {selectedCharacter.emoji}
      </div>
    </>
  );
};

export default PlayerCharacter;
