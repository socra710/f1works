import { useEffect } from 'react';

/**
 * 카카오 광고를 렌더링하는 커스텀 훅
 * index.html에 이미 로드된 스크립트를 활용합니다.
 */
export const useKakaoAd = () => {
  useEffect(() => {
    // window.adfit이 준비될 때까지 대기 후 렌더링
    const renderAds = () => {
      if (window.adfit) {
        try {
          window.adfit.destroy();
        } catch (e) {
          // destroy 실패해도 무시
        }

        // 모든 광고 요소 렌더링
        const adElements = document.querySelectorAll('.kakao_ad_area');
        adElements.forEach((el) => {
          try {
            window.adfit.render(el);
          } catch (e) {
            console.log('광고 렌더링:', e.message);
          }
        });
      } else {
        // adfit이 준비되지 않았으면 다시 시도
        setTimeout(renderAds, 100);
      }
    };

    renderAds();
  }, []);
};
