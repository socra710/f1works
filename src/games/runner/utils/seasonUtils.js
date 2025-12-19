// 시즌별 배경 이펙트 조합 로직
export const getSeasonEffects = (seasonIndex, SEASONS) => {
  const season = SEASONS[seasonIndex];
  const isNight = Math.random() < 0.5; // 50% 확률로 밤
  const hasExtra = Math.random() < 0.5; // 50% 확률로 추가 이펙트
  const hasRain = Math.random() < 0.25; // 25% 확률로 비 (계절 상관없이)

  const effects = {
    season,
    isNight,
    base: null, // 기본 이펙트 (태양/달/구름 등)
    extra: null, // 추가 이펙트 (꽃잎/비/눈 등)
    special: null, // 특수 이펙트 (번개/눈비 - 저확률)
  };

  if (season === 'spring') {
    if (isNight) {
      effects.base = 'moon';
      effects.extra = hasExtra
        ? Math.random() < 0.5
          ? 'stars'
          : 'petals'
        : null;
    } else {
      effects.base = Math.random() < 0.5 ? 'sun' : 'clouds';
      effects.extra = hasExtra ? 'petals' : null;
    }
  } else if (season === 'summer') {
    if (isNight) {
      effects.base = 'moon';
      if (Math.random() < 0.05) {
        // 5% 확률로 번개 단독
        effects.special = 'lightning';
        effects.extra = null;
      } else {
        effects.extra = hasExtra
          ? Math.random() < 0.6
            ? 'stars'
            : 'rain'
          : null;
      }
    } else {
      effects.base = 'sun';
      if (hasExtra && Math.random() < 0.3) {
        effects.extra = 'rain'; // 30% 확률로 비
      } else if (hasExtra) {
        effects.extra = 'clouds';
      }
    }
  } else if (season === 'autumn') {
    if (isNight) {
      effects.base = 'moon';
      effects.extra = hasExtra
        ? Math.random() < 0.5
          ? 'leaves'
          : 'stars'
        : null;
    } else {
      effects.base = 'leaves'; // 단풍은 기본
      effects.extra = hasExtra
        ? Math.random() < 0.5
          ? 'sun'
          : 'clouds'
        : null;
    }
  } else if (season === 'winter') {
    if (isNight) {
      effects.base = 'moon';
      if (Math.random() < 0.08) {
        // 8% 확률로 눈비
        effects.special = 'sleet';
        effects.extra = null;
      } else {
        effects.extra = hasExtra
          ? Math.random() < 0.6
            ? 'snow'
            : 'stars'
          : null;
      }
    } else {
      effects.base = 'snow';
      effects.extra = hasExtra
        ? Math.random() < 0.5
          ? 'sun'
          : 'clouds'
        : null;
    }
  }

  // 모든 시즌에서 랜덤으로 비 추가 (낮/밤 상관없이)
  if (hasRain && !effects.special) {
    effects.extra = 'rain';
  }

  return effects;
};

// 랜덤 시즌 선택 (현재 인덱스와 다른 값 반환)
export const randomDifferentIndex = (current, totalSeasons) => {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * totalSeasons);
  } while (newIndex === current);
  return newIndex;
};
