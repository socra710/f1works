import { useMemo } from 'react';

// 공통 이펙트 요소 생성 (재사용)
export const useCommonElements = () => {
  return useMemo(
    () => ({
      petals: Array.from({ length: 20 }).map((_, i) => ({
        id: `petal-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${6 + Math.random() * 4}s`,
      })),
      clouds: Array.from({ length: 3 }).map((_, i) => {
        const cloudTypes = ['☁️', '☁️', '🌥️', '⛅'];
        return {
        id: `cloud-${i}`,
        left: `${100 + Math.random() * 10}%`,
        top: `${5 + Math.random() * 25}%`,
        delay: `${i * 2 + Math.random() * 2}s`, // 더 빠른 진입
        duration: `${16 + Math.random() * 8}s`,
        emoji: cloudTypes[Math.floor(Math.random() * cloudTypes.length)],
        };
      }),
      stars: Array.from({ length: 10 }).map((_, i) => ({
        id: `star-${i}`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 30}%`,
        delay: `${Math.random() * 3}s`,
      })),
      rain: Array.from({ length: 30 }).map((_, i) => ({
        id: `rain-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
      })),
      leaves: Array.from({ length: 15 }).map((_, i) => ({
        id: `leaf-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${5 + Math.random() * 5}s`,
      })),
      snow: Array.from({ length: 20 }).map((_, i) => ({
        id: `snow-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${8 + Math.random() * 6}s`,
      })),
      lightning: Array.from({ length: 2 }).map((_, i) => ({
        id: `lightning-${i}`,
        delay: `${3 + i * 4}s`,
      })),
      sleet: Array.from({ length: 25 }).map((_, i) => ({
        id: `sleet-${i}`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
      })),
    }),
    []
  );
};
