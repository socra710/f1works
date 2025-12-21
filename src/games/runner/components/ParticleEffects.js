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
            background: p.color || 'rgba(255, 220, 120, 0.9)',
            boxShadow: p.color ? `0 0 6px ${p.color}` : '0 0 6px rgba(255, 200, 80, 0.8)',
          }}
        />
      ))}
    </>
  );
};

export default ParticleEffects;
