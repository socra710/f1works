/**
 * 경비 청구 API 서비스
 * 백엔드 API와의 통신을 담당하는 모듈
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

/**
 * 승인된 경비 데이터를 카테고리별로 집계 (연도별)
 * @param {string} factoryCode - 공장 코드
 * @param {string} year - 조회 년도 (YYYY)
 * @returns {Promise<Array>} 집계 데이터 리스트
 */
export const getExpenseAggregationByYear = async (
  factoryCode,
  year,
  userId
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksGetExpenseAggregation?factoryCode=${factoryCode}&year=${year}&type=year&userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`해당 사용자는 접근할 수 없는 페이지입니다.`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '경비 집계 조회에 실패했습니다.');
    }

    return data.data || [];
  } catch (error) {
    console.error('getExpenseAggregationByYear Error:', error);
    throw error;
  }
};

/**
 * 승인된 경비 데이터를 카테고리별로 집계 (월별)
 * @param {string} factoryCode - 공장 코드
 * @param {string} monthYm - 조회 년월 (YYYY-MM)
 * @returns {Promise<Array>} 집계 데이터 리스트
 */
export const getExpenseAggregationByMonth = async (
  factoryCode,
  monthYm,
  userId
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksGetExpenseAggregation?factoryCode=${factoryCode}&monthYm=${monthYm}&type=month&userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '월별 경비 집계 조회에 실패했습니다.');
    }

    return data.data || [];
  } catch (error) {
    console.error('getExpenseAggregationByMonth Error:', error);
    throw error;
  }
};

/**
 * 승인된 경비 데이터를 사용자별로 집계
 * @param {string} factoryCode - 공장 코드
 * @param {string} monthYm - 조회 년월 (YYYY-MM)
 * @returns {Promise<Array>} 사용자별 집계 데이터 리스트
 */
export const getExpenseAggregationByUser = async (
  factoryCode,
  monthYm,
  userId
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksGetExpenseAggregation?factoryCode=${factoryCode}&monthYm=${monthYm}&type=user&userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(
        data.message || '사용자별 경비 집계 조회에 실패했습니다.'
      );
    }

    return data.data || [];
  } catch (error) {
    console.error('getExpenseAggregationByUser Error:', error);
    throw error;
  }
};

/**
 * 상세 집계 데이터 조회 (카테고리별 월별 데이터)
 * @param {string} factoryCode - 공장 코드
 * @param {string} year - 조회 년도 (YYYY)
 * @returns {Promise<Object>} 상세 집계 데이터
 */
export const getDetailedAggregation = async (factoryCode, year) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksGetExpenseAggregation?factoryCode=${factoryCode}&year=${year}&type=detailed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '상세 집계 조회에 실패했습니다.');
    }

    return data.data || {};
  } catch (error) {
    console.error('getDetailedAggregation Error:', error);
    throw error;
  }
};

/**
 * 월별 마감 데이터 조회 (레거시 함수 - 사용 안 함)
 * @param {string} factoryCode - 공장 코드
 * @param {string} year - 조회 년도
 * @returns {Promise<Array>} 마감 데이터 리스트
 */
export const getExpenseClosingByYear = async (factoryCode, year) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jvWorksGetExpenseClosing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        factoryCode,
        year,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '마감 데이터 조회에 실패했습니다.');
    }

    return data.list || [];
  } catch (error) {
    console.error('getExpenseClosingByYear Error:', error);
    throw error;
  }
};

/**
 * 특별 항목 조회
 * @param {string} factoryCode - 공장 코드
 * @param {string} monthYm - 조회 년월 (YYYY-MM)
 * @returns {Promise<Array>} 특별 항목 리스트
 */
export const getSpecialItems = async (factoryCode, monthYm) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jvWorksGetSpecialItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        factoryCode,
        monthYm,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '특별 항목 조회에 실패했습니다.');
    }

    return data.list || [];
  } catch (error) {
    console.error('getSpecialItems Error:', error);
    throw error;
  }
};

/**
 * 특별 항목 등록
 * @param {Object} item - 특별 항목 정보
 * @returns {Promise<Object>} 응답 데이터
 */
export const createSpecialItem = async (item) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jvWorksSetSpecialItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '특별 항목 등록에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('createSpecialItem Error:', error);
    throw error;
  }
};

/**
 * 특별 항목 수정
 * @param {string} specialItemId - 특별 항목 ID
 * @param {Object} item - 수정할 특별 항목 정보
 * @returns {Promise<Object>} 응답 데이터
 */
export const updateSpecialItem = async (specialItemId, item) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jvWorksSetSpecialItems`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        specialItemId,
        ...item,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '특별 항목 수정에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('updateSpecialItem Error:', error);
    throw error;
  }
};

/**
 * 특별 항목 삭제
 * @param {string} specialItemId - 특별 항목 ID
 * @returns {Promise<Object>} 응답 데이터
 */
export const deleteSpecialItem = async (specialItemId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/jvWorksSetSpecialItems`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        specialItemId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '특별 항목 삭제에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('deleteSpecialItem Error:', error);
    throw error;
  }
};

/**
 * 사용자의 관리자 권한 확인
 * @param {string} userId - 사용자 ID
 * @returns {Promise<boolean>} 관리자 여부
 */
export const checkAdminStatus = async (userId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksCheckAdmin?userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '관리자 확인에 실패했습니다.');
    }

    return data.isAdmin || false;
  } catch (error) {
    console.error('checkAdminStatus Error:', error);
    throw error;
  }
};

/**
 * 월별 근무 통계 데이터 조회
 * @param {string} factoryCode - 공장 코드
 * @param {string} year - 조회 년도 (YYYY)
 * @returns {Promise<Array>} 월별 근무 통계 데이터
 */
export const getMonthlyWorkStatistics = async (factoryCode, year, userId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/jvWorksGetExpenseAggregation?factoryCode=${factoryCode}&year=${year}&type=workstats&userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success === 'false' || data.success === false) {
      throw new Error(data.message || '근무 통계 조회에 실패했습니다.');
    }

    return data.data || [];
  } catch (error) {
    console.error('getMonthlyWorkStatistics Error:', error);
    throw error;
  }
};
