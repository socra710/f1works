import React from 'react';

// 배경 이펙트 컴포넌트
const BackgroundEffects = ({ seasonEffects, commonElements, clouds }) => {
  return (
    <>
      {/* 기본 이펙트 렌더링 */}
      {seasonEffects.base === 'sun' && (
        <div className="sky-object sun">☀️</div>
      )}
      {seasonEffects.base === 'moon' && (
        <div className="sky-object moon">🌙</div>
      )}
      {seasonEffects.base === 'clouds' && (
        <div className="clouds-layer">
          {clouds.map((cloud) => (
            <span
              key={cloud.id}
              className="cloud"
              style={{
                left: cloud.left,
                top: cloud.top,
                animationDelay: cloud.delay,
                 animationDuration: cloud.duration,
              }}
            >
              {cloud.emoji}
            </span>
          ))}
        </div>
      )}
      {seasonEffects.base === 'leaves' && (
        <div className="season-layer autumn">
          {commonElements.leaves.map((item) => (
            <span
              key={item.id}
              className="leaf"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration,
                '--leaf-x': item.left,
              }}
            >
              🍁
            </span>
          ))}
        </div>
      )}
      {seasonEffects.base === 'snow' && (
        <div className="season-layer winter">
          {commonElements.snow.map((item) => (
            <span
              key={item.id}
              className="snowflake"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration,
                '--snow-x': item.left,
              }}
            >
              ❄️
            </span>
          ))}
        </div>
      )}

      {/* 추가 이펙트 렌더링 */}
      {seasonEffects.extra === 'petals' && (
        <div className="season-layer spring">
          {commonElements.petals.map((item) => (
            <span
              key={item.id}
              className="petal"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration,
                '--petal-x': item.left,
              }}
            >
              🌸
            </span>
          ))}
        </div>
      )}
      {seasonEffects.extra === 'stars' && (
        <div className="effects-layer">
          {commonElements.stars.map((star) => (
            <span
              key={star.id}
              className="star twinkle"
              style={{
                left: star.left,
                top: star.top,
                animationDelay: star.delay,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}
      {seasonEffects.extra === 'rain' && (
        <div className="season-layer summer">
          {commonElements.rain.map((item) => (
            <span
              key={item.id}
              className="raindrop"
              style={{
                left: item.left,
                animationDelay: item.delay,
                '--rain-x': item.left,
              }}
            />
          ))}
        </div>
      )}
      {seasonEffects.extra === 'clouds' && (
        <div className="clouds-layer">
          {clouds.map((cloud) => (
            <span
              key={cloud.id}
              className="cloud"
              style={{
                left: cloud.left,
                top: cloud.top,
                animationDelay: cloud.delay,
                 animationDuration: cloud.duration,
              }}
            >
              {cloud.emoji}
            </span>
          ))}
        </div>
      )}
      {seasonEffects.extra === 'leaves' && (
        <div className="season-layer autumn">
          {commonElements.leaves.map((item) => (
            <span
              key={item.id}
              className="leaf"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration,
                '--leaf-x': item.left,
              }}
            >
              🍁
            </span>
          ))}
        </div>
      )}
      {seasonEffects.extra === 'snow' && (
        <div className="season-layer winter">
          {commonElements.snow.map((item) => (
            <span
              key={item.id}
              className="snowflake"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration,
                '--snow-x': item.left,
              }}
            >
              ❄️
            </span>
          ))}
        </div>
      )}

      {/* 특수 이펙트 렌더링 (단독 연출) */}
      {seasonEffects.special === 'lightning' && (
        <div className="effects-layer">
          {commonElements.lightning.map((lightning) => (
            <div
              key={lightning.id}
              className="lightning-flash"
              style={{
                animationDelay: lightning.delay,
              }}
            />
          ))}
        </div>
      )}
      {seasonEffects.special === 'sleet' && (
        <div className="season-layer winter">
          {commonElements.sleet.map((item) => (
            <span
              key={item.id}
              className="sleet"
              style={{
                left: item.left,
                animationDelay: item.delay,
                '--sleet-x': item.left,
              }}
            >
              🌨️
            </span>
          ))}
        </div>
      )}
    </>
  );
};

export default BackgroundEffects;
