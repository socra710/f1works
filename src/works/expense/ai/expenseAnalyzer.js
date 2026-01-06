/**
 * 경비 AI 분석 유틸리티
 * ExpenseSummary에서 사용하는 AI 분석 로직 모음
 */

/**
 * HTML 이스케이프 처리
 */
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * 카테고리 표시명 가져오기
 */
const getDisplayCategory = (cat) => {
  const labelMap = {
    LUNCH_SODAM: '점심(소담)',
    DINNER_SODAM: '저녁(소담)',
    LUNCH_SEJONG: '점심(세종)',
    DINNER_SEJONG: '저녁(세종)',
    PARTY: '회식비',
    MEETING: '회의비',
    UTILITY: '공공요금',
    FUEL: '유류비',
    ETC: '기타',
  };
  return labelMap[cat] || cat;
};

/**
 * 전년 데이터 상태 분석
 */
const analyzePreviousYearData = (prevData) => {
  const prevExists = Array.isArray(prevData) && prevData.length > 0;

  if (!prevExists) {
    return { prevAbsent: true, prevZeroOrSparse: false };
  }

  const prevTotal = prevData.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0
  );

  const prevUniqueMonthsCount = new Set(
    prevData.map((i) => i.monthYm).filter(Boolean)
  ).size;

  const prevZeroOrSparse = prevTotal <= 0 || prevUniqueMonthsCount < 3;

  return { prevAbsent: false, prevZeroOrSparse };
};

/**
 * 카테고리별 데이터 집계
 */
const aggregateByCategory = (data) => {
  const aggregated = {};

  data.forEach((item) => {
    const cat = item.category ?? '';
    aggregated[cat] = (aggregated[cat] || 0) + (item.totalAmount || 0);
  });

  return aggregated;
};

/**
 * 월별 데이터 집계
 */
const aggregateByMonth = (data) => {
  const monthlyTotals = {};

  data.forEach((item) => {
    const month = item.monthYm ? parseInt(item.monthYm.split('-')[1]) : 0;
    if (month > 0) {
      monthlyTotals[month] =
        (monthlyTotals[month] || 0) + (item.totalAmount || 0);
    }
  });

  return monthlyTotals;
};

/**
 * 전년 대비 분석 문구 생성
 */
const generateYearComparisonAnalysis = (currentData, prevData, year, esc) => {
  if (!prevData || prevData.length === 0) {
    return null;
  }

  const currentTotal = currentData.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0
  );

  const prevTotal = prevData.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0
  );

  const changePercentNum =
    prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
  const changePercent = changePercentNum.toFixed(1);
  const changeDiff = currentTotal - prevTotal;

  let comment = '';

  if (Math.abs(changePercentNum) < 5) {
    comment += `💫 전년 대비 <strong>${esc(Math.abs(changePercent))}% ${
      changePercentNum >= 0 ? '증가' : '감소'
    }</strong> - <strong>안정적인 지출 패턴</strong>을 유지중입니다.`;
  } else if (changePercentNum > 0) {
    comment += `📈 전년 대비 <strong>${esc(
      changePercent
    )}% 증가</strong> (<strong>${changeDiff.toLocaleString()}원</strong>) - <strong>지출 증가 추세</strong>입니다.`;
  } else {
    comment += `📉 전년 대비 <strong>${esc(
      Math.abs(changePercent)
    )}% 감소</strong> (<strong>${Math.abs(
      changeDiff
    ).toLocaleString()}원</strong>) - <strong>효율적인 지출 관리</strong>가 이루어지고 있습니다.`;
  }

  return { comment, currentTotal, prevTotal, changePercentNum };
};

/**
 * 카테고리별 주요 변화 분석
 */
const generateCategoryChangeAnalysis = (currentByCategory, prevData, esc) => {
  const prevByCategory = {};
  prevData.forEach((item) => {
    const cat = item.category ?? '';
    prevByCategory[cat] = (prevByCategory[cat] || 0) + (item.totalAmount || 0);
  });

  let maxChangeCategory = '';
  let maxChangePercent = 0;

  Object.keys(currentByCategory).forEach((cat) => {
    const curr = currentByCategory[cat] || 0;
    const prev = prevByCategory[cat] || 0;
    const pct = prev > 0 ? Math.abs(((curr - prev) / prev) * 100) : 0;

    if (pct > maxChangePercent) {
      maxChangePercent = pct;
      maxChangeCategory = cat;
    }
  });

  if (!maxChangeCategory) {
    return '';
  }

  const currentCatTotal = currentByCategory[maxChangeCategory] || 0;
  const prevCatTotal = prevByCategory[maxChangeCategory] || 0;
  const catChangePercent =
    prevCatTotal > 0
      ? (((currentCatTotal - prevCatTotal) / prevCatTotal) * 100).toFixed(1)
      : 0;

  return `\n🔍 <strong>주요 변화</strong>: <strong>${esc(
    getDisplayCategory(maxChangeCategory)
  )}</strong> 카테고리가 <strong>${esc(Math.abs(catChangePercent))}% ${
    Number(catChangePercent) >= 0 ? '증가' : '감소'
  }</strong>했습니다.`;
};

/**
 * 현재 연도 총액 분석 (전년 데이터가 없을 때)
 */
const generateCurrentYearAnalysis = (currentData, currentByCategory, esc) => {
  const currentTotal = currentData.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0
  );

  let comment = `💰 <strong>총 지출액</strong>: <strong>${currentTotal.toLocaleString()}원</strong>`;

  // 가장 큰 지출 카테고리
  let maxCategory = '';
  let maxAmount = 0;

  Object.entries(currentByCategory).forEach(([cat, amount]) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = cat;
    }
  });

  if (maxCategory) {
    const percentage = ((maxAmount / currentTotal) * 100).toFixed(1);
    comment += `\n📌 <strong>주요 지출</strong>: <strong>${esc(
      getDisplayCategory(maxCategory)
    )}</strong> 카테고리가 <strong>${maxAmount.toLocaleString()}원 (${esc(
      percentage
    )}%)</strong>으로 가장 큽니다.`;
  }

  return comment;
};

/**
 * 월별 패턴 분석
 */
const generateMonthlyPatternAnalysis = (monthlyTotals, currentTotal, esc) => {
  const monthlyValues = Object.entries(monthlyTotals).sort(
    (a, b) => b[1] - a[1]
  );

  if (monthlyValues.length === 0) {
    return '';
  }

  const [topMonth, topAmount] = monthlyValues[0];
  const monthAvg = currentTotal / Object.keys(monthlyTotals).length;

  return `\n\n📅 <strong>월별 패턴</strong>: ${esc(
    topMonth
  )}월 지출이 <strong>${topAmount.toLocaleString()}원</strong>으로 최고점이며, 월평균은 <strong>${Math.round(
    monthAvg
  ).toLocaleString()}원</strong>입니다.`;
};

/**
 * 월별 이상치 분석 (급증/감소)
 */
const generateMonthlyAnomalyAnalysis = (monthlyTotals, currentTotal, esc) => {
  const monthCount = Object.keys(monthlyTotals).length;

  if (monthCount === 0 || currentTotal === 0) {
    return '';
  }

  const avg = currentTotal / monthCount;
  const incThresh = 0.4; // 평균 대비 +40% 이상 급증
  const decThresh = 0.3; // 평균 대비 -30% 이상 감소

  let spike = null;
  let drop = null;

  Object.entries(monthlyTotals).forEach(([m, v]) => {
    const ratio = avg > 0 ? (v - avg) / avg : 0;
    if (!spike || ratio > spike.ratio)
      spike = { month: Number(m), amount: v, ratio };
    if (!drop || ratio < drop.ratio)
      drop = { month: Number(m), amount: v, ratio };
  });

  let comment = '';

  if (spike && spike.ratio >= incThresh) {
    const pct = (spike.ratio * 100).toFixed(1);
    comment += `\n⚠️ <strong>월별 이상치</strong>: ${esc(
      spike.month
    )}월 지출이 월평균 대비 <strong>+${esc(
      pct
    )}%</strong> (<strong>${spike.amount.toLocaleString()}원</strong>)로 급증했습니다.`;
  }

  if (drop && drop.ratio <= -decThresh && drop.amount > 0) {
    const pct = Math.abs(drop.ratio * 100).toFixed(1);
    comment += `\n✅ <strong>월별 절감</strong>: ${esc(
      drop.month
    )}월 지출이 월평균 대비 <strong>-${esc(
      pct
    )}%</strong> (<strong>${drop.amount.toLocaleString()}원</strong>)로 감소했습니다.`;
  } else if (drop && drop.amount === 0) {
    comment += `\n📝 <strong>월별 데이터</strong>: ${esc(
      drop.month
    )}월은 지출이 없어 감소 경고를 표시하지 않습니다.`;
  }

  return comment;
};

/**
 * 사용자별 데이터 분석
 */
const generateUserAnalysis = (userData, esc) => {
  if (!userData || Object.keys(userData).length === 0) {
    return '';
  }

  const activeUsers = Object.entries(userData).filter(
    ([, data]) => data.status === '재직자'
  );

  const totalUserExpense = Object.values(userData).reduce(
    (sum, data) => sum + data.total,
    0
  );

  const avgPerUser =
    activeUsers.length > 0 ? totalUserExpense / activeUsers.length : 0;

  let comment = `\n\n👥 <strong>사용자 분석</strong>: 재직자 <strong>${
    activeUsers.length
  }명</strong>, 1인당 평균 <strong>${Math.round(
    avgPerUser
  ).toLocaleString()}원</strong>`;

  // 최대 사용자 (오승호 제외)
  const sortedUsers = Object.entries(userData)
    .filter(([name]) => name !== '오승호')
    .sort((a, b) => b[1].total - a[1].total);

  if (sortedUsers.length > 0) {
    const [topUser, topData] = sortedUsers[0];
    comment += `\n   최다 사용: <strong>${esc(
      topUser
    )}</strong> (<strong>${topData.total.toLocaleString()}원</strong>)`;
  }

  // 사용자 이상치 분석 (오승호 제외)
  if (activeUsers.length > 1 && avgPerUser > 0) {
    let spikeUser = null;
    let dropUser = null;

    activeUsers
      .filter(([name]) => name !== '오승호')
      .forEach(([name, entry]) => {
        const userAvg = entry.avg || 0;
        const ratio = (userAvg - avgPerUser) / avgPerUser;
        if (!spikeUser || ratio > spikeUser.ratio)
          spikeUser = { name, avg: userAvg, ratio };
        if (!dropUser || ratio < dropUser.ratio)
          dropUser = { name, avg: userAvg, ratio };
      });

    const incUserThresh = 0.5;
    const decUserThresh = 0.4;

    if (spikeUser && spikeUser.ratio >= incUserThresh) {
      const pct = (spikeUser.ratio * 100).toFixed(1);
      comment += `\n⚠️ <strong>사용자 이상치</strong>: <strong>${esc(
        spikeUser.name
      )}</strong>의 월평균 지출이 1인 평균 대비 <strong>+${esc(
        pct
      )}%</strong> (<strong>${Math.round(
        spikeUser.avg
      ).toLocaleString()}원</strong>)로 높습니다.`;
    }

    if (
      dropUser &&
      dropUser.ratio <= -decUserThresh &&
      (dropUser.avg || 0) > 0
    ) {
      const pct = Math.abs(dropUser.ratio * 100).toFixed(1);
      comment += `\n✅ <strong>사용자 절감</strong>: <strong>${esc(
        dropUser.name
      )}</strong>의 월평균 지출이 1인 평균 대비 <strong>-${esc(
        pct
      )}%</strong> (<strong>${Math.round(
        dropUser.avg
      ).toLocaleString()}원</strong>)로 낮습니다.`;
    } else if (dropUser && (dropUser.avg || 0) === 0) {
      comment += `\n📝 <strong>사용자 데이터</strong>: <strong>${esc(
        dropUser.name
      )}</strong>은(는) 지출이 없어 절감 경고를 표시하지 않습니다.`;
    }
  }

  return comment;
};

/**
 * 근무 통계 분석
 */
const generateWorkStatsAnalysis = (workStats, esc) => {
  if (!workStats || Object.keys(workStats).length === 0) {
    return '';
  }

  const statsValues = Object.values(workStats).filter(
    (s) =>
      s &&
      (s.employeeCount != null ||
        s.count != null ||
        s.totalWorkdays != null ||
        s.workdays != null ||
        s.expenseDailyRate != null)
  );

  if (statsValues.length === 0) {
    return `\n\n📊 <strong>근무 통계</strong>: 데이터가 부족하여 요약을 계산할 수 없습니다.`;
  }

  const avgEmployees = Math.round(
    statsValues.reduce((sum, s) => sum + (s.employeeCount || s.count || 0), 0) /
      statsValues.length
  );

  const avgWorkdays = Math.round(
    statsValues.reduce(
      (sum, s) => sum + (s.totalWorkdays || s.workdays || 0),
      0
    ) / statsValues.length
  );

  const avgExpenseRate = Math.round(
    statsValues.reduce((sum, s) => sum + (s.expenseDailyRate || 0), 0) /
      statsValues.length
  );

  let comment = `\n\n📊 <strong>근무 통계</strong>: 월평균 임직원 <strong>${avgEmployees}명</strong>, 출근일수 <strong>${avgWorkdays}일</strong>`;
  comment += `\n   일평균 경비: <strong>${avgExpenseRate.toLocaleString()}원/일</strong>`;

  // 임직원 수 이상치 분석
  comment += generateEmployeeAnomalyAnalysis(workStats, avgEmployees, esc);

  // 출근일수 이상치 분석
  comment += generateWorkdaysAnomalyAnalysis(workStats, esc);

  // 일평균 경비 이상치 분석
  comment += generateDailyExpenseAnomalyAnalysis(workStats, esc);

  return comment;
};

/**
 * 임직원 수 이상치 분석
 */
const generateEmployeeAnomalyAnalysis = (workStats, avgEmployees, esc) => {
  const entries = Object.entries(workStats).filter(([, s]) => s);

  if (entries.length === 0) {
    return '';
  }

  const empAvgBase =
    avgEmployees ||
    Math.round(
      entries.reduce(
        (sum, [, s]) => sum + (s.employeeCount || s.count || 0),
        0
      ) / entries.length
    );

  const empIncThresh = 0.2;
  const empDecThresh = 0.2;
  let empSpike = null;
  let empDrop = null;

  entries.forEach(([m, s]) => {
    const val = s.employeeCount || s.count || 0;
    const ratio = empAvgBase > 0 ? (val - empAvgBase) / empAvgBase : 0;
    if (!empSpike || ratio > empSpike.ratio)
      empSpike = { month: Number(s.month || m), value: val, ratio };
    if (!empDrop || ratio < empDrop.ratio)
      empDrop = { month: Number(s.month || m), value: val, ratio };
  });

  let comment = '';

  if (empSpike && empSpike.ratio >= empIncThresh) {
    const pct = (empSpike.ratio * 100).toFixed(1);
    comment += `\n👥 <strong>임직원 수 이상치</strong>: ${esc(
      empSpike.month
    )}월 임직원 수가 평균 대비 <strong>+${esc(
      pct
    )}%</strong> (<strong>${empSpike.value.toLocaleString()}명</strong>)로 증가했습니다.`;
  }

  if (empDrop && empDrop.ratio <= -empDecThresh) {
    const pct = Math.abs(empDrop.ratio * 100).toFixed(1);
    comment += `\n👥 <strong>임직원 수 감소</strong>: ${esc(
      empDrop.month
    )}월 임직원 수가 평균 대비 <strong>-${esc(
      pct
    )}%</strong> (<strong>${empDrop.value.toLocaleString()}명</strong>)로 감소했습니다.`;
  }

  // 임직원 수 요약
  const empSeries = entries.map(([m, s]) => ({
    month: Number(s.month || m),
    value: s.employeeCount || s.count || 0,
  }));

  if (empSeries.length > 0) {
    const empMax = empSeries.reduce(
      (a, b) => (a == null || b.value > a.value ? b : a),
      null
    );
    const empMin = empSeries.reduce(
      (a, b) => (a == null || b.value < a.value ? b : a),
      null
    );

    if (empMax && empMin) {
      const diff = Math.abs(empMax.value - empMin.value);
      comment += `\n👥 <strong>임직원 수 요약</strong>: 최댓값 ${esc(
        empMax.month
      )}월 <strong>${empMax.value.toLocaleString()}명</strong>, 최솟값 ${esc(
        empMin.month
      )}월 <strong>${empMin.value.toLocaleString()}명</strong> (차이 <strong>${diff.toLocaleString()}명</strong>).`;
    }
  }

  return comment;
};

/**
 * 출근일수 이상치 분석
 */
const generateWorkdaysAnomalyAnalysis = (workStats, esc) => {
  const entries = Object.entries(workStats).filter(([, s]) => s);
  const workdaysValues = entries
    .map(([, s]) => s.totalWorkdays ?? s.workdays)
    .filter((v) => typeof v === 'number' && v > 0);

  if (workdaysValues.length === 0) {
    return '';
  }

  const avgWork =
    workdaysValues.reduce((a, b) => a + b, 0) / workdaysValues.length;
  const wdIncThresh = 0.25;
  const wdDecThresh = 0.2;
  let wdSpike = null;
  let wdDrop = null;

  entries.forEach(([m, s]) => {
    const val = s.totalWorkdays ?? s.workdays ?? 0;
    const ratio = avgWork > 0 ? (val - avgWork) / avgWork : 0;
    if (!wdSpike || ratio > wdSpike.ratio)
      wdSpike = { month: Number(s.month || m), value: val, ratio };
    if (!wdDrop || ratio < wdDrop.ratio)
      wdDrop = { month: Number(s.month || m), value: val, ratio };
  });

  let comment = '';

  if (wdSpike && wdSpike.ratio >= wdIncThresh) {
    const pct = (wdSpike.ratio * 100).toFixed(1);
    comment += `\n🗓️ <strong>출근일수 이상치</strong>: ${esc(
      wdSpike.month
    )}월 출근일수가 평균 대비 <strong>+${esc(
      pct
    )}%</strong> (<strong>${wdSpike.value.toLocaleString()}일</strong>)로 많습니다.`;
  }

  if (wdDrop && wdDrop.ratio <= -wdDecThresh && wdDrop.value > 0) {
    const pct = Math.abs(wdDrop.ratio * 100).toFixed(1);
    comment += `\n🗓️ <strong>출근일수 감소</strong>: ${esc(
      wdDrop.month
    )}월 출근일수가 평균 대비 <strong>-${esc(
      pct
    )}%</strong> (<strong>${wdDrop.value.toLocaleString()}일</strong>)로 적습니다.`;
  } else if (wdDrop && wdDrop.value === 0) {
    comment += `\n📝 <strong>출근일수 데이터</strong>: ${esc(
      wdDrop.month
    )}월은 출근일수가 없어 감소 경고를 표시하지 않습니다.`;
  }

  // 출근일수 요약
  const wdSeries = entries.map(([m, s]) => ({
    month: Number(s.month || m),
    value: (s.totalWorkdays ?? s.workdays ?? 0) || 0,
  }));

  if (wdSeries.length > 0) {
    const wdMax = wdSeries.reduce(
      (a, b) => (a == null || b.value > a.value ? b : a),
      null
    );
    const wdMin = wdSeries.reduce(
      (a, b) => (a == null || b.value < a.value ? b : a),
      null
    );

    if (wdMax && wdMin) {
      const diff = Math.abs(wdMax.value - wdMin.value);
      comment += `\n🗓️ <strong>출근일수 요약</strong>: 최댓값 ${esc(
        wdMax.month
      )}월 <strong>${wdMax.value.toLocaleString()}일</strong>, 최솟값 ${esc(
        wdMin.month
      )}월 <strong>${wdMin.value.toLocaleString()}일</strong> (차이 <strong>${diff.toLocaleString()}일</strong>).`;
    }
  }

  return comment;
};

/**
 * 일평균 경비 이상치 분석
 */
const generateDailyExpenseAnomalyAnalysis = (workStats, esc) => {
  const entries = Object.entries(workStats).filter(([, s]) => s);
  const dailyRates = entries
    .map(([, s]) => s.expenseDailyRate)
    .filter((v) => typeof v === 'number');

  if (dailyRates.length === 0) {
    return '';
  }

  const avgDaily = dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length;
  const drIncThresh = 0.3;
  const drDecThresh = 0.25;
  let drSpike = null;
  let drDrop = null;

  entries.forEach(([m, s]) => {
    const val = s.expenseDailyRate || 0;
    const ratio = avgDaily > 0 ? (val - avgDaily) / avgDaily : 0;
    if (!drSpike || ratio > drSpike.ratio)
      drSpike = { month: Number(s.month || m), value: val, ratio };
    if (!drDrop || ratio < drDrop.ratio)
      drDrop = { month: Number(s.month || m), value: val, ratio };
  });

  let comment = '';

  if (drSpike && drSpike.ratio >= drIncThresh) {
    const pct = (drSpike.ratio * 100).toFixed(1);
    comment += `\n💸 <strong>일평균 경비 이상치</strong>: ${esc(
      drSpike.month
    )}월이 평균 대비 <strong>+${esc(pct)}%</strong> (<strong>${Math.round(
      drSpike.value
    ).toLocaleString()}원/일</strong>)로 증가했습니다.`;
  }

  if (drDrop && drDrop.ratio <= -drDecThresh) {
    const drDropStat = workStats[drDrop.month] || {};
    const wd = drDropStat.totalWorkdays ?? drDropStat.workdays ?? 0;

    if (drDrop.value > 0 && wd > 0) {
      const pct = Math.abs(drDrop.ratio * 100).toFixed(1);
      comment += `\n💸 <strong>일평균 경비 감소</strong>: ${esc(
        drDrop.month
      )}월이 평균 대비 <strong>-${esc(pct)}%</strong> (<strong>${Math.round(
        drDrop.value
      ).toLocaleString()}원/일</strong>)로 감소했습니다.`;
    } else {
      comment += `\n📝 <strong>일평균 경비 데이터</strong>: ${esc(
        drDrop.month
      )}월은 출근일수 또는 지출이 없어 감소 경고를 표시하지 않습니다.`;
    }
  }

  return comment;
};

/**
 * AI 분석 코멘트 생성 메인 함수
 * @param {Array} currentData - 현재 연도 경비 데이터
 * @param {Array} prevData - 전년도 경비 데이터
 * @param {Object} workStats - 근무 통계 데이터
 * @param {Object} userData - 사용자별 집계 데이터
 * @param {string} year - 분석 연도
 * @param {boolean} [force] - 연도 게이트를 무시하고 항상 생성할지 여부 (기본 false)
 * @returns {string} HTML 형식의 분석 코멘트
 */
export const generateAnalysisComment = (
  currentData,
  prevData,
  workStats,
  userData,
  year,
  force = false
) => {
  if (!currentData || currentData.length === 0) return '';

  // 2025년 12월부터 분석 제공 (서비스 오픈 시점)
  const currentYear = parseInt(year);
  if (!force && currentYear < 2025) {
    return '';
  }

  const esc = escapeHtml;

  const currentTotal = currentData.reduce(
    (sum, item) => sum + (item.totalAmount || 0),
    0
  );

  // 카테고리별 & 월별 집계
  const currentByCategory = aggregateByCategory(currentData);
  const monthlyTotals = aggregateByMonth(currentData);

  let comment = `🤖 <strong>AI 요약 - ${esc(year)}년 통합 분석</strong>\n\n`;

  // 전년 데이터 상태 분석
  const { prevAbsent, prevZeroOrSparse } = analyzePreviousYearData(prevData);

  // 전년도 비교 분석
  if (prevData && prevData.length > 0) {
    const yearComparison = generateYearComparisonAnalysis(
      currentData,
      prevData,
      year,
      esc
    );

    if (yearComparison) {
      comment += yearComparison.comment;

      // 카테고리별 주요 변화
      const categoryChange = generateCategoryChangeAnalysis(
        currentByCategory,
        prevData,
        esc
      );
      comment += categoryChange;
    }
  } else {
    // 전년도 데이터가 없는 경우
    comment += generateCurrentYearAnalysis(currentData, currentByCategory, esc);
  }

  // 전년 데이터 부족 안내
  if (prevAbsent) {
    comment += `\nℹ️ <strong>전년 데이터 부족</strong>: 전년 데이터가 없어 올해 기준 분석만 제공합니다.`;
  } else if (prevZeroOrSparse) {
    comment += `\nℹ️ <strong>전년 데이터 부족</strong>: 전년 총액이 0이거나 데이터가 희소하여 전년 비교의 신뢰도가 낮습니다.`;
  }

  // 월별 패턴 분석
  comment += generateMonthlyPatternAnalysis(monthlyTotals, currentTotal, esc);

  // 월별 이상치 분석
  comment += generateMonthlyAnomalyAnalysis(monthlyTotals, currentTotal, esc);

  // 사용자별 분석
  comment += generateUserAnalysis(userData, esc);

  // 근무 통계 분석
  comment += generateWorkStatsAnalysis(workStats, esc);

  return comment;
};
