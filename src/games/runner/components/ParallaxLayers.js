import React from 'react';

// 간단한 패럴랙스 언덕/능선 레이어
// far 레이어는 느리게, near 레이어는 빠르게 이동
const ParallaxLayers = ({ farX = 0, nearX = 0, isNight = false, season = 'spring' }) => {
  // 시즌별 톤 매핑
  const toneMap = {
    spring: { far: 'rgba(40,120,60,0.22)', near: 'rgba(30,100,50,0.34)' },
    summer: { far: 'rgba(30,90,50,0.24)', near: 'rgba(20,70,40,0.36)' },
    autumn: { far: 'rgba(120,70,30,0.22)', near: 'rgba(110,60,25,0.34)' },
    winter: { far: 'rgba(80,100,120,0.22)', near: 'rgba(70,90,110,0.34)' },
  };
  const baseTone = toneMap[season] || toneMap.spring;
  const ridgeColorFar = isNight ? 'rgba(0,0,0,0.35)' : baseTone.far;
  const ridgeColorNear = isNight ? 'rgba(0,0,0,0.55)' : baseTone.near;

  // 베이스 언덕 데이터 (좌표는 반복 이동을 고려해 여유 폭으로 배치)
  const farHills = [
    { w: 320, h: 120, left: 0, bottom: 140 },
    { w: 420, h: 140, left: 360, bottom: 130 },
    { w: 380, h: 130, left: 780, bottom: 145 },
    { w: 340, h: 115, left: 1140, bottom: 135 },
    { w: 420, h: 150, left: 1480, bottom: 140 },
  ];
  // 겨울엔 능선을 조금 높게
  const nearBase = season === 'winter' ? 105 : 90;
  const nearHills = [
    { w: 420, h: season === 'winter' ? 200 : 180, left: 0, bottom: nearBase },
    { w: 520, h: season === 'winter' ? 220 : 200, left: 480, bottom: nearBase - 5 },
    { w: 460, h: season === 'winter' ? 210 : 190, left: 1040, bottom: nearBase + 5 },
    { w: 500, h: season === 'winter' ? 230 : 210, left: 1540, bottom: nearBase - 2 },
  ];

  const cycleWidth = 2000; // 반복 주기
  const wrap = (x) => {
    // 음수 이동을 고려한 모듈러
    let v = x % cycleWidth;
    if (v < -cycleWidth) v += cycleWidth;
    return v;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* 원경 능선 (far) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '70%',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {farHills.concat(
          // 간단한 복제로 갭 방지
          farHills.map((h) => ({ ...h, left: h.left + cycleWidth }))
        ).map((h, idx) => (
          <div
            key={`far-${idx}`}
            style={{
              position: 'absolute',
              left: h.left + wrap(farX),
              bottom: h.bottom,
              width: h.w,
              height: h.h,
              background: ridgeColorFar,
              borderRadius: '50% 50% 45% 45%',
              boxShadow: isNight
                ? '0 6px 12px rgba(0,0,0,0.25)'
                : '0 4px 8px rgba(0,0,0,0.12)',
            }}
          />
        ))}
      </div>

      {/* 근경 능선 (near) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '65%',
          overflow: 'hidden',
          zIndex: 3,
        }}
      >
        {nearHills.concat(
          nearHills.map((h) => ({ ...h, left: h.left + cycleWidth }))
        ).map((h, idx) => (
          <div
            key={`near-${idx}`}
            style={{
              position: 'absolute',
              left: h.left + wrap(nearX),
              bottom: h.bottom,
              width: h.w,
              height: h.h,
              background: ridgeColorNear,
              borderRadius: '50% 50% 40% 40%',
              boxShadow: isNight
                ? '0 8px 14px rgba(0,0,0,0.3)'
                : '0 6px 10px rgba(0,0,0,0.16)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ParallaxLayers;