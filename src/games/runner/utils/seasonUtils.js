// 시즌별 배경 이펙트 조합 로직 - 극단적의 날씨 포함
export const getSeasonEffects = (seasonIndex, SEASONS) => {
  const season = SEASONS[seasonIndex];
  const isNight = Math.random() < 0.5; // 50% 확률로 밤
  const hasExtra = Math.random() < 0.5; // 50% 확률로 추가 이펙트
  const hasRain = Math.random() < 0.25; // 25% 확률로 비 (계절 상관없이)
  const dramaticWeather = Math.random() < 0.15; // 15% 확률로 드라마틱한 날씨 조합

  const effects = {
    season,
    isNight,
    base: null, // 기본 이펙트 (태양/달/구름 등)
    extra: null, // 추가 이펙트 (꽃잎/비/눈 등)
    special: null, // 특수 이펙트 (번개/눈비/우박 - 저확률)
    intensity: 'normal', // normal, heavy, extreme
  };

  // 드라마틱한 날씨: 밤 + 극강 이펙트
  if (dramaticWeather && isNight) {
    effects.intensity = 'extreme';
    if (season === 'spring' || season === 'summer') {
      // 폭우 + 번개
      effects.base = 'moon';
      effects.extra = 'rain';
      effects.special = 'lightning';
    } else if (season === 'winter') {
      // 폭설 + 번개 (우박)
      effects.base = 'moon';
      effects.extra = 'snow';
      effects.special = 'sleet';
    } else {
      // 가을: 강풍 + 낙엽
      effects.base = 'leaves';
      effects.extra = 'leaves';
      effects.intensity = 'heavy';
    }
  } else if (season === 'spring') {
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
      if (Math.random() < 0.08) {
        // 8% 확률로 번개 (극강 번개폭풍)
        effects.special = 'lightning';
        effects.extra = 'rain';
        effects.intensity = Math.random() < 0.5 ? 'heavy' : 'normal';
      } else {
        effects.extra = hasExtra
          ? Math.random() < 0.6
            ? 'stars'
            : 'rain'
          : null;
      }
    } else {
      effects.base = 'sun';
      if (hasExtra && Math.random() < 0.35) {
        effects.extra = 'rain'; // 35% 확률로 비
        effects.intensity = Math.random() < 0.3 ? 'heavy' : 'normal';
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
      if (Math.random() < 0.1) {
        // 10% 확률로 눈비 (극강 폭설)
        effects.special = 'sleet';
        effects.extra = 'snow';
        effects.intensity = 'heavy';
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

  // 모든 시즌에서 랜덤으로 극강 비 추가 (낮/밤 상관없이)
  if (hasRain && !effects.special && !dramaticWeather) {
    effects.extra = 'rain';
    // 비가 올 때 18% 확률로 번개 추가
    if (Math.random() < 0.18) {
      effects.special = 'lightning';
      effects.intensity = Math.random() < 0.4 ? 'heavy' : 'normal';
    }
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
