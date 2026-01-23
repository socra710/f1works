/**
 * 카테고리 매핑 설정
 */
export const categoryMapping = {
  '점심(소담)': { main: '식비', sub: '점심(소담)' },
  '저녁(소담)': { main: '식비', sub: '저녁(소담)' },
  '점심(세종)': { main: '식비', sub: '점심(세종)' },
  '저녁(세종)': { main: '식비', sub: '저녁(세종)' },
  점심: { main: '식비', sub: '점심' },
  저녁: { main: '식비', sub: '저녁' },
  여비: { main: '비식비', sub: '여비' },
  TRAVEL: { main: '비식비', sub: '여비' },
  PARTY: { main: '비식비', sub: '회식비' },
  회식비: { main: '비식비', sub: '회식비' },
  MEETING: { main: '비식비', sub: '회의비' },
  회의비: { main: '비식비', sub: '회의비' },
  UTILITY: { main: '비식비', sub: '공공요금' },
  공공요금: { main: '비식비', sub: '공공요금' },
  FUEL: { main: '비식비', sub: '유류비' },
  유류비: { main: '비식비', sub: '유류비' },
  ETC: { main: '비식비', sub: '기타' },
  기타: { main: '비식비', sub: '기타' },
};

/**
 * 월별 카테고리 데이터 집계
 * @param {Array} closingData - 마감 데이터
 * @returns {Object} { categories, categoryOrder }
 */
export const getMonthlyByCategoryData = (closingData) => {
  const categories = {};
  const categoryOrder = {};

  closingData.forEach((item) => {
    const itemCategory = item.category || '기타';
    let mainCategory = '비식비';
    let subCategory = '기타';

    const nonFoodCategories = [
      'FUEL',
      '유류비',
      'MEETING',
      '회의비',
      'PARTY',
      '회식비',
      'ETC',
      '기타',
      'UTILITY',
      '공공요금',
      'TRAVEL',
      '여비',
    ];

    if (nonFoodCategories.includes(itemCategory)) {
      if (categoryMapping[itemCategory]) {
        mainCategory = categoryMapping[itemCategory].main;
        subCategory = categoryMapping[itemCategory].sub;
      } else {
        mainCategory = '비식비';
        subCategory = itemCategory;
      }
    } else {
      mainCategory = '식비';
      if (categoryMapping[itemCategory]) {
        subCategory = categoryMapping[itemCategory].sub;
      } else if (itemCategory === 'LUNCH') {
        subCategory = '점심';
      } else if (itemCategory === 'DINNER') {
        subCategory = '저녁';
      } else if (itemCategory === 'LUNCH_SODAM') {
        subCategory = '점심(소담)';
      } else if (itemCategory === 'DINNER_SODAM') {
        subCategory = '저녁(소담)';
      } else if (itemCategory === 'LUNCH_SEJONG') {
        subCategory = '점심(세종)';
      } else if (itemCategory === 'DINNER_SEJONG') {
        subCategory = '저녁(세종)';
      } else {
        subCategory = itemCategory;
      }
    }

    if (!categories[mainCategory]) {
      categories[mainCategory] = {};
      categoryOrder[mainCategory] = mainCategory === '식비' ? 0 : 1;
    }

    if (!categories[mainCategory][subCategory]) {
      categories[mainCategory][subCategory] = {
        mainCategory,
        subCategory,
        monthly: {},
        total: 0,
        budget: 0,
      };
    }

    const itemMonth = item.monthYm ? parseInt(item.monthYm.split('-')[1]) : 0;
    if (itemMonth > 0 && itemMonth <= 12) {
      if (!categories[mainCategory][subCategory].monthly[itemMonth]) {
        categories[mainCategory][subCategory].monthly[itemMonth] = 0;
      }
      const amt = item.totalAmount || 0;
      categories[mainCategory][subCategory].monthly[itemMonth] += amt;
      categories[mainCategory][subCategory].total += amt;
    }
  });

  return { categories, categoryOrder };
};

/**
 * 카테고리별 월별 합계 계산
 * @param {Array} closingData - 마감 데이터
 * @returns {Object} { categoryTotals, monthlyGrandTotal }
 */
export const getCategoryMonthlyTotals = (closingData) => {
  const { categories } = getMonthlyByCategoryData(closingData);
  const categoryTotals = {};
  const monthlyGrandTotal = {};

  Object.entries(categories).forEach(([category, subcategories]) => {
    categoryTotals[category] = { monthly: {}, total: 0 };

    Object.entries(subcategories).forEach(([subcategory, data]) => {
      for (let month = 1; month <= 12; month++) {
        if (!categoryTotals[category].monthly[month]) {
          categoryTotals[category].monthly[month] = 0;
        }
        const val = data.monthly[month] || 0;
        categoryTotals[category].monthly[month] += val;
        categoryTotals[category].total += val;

        if (!monthlyGrandTotal[month]) monthlyGrandTotal[month] = 0;
        monthlyGrandTotal[month] += val;
      }
    });
  });

  return { categoryTotals, monthlyGrandTotal };
};

/**
 * 경비입금 합계 계산 (DINNER, LUNCH + 비식비만 합산, 특별항목 제외)
 * @param {Array} closingData - 마감 데이터
 * @returns {Object} 월별 합계 { 1: 금액, 2: 금액, ... }
 */
export const getExpenseDepositTotal = (closingData) => {
  const monthlyTotal = {};

  // 비식비 카테고리 (영문/국문 코드 모두 포함)
  const nonFoodCategories = [
    'FUEL',
    '유류비',
    'MEETING',
    '회의비',
    'PARTY',
    '회식비',
    'ETC',
    '기타',
    'UTILITY',
    '공공요금',
    'TRAVEL',
    '여비',
  ];

  // 식비 카테고리(점심/저녁의 모든 변형 포함)
  const mealCategories = [
    'LUNCH',
    'DINNER',
    'LUNCH_SODAM',
    'DINNER_SODAM',
    'LUNCH_SEJONG',
    'DINNER_SEJONG',
    '점심',
    '저녁',
    '점심(소담)',
    '저녁(소담)',
    '점심(세종)',
    '저녁(세종)',
  ];

  const depositCategories = new Set([...mealCategories, ...nonFoodCategories]);

  closingData.forEach((item) => {
    const itemCategory = item.category || '기타';
    if (!depositCategories.has(itemCategory)) return; // 식비 중 점심/저녁 외 카테고리는 제외

    const itemMonth = item.monthYm ? parseInt(item.monthYm.split('-')[1]) : 0;
    if (itemMonth > 0 && itemMonth <= 12) {
      if (!monthlyTotal[itemMonth]) {
        monthlyTotal[itemMonth] = 0;
      }
      monthlyTotal[itemMonth] += item.totalAmount || 0;
    }
  });

  return monthlyTotal;
};
