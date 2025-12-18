import React from 'react';

const ParticleEffects = ({ particles }) => {
  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="dust-particle"
          style={{
            left: `${p.x}px`,
            bottom: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
          }}
        />
      ))}
    </>
  );
};

export default ParticleEffects;
