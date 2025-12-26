/**
 * 공유 링크 생성 및 디코딩 유틸리티
 */

const SECRET_KEY = 'f1soft@611';

/**
 * 키를 사용하여 텍스트 인코딩
 * @param {string} text - 인코딩할 텍스트
 * @returns {string} 인코딩된 문자열
 */
export const encodeWithKey = (text) => {
  const base64 = btoa(text);
  const key = SECRET_KEY;
  let result = '';

  for (let i = 0; i < base64.length; i++) {
    const charCode = base64.charCodeAt(i);
    const keyCharCode = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode ^ keyCharCode);
  }

  return btoa(result);
};

/**
 * 키를 사용하여 텍스트 디코딩
 * @param {string} encoded - 디코딩할 문자열
 * @returns {string|null} 디코딩된 문자열 또는 null (실패시)
 */
export const decodeWithKey = (encoded) => {
  try {
    const decoded = atob(encoded);
    const key = SECRET_KEY;
    let result = '';

    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyCharCode = key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode ^ keyCharCode);
    }

    return atob(result);
  } catch (e) {
    return null;
  }
};

/**
 * 공유 링크 생성 및 클립보드 복사
 * @param {string} year - 연도
 * @param {Function} showToast - 토스트 표시 함수
 */
export const createShareLink = (year, showToast) => {
  const encodedYear = encodeWithKey(year);
  const link = `/works/expense-summary/${encodedYear}`;

  // 클립보드에 복사 (추가 정보 포함)
  const shareText = `📊 경비 청구 집계 (${year}년)\n\n${window.location.origin}${link}`;

  navigator.clipboard
    .writeText(shareText)
    .then(() => {
      showToast('링크가 클립보드에 복사되었습니다.', 'success');
    })
    .catch(() => {
      showToast('링크 복사에 실패했습니다.', 'error');
    });
};

/**
 * URL 파라미터에서 년도 파싱 및 검증
 * @param {string} encodedYear - 인코딩된 년도
 * @returns {Object} { year: string, isValid: boolean }
 */
export const parseYearFromUrl = (encodedYear) => {
  if (!encodedYear) {
    return {
      year: new Date().getFullYear().toString(),
      isValid: true,
    };
  }

  try {
    const decodedYear = decodeWithKey(encodedYear);
    if (!decodedYear) {
      return {
        year: new Date().getFullYear().toString(),
        isValid: false,
      };
    }

    // 디코딩된 값이 숫자이고 2020~2099 범위인지 확인
    const yearNum = parseInt(decodedYear, 10);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2099) {
      return {
        year: new Date().getFullYear().toString(),
        isValid: false,
      };
    }

    return {
      year: decodedYear,
      isValid: true,
    };
  } catch (e) {
    return {
      year: new Date().getFullYear().toString(),
      isValid: false,
    };
  }
};
