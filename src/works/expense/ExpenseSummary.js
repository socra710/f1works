import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import './ExpenseSummary.css';
import { useToast } from '../../common/Toast';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';
import {
  getExpenseAggregationByYear,
  getExpenseAggregationByUser,
  getMonthlyWorkStatistics,
  getLatestApprovedExpenseId,
  // getSpecialItems,
} from './expenseAPI';
import AnalysisBanner from './AnalysisBanner';

/**
 * 경비 청구 집계 페이지
 * 월별로 마감된 경비 데이터만 표시
 * 관리자만 접근 가능
 */
export default function ExpenseSummary() {
  // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const { encodedYear } = useParams();
  // const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  // const { showDialog } = useDialog();

  // URL에서 인코딩된 년도가 있는지 확인 및 유효성 검증
  const isSharedLink = !!encodedYear;
  let initialYear = '';
  let isValidYear = true;

  const SECRET_KEY = 'f1soft@611';

  const decodeWithKey = (encoded) => {
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

  if (isSharedLink) {
    try {
      initialYear = decodeWithKey(encodedYear);
      if (!initialYear) {
        isValidYear = false;
        initialYear = new Date().getFullYear().toString();
      } else {
        // 디코딩된 값이 숫자이고 2020~2099 범위인지 확인
        const yearNum = parseInt(initialYear, 10);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2099) {
          isValidYear = false;
          initialYear = new Date().getFullYear().toString();
        }
      }
    } catch (e) {
      isValidYear = false;
      initialYear = new Date().getFullYear().toString();
    }
  } else {
    initialYear = new Date().getFullYear().toString();
  }

  // 키를 섞는 함수
  const encodeWithKey = (text) => {
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

  // 링크 생성 함수
  const handleCreateLink = () => {
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

  // 카테고리 매핑 (category -> {mainCategory, subCategory})
  const categoryMapping = {
    '점심(소담)': { main: '식비', sub: '점심(소담)' },
    '저녁(소담)': { main: '식비', sub: '저녁(소담)' },
    '점심(세종)': { main: '식비', sub: '점심(세종)' },
    '저녁(세종)': { main: '식비', sub: '저녁(세종)' },
    점심: { main: '식비', sub: '점심' },
    저녁: { main: '식비', sub: '저녁' },
    여비: { main: '비식비', sub: '여비' },
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

  const [year, setYear] = useState(() => initialYear);
  const [closingData, setClosingData] = useState([]);
  // const [previousYearData, setPreviousYearData] = useState([]);
  const [userMonthlyData, setUserMonthlyData] = useState({});
  const [monthlyWorkStats, setMonthlyWorkStats] = useState({});
  const [analysisComment, setAnalysisComment] = useState('');
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  // const [specialItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  // const [isManagerMode] = useState(searchParams.get('mode') === 'manager');
  const [factoryCode] = useState('000001'); // 예시, 실제로는 로그인 정보에서 가져옴
  const [userId] = useState(
    window.sessionStorage.getItem('extensionLogin') || ''
  );

  // AI 분석 코멘트 생성 함수 (HTML 렌더링)
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

  const generateAnalysisComment = (
    currentData,
    prevData,
    workStats,
    userData
  ) => {
    if (!currentData || currentData.length === 0) return '';

    const esc = (v) =>
      String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const currentTotal = currentData.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0
    );

    // 카테고리별 분석
    const currentByCategory = {};
    const monthlyTotals = {};

    currentData.forEach((item) => {
      const cat = item.category ?? '';
      currentByCategory[cat] =
        (currentByCategory[cat] || 0) + (item.totalAmount || 0);

      // 월별 합계
      const month = item.monthYm ? parseInt(item.monthYm.split('-')[1]) : 0;
      if (month > 0) {
        monthlyTotals[month] =
          (monthlyTotals[month] || 0) + (item.totalAmount || 0);
      }
    });

    let comment = `🤖 <strong>AI 요약 - ${esc(year)}년 통합 분석</strong>\n\n`;

    // 전년 데이터 상태 플래그 (옵션 D)
    const prevExists = Array.isArray(prevData) && prevData.length > 0;
    let prevTotalForFlag = 0;
    let prevUniqueMonthsCount = 0;
    let prevZeroOrSparse = false;
    let prevAbsent = false;
    if (prevExists) {
      prevTotalForFlag = prevData.reduce(
        (sum, item) => sum + (item.totalAmount || 0),
        0
      );
      prevUniqueMonthsCount = new Set(
        prevData.map((i) => i.monthYm).filter(Boolean)
      ).size;
      prevZeroOrSparse = prevTotalForFlag <= 0 || prevUniqueMonthsCount < 3;
    } else {
      prevAbsent = true;
    }

    // 전년도 데이터가 있는 경우 비교 분석
    if (prevData && prevData.length > 0) {
      const prevTotal = prevData.reduce(
        (sum, item) => sum + (item.totalAmount || 0),
        0
      );
      const changePercentNum =
        prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
      const changePercent = changePercentNum.toFixed(1);
      const changeDiff = currentTotal - prevTotal;

      const prevByCategory = {};
      prevData.forEach((item) => {
        const cat = item.category ?? '';
        prevByCategory[cat] =
          (prevByCategory[cat] || 0) + (item.totalAmount || 0);
      });

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

      // 가장 변화가 큰 카테고리
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

      if (maxChangeCategory) {
        const currentCatTotal = currentByCategory[maxChangeCategory] || 0;
        const prevCatTotal = prevByCategory[maxChangeCategory] || 0;
        const catChangePercent =
          prevCatTotal > 0
            ? (((currentCatTotal - prevCatTotal) / prevCatTotal) * 100).toFixed(
                1
              )
            : 0;
        comment += `\n🔍 <strong>주요 변화</strong>: <strong>${esc(
          getDisplayCategory(maxChangeCategory)
        )}</strong> 카테고리가 <strong>${esc(Math.abs(catChangePercent))}% ${
          Number(catChangePercent) >= 0 ? '증가' : '감소'
        }</strong>했습니다.`;
      }
    } else {
      // 전년도 데이터가 없는 경우 올해 데이터만으로 분석
      comment += `💰 <strong>총 지출액</strong>: <strong>${currentTotal.toLocaleString()}원</strong>`;

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
    }

    // 옵션 D: 전년 데이터 부족 안내 문구 추가
    if (prevAbsent) {
      comment += `\nℹ️ <strong>전년 데이터 부족</strong>: 전년 데이터가 없어 올해 기준 분석만 제공합니다.`;
    } else if (prevZeroOrSparse) {
      comment += `\nℹ️ <strong>전년 데이터 부족</strong>: 전년 총액이 0이거나 데이터가 희소하여 전년 비교의 신뢰도가 낮습니다.`;
    }

    // 월별 지출 패턴 분석 (전년도 데이터 유무와 관계없이 표시)
    const monthlyValues = Object.entries(monthlyTotals).sort(
      (a, b) => b[1] - a[1]
    );
    if (monthlyValues.length > 0) {
      const [topMonth, topAmount] = monthlyValues[0];
      const monthAvg = currentTotal / Object.keys(monthlyTotals).length;
      comment += `\n\n📅 <strong>월별 패턴</strong>: ${esc(
        topMonth
      )}월 지출이 <strong>${topAmount.toLocaleString()}원</strong>으로 최고점이며, 월평균은 <strong>${Math.round(
        monthAvg
      ).toLocaleString()}원</strong>입니다.`;
    }

    // 월별 평균 대비 급증/감소 이상치 분석
    const monthCount = Object.keys(monthlyTotals).length;
    if (monthCount > 0 && currentTotal > 0) {
      const avg = currentTotal / monthCount;
      const incThresh = 0.4; // 평균 대비 +40% 이상 급증
      const decThresh = 0.3; // 평균 대비 -30% 이상 감소

      let spike = null; // {month, amount, ratio}
      let drop = null; // {month, amount, ratio}

      Object.entries(monthlyTotals).forEach(([m, v]) => {
        const ratio = avg > 0 ? (v - avg) / avg : 0;
        if (!spike || ratio > spike.ratio)
          spike = { month: Number(m), amount: v, ratio };
        if (!drop || ratio < drop.ratio)
          drop = { month: Number(m), amount: v, ratio };
      });

      if (spike && spike.ratio >= incThresh) {
        const pct = (spike.ratio * 100).toFixed(1);
        comment += `\n⚠️ <strong>월별 이상치</strong>: ${esc(
          spike.month
        )}월 지출이 월평균 대비 <strong>+${esc(
          pct
        )}%</strong> (<strong>${spike.amount.toLocaleString()}원</strong>)로 급증했습니다.`;
      }
      // 옵션 C: 0원 월은 '지출 없음'으로 처리하여 -100% 경고 억제
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
    }

    // 사용자별 데이터 분석
    if (userData && Object.keys(userData).length > 0) {
      const activeUsers = Object.entries(userData).filter(
        ([, data]) => data.status === '재직자'
      );
      const totalUserExpense = Object.values(userData).reduce(
        (sum, data) => sum + data.total,
        0
      );
      const avgPerUser =
        activeUsers.length > 0 ? totalUserExpense / activeUsers.length : 0;

      comment += `\n\n👥 <strong>사용자 분석</strong>: 재직자 <strong>${
        activeUsers.length
      }명</strong>, 1인당 평균 <strong>${Math.round(
        avgPerUser
      ).toLocaleString()}원</strong>`;

      // 최대 사용자
      const sortedUsers = Object.entries(userData).sort(
        (a, b) => b[1].total - a[1].total
      );
      if (sortedUsers.length > 0) {
        const [topUser, topData] = sortedUsers[0];
        comment += `\n   최다 사용: <strong>${esc(
          topUser
        )}</strong> (<strong>${topData.total.toLocaleString()}원</strong>)`;
      }

      // 사용자 평균 대비 이상치 (급증/감소) 탐지 - 사용자 월평균(개인) vs 전체 1인 평균 비교
      if (activeUsers.length > 1 && avgPerUser > 0) {
        let spikeUser = null; // {name, avg, ratio}
        let dropUser = null; // {name, avg, ratio}
        activeUsers.forEach(([name, entry]) => {
          const userAvg = entry.avg || 0;
          const ratio = (userAvg - avgPerUser) / avgPerUser;
          if (!spikeUser || ratio > spikeUser.ratio)
            spikeUser = { name, avg: userAvg, ratio };
          if (!dropUser || ratio < dropUser.ratio)
            dropUser = { name, avg: userAvg, ratio };
        });

        const incUserThresh = 0.5; // +50% 이상
        const decUserThresh = 0.4; // -40% 이상
        if (spikeUser && spikeUser.ratio >= incUserThresh) {
          const pct = (spikeUser.ratio * 100).toFixed(1);
          comment += `\n⚠️ <strong>사용자 이상치</strong>: <strong>${esc(
            spikeUser.name
          )}</strong>의 월평균 지출이 1인 평균 대비 <strong>+${esc(
            pct
          )}%</strong> (<strong>${Math.round(
            spikeUser.avg
          ).toLocaleString()}원</strong>)으로 높습니다.`;
        }
        // 옵션 C: 0원 사용자 평균은 '지출 없음' 안내로 대체
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
          ).toLocaleString()}원</strong>)으로 낮습니다.`;
        } else if (dropUser && (dropUser.avg || 0) === 0) {
          comment += `\n📝 <strong>사용자 데이터</strong>: <strong>${esc(
            dropUser.name
          )}</strong>은(는) 지출이 없어 절감 경고를 표시하지 않습니다.`;
        }
      }
    }

    // 근무 통계 분석
    if (workStats && Object.keys(workStats).length > 0) {
      const statsValues = Object.values(workStats).filter(
        (s) =>
          s &&
          (s.employeeCount != null ||
            s.count != null ||
            s.totalWorkdays != null ||
            s.workdays != null ||
            s.expenseDailyRate != null)
      );
      if (statsValues.length > 0) {
        const avgEmployees = Math.round(
          statsValues.reduce(
            (sum, s) => sum + (s.employeeCount || s.count || 0),
            0
          ) / statsValues.length
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

        comment += `\n\n📊 <strong>근무 통계</strong>: 월평균 임직원 <strong>${avgEmployees}명</strong>, 출근일수 <strong>${avgWorkdays}일</strong>`;
        comment += `\n   일평균 경비: <strong>${avgExpenseRate.toLocaleString()}원/일</strong>`;

        // 월별 임직원 수 급증/급감 분석
        const entries = Object.entries(workStats).filter(([, s]) => s);
        if (entries.length > 0) {
          const empAvgBase =
            avgEmployees ||
            Math.round(
              entries.reduce(
                (sum, [, s]) => sum + (s.employeeCount || s.count || 0),
                0
              ) / entries.length
            );
          const empIncThresh = 0.2; // +20%
          const empDecThresh = 0.2; // -20%
          let empSpike = null; // {month, value, ratio}
          let empDrop = null; // {month, value, ratio}
          entries.forEach(([m, s]) => {
            const val = s.employeeCount || s.count || 0;
            const ratio = empAvgBase > 0 ? (val - empAvgBase) / empAvgBase : 0;
            if (!empSpike || ratio > empSpike.ratio)
              empSpike = { month: Number(s.month || m), value: val, ratio };
            if (!empDrop || ratio < empDrop.ratio)
              empDrop = { month: Number(s.month || m), value: val, ratio };
          });
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

          // 옵션 B: 임계와 무관하게 임직원 수 최댓값/최솟값 요약 항상 표시
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

          // 월별 출근일수 급증/급감 분석
          const workdaysValues = entries
            .map(([, s]) => s.totalWorkdays ?? s.workdays)
            .filter((v) => typeof v === 'number' && v > 0);
          if (workdaysValues.length > 0) {
            const avgWork =
              workdaysValues.reduce((a, b) => a + b, 0) / workdaysValues.length;
            const wdIncThresh = 0.25; // +25%
            const wdDecThresh = 0.2; // -20%
            let wdSpike = null; // {month, value, ratio}
            let wdDrop = null; // {month, value, ratio}
            entries.forEach(([m, s]) => {
              const val = s.totalWorkdays ?? s.workdays ?? 0;
              const ratio = avgWork > 0 ? (val - avgWork) / avgWork : 0;
              if (!wdSpike || ratio > wdSpike.ratio)
                wdSpike = { month: Number(s.month || m), value: val, ratio };
              if (!wdDrop || ratio < wdDrop.ratio)
                wdDrop = { month: Number(s.month || m), value: val, ratio };
            });
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
          }

          // 옵션 B: 출근일수 최댓값/최솟값 요약 항상 표시 (0 포함)
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

          // 월별 일평균 경비 급증/급감 분석
          const dailyRates = entries
            .map(([, s]) => s.expenseDailyRate)
            .filter((v) => typeof v === 'number');
          if (dailyRates.length > 0) {
            const avgDaily =
              dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length;
            const drIncThresh = 0.3; // +30%
            const drDecThresh = 0.25; // -25%
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
            if (drSpike && drSpike.ratio >= drIncThresh) {
              const pct = (drSpike.ratio * 100).toFixed(1);
              comment += `\n💸 <strong>일평균 경비 이상치</strong>: ${esc(
                drSpike.month
              )}월이 평균 대비 <strong>+${esc(
                pct
              )}%</strong> (<strong>${Math.round(
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
                )}월이 평균 대비 <strong>-${esc(
                  pct
                )}%</strong> (<strong>${Math.round(
                  drDrop.value
                ).toLocaleString()}원/일</strong>)로 감소했습니다.`;
              } else {
                comment += `\n📝 <strong>일평균 경비 데이터</strong>: ${esc(
                  drDrop.month
                )}월은 출근일수 또는 지출이 없어 감소 경고를 표시하지 않습니다.`;
              }
            }
          }
        }
      } else {
        comment += `\n\n📊 <strong>근무 통계</strong>: 데이터가 부족하여 요약을 계산할 수 없습니다.`;
      }
    }

    return comment;
  };

  const renderSkeletonRows = (columnCount, rowCount = 6) => (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <tr key={`skeleton-${columnCount}-${rowIdx}`} className="skeleton-row">
          {Array.from({ length: columnCount }).map((__, cellIdx) => (
            <td
              key={`skeleton-cell-${columnCount}-${rowIdx}-${cellIdx}`}
              style={{ padding: '12px 8px' }}
            >
              <div
                className="skeleton-cell"
                style={{
                  height: '20px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  animation: 'skeletonShimmer 1.5s infinite',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );

  // 사용 가능한 연도 목록 생성 (2020 ~ 현재년도)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y.toString());
    }
    return years;
  };

  // 상단 로딩바 표시
  useEffect(() => {
    const id = 'global-auth-topbar';
    if (!authChecked) {
      const container = document.createElement('div');
      container.id = id;
      Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '2147483647',
        background: '#fff',
      });
      container.innerHTML =
        '<div class="loading-bar" role="status" aria-label="인증 확인 중"><div class="loading-bar__indicator"></div></div>';
      document.body.appendChild(container);
      return () => {
        const el = document.getElementById(id);
        if (el) el.remove();
      };
    } else {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  }, [authChecked]);

  // 마감 데이터 및 특별항목 조회
  const didFetch = useRef(false);
  const authCheckRef = useRef(false);

  // 사용자 클릭 핸들러: 최근 승인된 경비 ID로 이동
  const handleUserClick = async (userObj) => {
    try {
      setIsLoading(true);
      const expenseId = await getLatestApprovedExpenseId(
        factoryCode,
        userObj.userId
      );
      if (expenseId) {
        // 경비 상세 페이지로 이동 (ID 기준 조회)
        navigate(`/works/expense/${expenseId}?mode=manager`);
      } else {
        showToast('승인된 경비 청구가 없습니다.', 'info');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('사용자 경비 조회 오류:', error);
      showToast('경비 조회 중 오류가 발생했습니다.', 'error');
      setIsLoading(false);
    }
  };

  // 권한 확인 및 초기화
  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    (async () => {
      // 공유 링크인데 유효하지 않은 경우 처리
      if (isSharedLink && !isValidYear) {
        showToast('유효하지 않은 링크입니다.', 'error');
        navigate('/works');
        return;
      }

      const sessionUser = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }

      if (!didFetch.current) {
        loadSummaryData();
        didFetch.current = true;
      }

      setAuthChecked(true);
    })();
    // eslint-disable-next-line
  }, [navigate, showToast]);

  useEffect(() => {
    if (!didFetch.current) {
      return;
    }
    // year가 변경되면 데이터 다시 로드
    loadSummaryData();
    // eslint-disable-next-line
  }, [year]);

  const loadSummaryData = async () => {
    setIsLoading(true);
    try {
      // 승인된 경비 데이터 집계 조회
      const aggregationData = await getExpenseAggregationByYear(
        factoryCode,
        year,
        decodeUserId(userId)
      );

      // 집계 데이터를 closingData 형식으로 변환
      const transformedData = aggregationData.map((item) => ({
        monthYm: item.monthYm,
        category: item.category || '기타',
        totalAmount: item.totalAmount || 0,
        itemCount: item.itemCount || 0,
      }));

      setClosingData(transformedData);

      // 저번년도 데이터 로드 및 AI 분석
      const prevYear = (parseInt(year) - 1).toString();
      let prevTransformedData = null;

      try {
        const prevAggregationData = await getExpenseAggregationByYear(
          factoryCode,
          prevYear,
          decodeUserId(userId)
        );
        prevTransformedData = prevAggregationData.map((item) => ({
          monthYm: item.monthYm,
          category: item.category || '기타',
          totalAmount: item.totalAmount || 0,
          itemCount: item.itemCount || 0,
        }));
      } catch (error) {
        console.log(`${prevYear}년 데이터 로드 실패 (정상):`, error);
      }

      const months = Array.from(
        { length: 12 },
        (_, idx) => `${year}-${String(idx + 1).padStart(2, '0')}`
      );
      const userAggResults = await Promise.all(
        months.map((m) =>
          getExpenseAggregationByUser(factoryCode, m, decodeUserId(userId))
        )
      );

      // 사용자별 합산: { [userName]: { status, monthly: {1: 금액}, total, avg, userId } }
      const userAggregated = {};
      userAggResults.forEach((list, monthIdx) => {
        const month = monthIdx + 1;
        (list || []).forEach((item) => {
          const name =
            item.employeeName ||
            item.userName ||
            item.name ||
            item.empName ||
            item.memberName ||
            '미상';
          const empGbnRaw = item.empGbn ?? item.EMP_GBN;
          const status = empGbnRaw
            ? empGbnRaw === '1'
              ? '재직자'
              : '퇴직자'
            : item.employeeStatus ||
              item.empStatus ||
              item.status ||
              item.type ||
              '재직자';
          const amount = item.totalAmount ?? item.amount ?? 0;
          const userIdFromData =
            item.userId || item.EMPLOYEE_NO || item.employeeNo || '';

          if (!userAggregated[name]) {
            userAggregated[name] = {
              status,
              monthly: {},
              total: 0,
              avg: 0,
              userId: userIdFromData,
            };
          }
          userAggregated[name].status = status;
          userAggregated[name].userId = userIdFromData;
          userAggregated[name].monthly[month] =
            (userAggregated[name].monthly[month] || 0) + amount;
        });
      });

      // total, avg 계산 (avg는 값이 있는 월수 기준)
      Object.values(userAggregated).forEach((entry) => {
        const monthsWithValue = Object.values(entry.monthly).filter(
          (v) => v && v !== 0
        );
        entry.total = monthsWithValue.reduce((s, v) => s + v, 0);
        const divisor = monthsWithValue.length || 1;
        entry.avg = entry.total / divisor;
      });

      setUserMonthlyData(userAggregated);

      // 월별 근무 통계 데이터 조회 및 정규화
      const workStatsData = await getMonthlyWorkStatistics(
        factoryCode,
        year,
        decodeUserId(userId)
      );

      // 숫자 변환 유틸
      const toNum = (v) => (v == null ? 0 : Number(v) || 0);

      // 근무 통계 데이터를 월별로 정렬/정규화 (항상 1~12 키 보장, 타입 일관화)
      let workStatsMap = {};
      if (Array.isArray(workStatsData)) {
        workStatsData.forEach((stat, idx) => {
          const rawMonth = stat.month ?? stat.MONTH ?? stat.monthYm;
          let month = 0;
          if (typeof rawMonth === 'string') {
            // e.g. '2024-01' or '01'
            const mm = rawMonth.includes('-')
              ? parseInt(rawMonth.split('-')[1])
              : parseInt(rawMonth);
            month = isNaN(mm) ? 0 : mm;
          } else {
            month = Number(rawMonth);
          }
          if (!month || month < 1 || month > 12) {
            // fallback: 배열 인덱스 기반 추정 (안전장치)
            month = (idx + 1) % 12 || 12;
          }
          workStatsMap[month] = {
            month,
            employeeCount: toNum(stat.employeeCount ?? stat.count),
            totalWorkdays: toNum(stat.totalWorkdays ?? stat.workdays),
            expenseDailyRate: toNum(stat.expenseDailyRate),
            expensePercentage: stat.expensePercentage ?? null,
            mealDailyRate: toNum(stat.mealDailyRate),
            mealPercentage: stat.mealPercentage ?? null,
          };
        });
      } else if (workStatsData && typeof workStatsData === 'object') {
        // 객체 형태일 경우 각 키를 순회하며 정규화
        Object.entries(workStatsData).forEach(([k, stat]) => {
          if (!stat) return;
          let month = Number(stat.month || k);
          if (!month || month < 1 || month > 12) {
            // 키가 '2024-01' 같은 경우 처리
            if (typeof k === 'string' && k.includes('-')) {
              const mm = parseInt(k.split('-')[1]);
              month = isNaN(mm) ? 0 : mm;
            }
          }
          if (!month || month < 1 || month > 12) return;
          workStatsMap[month] = {
            month,
            employeeCount: toNum(stat.employeeCount ?? stat.count),
            totalWorkdays: toNum(stat.totalWorkdays ?? stat.workdays),
            expenseDailyRate: toNum(stat.expenseDailyRate),
            expensePercentage: stat.expensePercentage ?? null,
            mealDailyRate: toNum(stat.mealDailyRate),
            mealPercentage: stat.mealPercentage ?? null,
          };
        });
      }

      // 1~12월 키를 항상 보장 (누락 월은 0으로 채움)
      for (let m = 1; m <= 12; m++) {
        if (!workStatsMap[m]) {
          workStatsMap[m] = {
            month: m,
            employeeCount: 0,
            totalWorkdays: 0,
            expenseDailyRate: 0,
            expensePercentage: null,
            mealDailyRate: 0,
            mealPercentage: null,
          };
        }
      }

      setMonthlyWorkStats(workStatsMap);

      // AI 분석 코멘트 생성 (모든 데이터 수집 후)
      const comment = generateAnalysisComment(
        transformedData,
        prevTransformedData,
        workStatsMap,
        userAggregated
      );
      setAnalysisComment(comment);

      // 특별 항목 조회 (현재 월)
      // const now = new Date();
      // const currentMonthYm = `${now.getFullYear()}-${String(
      //   now.getMonth() + 1
      // ).padStart(2, '0')}`;

      // const specialItemsList = await getSpecialItems(
      //   factoryCode,
      //   currentMonthYm
      // );
      // setSpecialItems(specialItemsList || []);

      // setMonthlyData({});
    } catch (error) {
      console.error('Error:', error);
      showToast(
        error.message || '데이터 조회 중 오류가 발생했습니다.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 부서별 합계 계산
  // const getDepartmentSummary = () => {
  //   const summary = {};
  //   closingData.forEach((item) => {
  //     if (!summary[item.department]) {
  //       summary[item.department] = {
  //         totalExpense: 0,
  //         fuelExpense: 0,
  //         specialItemExpense: 0,
  //         totalAmount: 0,
  //         count: 0,
  //       };
  //     }
  //     summary[item.department].totalExpense += item.totalExpense;
  //     summary[item.department].fuelExpense += item.fuelExpense;
  //     summary[item.department].specialItemExpense += item.specialItemExpense;
  //     summary[item.department].totalAmount += item.totalAmount;
  //     summary[item.department].count += 1;
  //   });
  //   return summary;
  // };

  // 월별 카테고리 데이터 집계 (이미지 형식)
  const getMonthlyByCategoryData = () => {
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

  // 카테고리별 월별 합계 계산
  const getCategoryMonthlyTotals = () => {
    const { categories } = getMonthlyByCategoryData();
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

  // 경비입금 합계 계산 (DINNER, LUNCH + 비식비만 합산, 특별항목 제외)
  const getExpenseDepositTotal = () => {
    const monthlyTotal = {};

    const nonFoodCategories = [
      'FUEL',
      '유류비',
      'MEETING',
      '회의비',
      'PARTY',
      '회식비',
      'ETC',
      '기타',
    ];
    const depositCategories = new Set([
      'LUNCH',
      'DINNER',
      ...nonFoodCategories,
    ]);

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

  // 전체 합계
  // const getGrandTotal = () => {
  //   return {
  //     totalExpense: closingData.reduce(
  //       (sum, item) => sum + item.totalExpense,
  //       0
  //     ),
  //     fuelExpense: closingData.reduce((sum, item) => sum + item.fuelExpense, 0),
  //     specialItemExpense: closingData.reduce(
  //       (sum, item) => sum + item.specialItemExpense,
  //       0
  //     ),
  //     totalAmount: closingData.reduce((sum, item) => sum + item.totalAmount, 0),
  //   };
  // };

  // 특별항목 부서별 합계
  // const getSpecialItemsByDepartment = () => {
  //   const grouped = {};
  //   specialItems.forEach((item) => {
  //     if (!grouped[item.department]) {
  //       grouped[item.department] = 0;
  //     }
  //     grouped[item.department] += item.amount;
  //   });
  //   return grouped;
  // };

  // if (!isManagerMode) {
  //   return (
  //     <div className="summary-error">
  //       <h2>접근 권한이 없습니다</h2>
  //       <p>관리자만 접근할 수 있는 페이지입니다.</p>
  //       <button onClick={() => navigate('/works')}>돌아가기</button>
  //     </div>
  //   );
  // }

  // const deptSummary = getDepartmentSummary();
  // const grandTotal = getGrandTotal();
  // const specialItemsDept = getSpecialItemsByDepartment();

  // 인증 완료 전에는 흰 배경만 표시
  if (!authChecked) {
    return <div className="auth-wait-screen" />;
  }

  return (
    <>
      <Helmet>
        <title>경비 청구 집계</title>
        <meta property="og:title" content="경비 청구 집계" />
        <meta
          property="og:description"
          content="연도별 경비 청구 집계 현황을 확인하세요."
        />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/works/expense/expense-summary"
        />
      </Helmet>

      <div className="expenseSummary-container">
        <section className="expenseSummary-content">
          {isLoading && (
            <div className="loading-bar">
              <div className="loading-bar__indicator" />
            </div>
          )}
          <header className="expenseSummary-header">
            <div className="header-left">
              <h1>경비 청구 집계</h1>
            </div>
            <div className="header-right">
              <div className="year-selector">
                {/* <label>조회년도:</label> */}
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={isSharedLink}
                >
                  {getYearOptions().map((y) => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
              </div>
              {!isSharedLink && (
                <button
                  className="btn-fuel-settings"
                  onClick={() => navigate('/works/special-items')}
                >
                  특별 항목 관리
                </button>
              )}
              <button
                className="btn-back"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/works');
                  }
                }}
              >
                뒤로가기
              </button>
            </div>
          </header>

          <AnalysisBanner comment={analysisComment} isLoading={isLoading} />

          {closingData.length === 0 && !isLoading ? (
            <div className="empty-state">
              <p>{year}년 경비 청구 데이터가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="expenseSummary-section">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h2 className="section-title">{year}년 집계</h2>

                  {!isSharedLink && (
                    <button
                      className="btn-create-link"
                      onClick={handleCreateLink}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#f88c6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    >
                      공유하기
                    </button>
                  )}
                </div>
                <div className="expenseSummary-table-container yearly-table">
                  <table className="yearly-summary-table">
                    <thead>
                      <tr>
                        <th colSpan="2">비목</th>
                        <th>1월</th>
                        <th>2월</th>
                        <th>3월</th>
                        <th>4월</th>
                        <th>5월</th>
                        <th>6월</th>
                        <th>7월</th>
                        <th>8월</th>
                        <th>9월</th>
                        <th>10월</th>
                        <th>11월</th>
                        <th>12월</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? renderSkeletonRows(16)
                        : (() => {
                            const allRows = [];

                            // ========== 1. 년별 집계 섹션 ==========
                            const { categories, categoryOrder } =
                              getMonthlyByCategoryData();
                            const { categoryTotals, monthlyGrandTotal } =
                              getCategoryMonthlyTotals();

                            // 각 카테고리별 처리
                            Object.entries(categories)
                              .sort(
                                ([catA], [catB]) =>
                                  categoryOrder[catA] - categoryOrder[catB]
                              )
                              .forEach(([category, subcategories]) => {
                                const subItems = Object.entries(subcategories);
                                const subItemCount = subItems.length;

                                // 세목 행
                                subItems.forEach(
                                  ([subcategory, data], index) => {
                                    allRows.push(
                                      <tr
                                        key={`${category}-${subcategory}`}
                                        className="data-row"
                                      >
                                        {index === 0 && (
                                          <td
                                            className="category"
                                            rowSpan={subItemCount + 1}
                                          >
                                            {category}
                                          </td>
                                        )}
                                        <td className="subcategory">
                                          {subcategory}
                                        </td>
                                        {[
                                          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                        ].map((month) => (
                                          <td
                                            key={month}
                                            className="monthly-amount"
                                          >
                                            {(
                                              data.monthly[month] || 0
                                            ).toLocaleString()}
                                          </td>
                                        ))}
                                        <td
                                          style={{ backgroundColor: '#f9f9f9' }}
                                        />
                                        <td
                                          style={{ backgroundColor: '#f9f9f9' }}
                                        />
                                      </tr>
                                    );
                                  }
                                );

                                // 카테고리 소계 행
                                allRows.push(
                                  <tr
                                    key={`${category}-total`}
                                    className="category-total-row"
                                  >
                                    <td className="category-total">
                                      {category}합계
                                    </td>
                                    {[
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ].map((month) => (
                                      <td
                                        key={month}
                                        className="category-total-amount"
                                      >
                                        {(
                                          categoryTotals[category]?.monthly[
                                            month
                                          ] || 0
                                        ).toLocaleString()}
                                      </td>
                                    ))}
                                    <td
                                      style={{ backgroundColor: '#f9f9f9' }}
                                    />
                                    <td
                                      style={{ backgroundColor: '#f9f9f9' }}
                                    />
                                  </tr>
                                );
                              });

                            // 합계(경비입금) 행
                            const expenseDepositTotal =
                              getExpenseDepositTotal();
                            allRows.push(
                              <tr
                                key="expense-deposit"
                                className="category-total-row"
                              >
                                <td
                                  colSpan="2"
                                  className="category-total"
                                  style={{
                                    backgroundColor: '#FCE4D6',
                                  }}
                                >
                                  합계(경비입금)
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="category-total-amount"
                                      style={{
                                        backgroundColor: '#FCE4D6',
                                      }}
                                    >
                                      {(
                                        expenseDepositTotal[month] || 0
                                      ).toLocaleString()}
                                    </td>
                                  )
                                )}
                                <td style={{ backgroundColor: '#FCE4D6' }} />
                                <td style={{ backgroundColor: '#FCE4D6' }} />
                              </tr>
                            );

                            // 전체 합계 행
                            allRows.push(
                              <tr key="grand-total" className="grand-total-row">
                                <td colSpan="2" className="grand-total">
                                  총금액(소담, 세종 포함)
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="grand-total-amount"
                                    >
                                      {(
                                        monthlyGrandTotal[month] || 0
                                      ).toLocaleString()}
                                    </td>
                                  )
                                )}
                                <td style={{ backgroundColor: '#f9f9f9' }} />
                                <td style={{ backgroundColor: '#f9f9f9' }} />
                              </tr>
                            );

                            // 섹션 구분 빈 행
                            allRows.push(
                              <tr key="separator-1" style={{ height: '8px' }}>
                                <td
                                  colSpan="16"
                                  style={{ backgroundColor: '#e0e0e0' }}
                                />
                              </tr>
                            );

                            // 사용자별 집계 헤더
                            allRows.push(
                              <tr
                                key="user-aggregation-header"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  fontWeight: 'bold',
                                  borderBottom: '2px solid #ddd',
                                }}
                              >
                                <td
                                  colSpan="2"
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  이름
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  1월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  2월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  3월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  4월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  5월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  6월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  7월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  8월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  9월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  10월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  11월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  12월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  개인 합계
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    color: 'white',
                                  }}
                                >
                                  월 평균
                                </td>
                              </tr>
                            );

                            // ========== 2. 사용자별 집계 섹션 ==========
                            const entries = Object.entries(
                              userMonthlyData
                            ).sort(([aName, aData], [bName, bData]) => {
                              const statusOrder = (s) =>
                                s === '재직자' ? 0 : 1;
                              const diff =
                                statusOrder(aData.status) -
                                statusOrder(bData.status);
                              if (diff !== 0) return diff;
                              return aName.localeCompare(bName);
                            });

                            const monthlyTotals = {};
                            let overallTotal = 0;
                            entries.forEach(([, data]) => {
                              overallTotal += data.total;
                              [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(
                                (m) => {
                                  monthlyTotals[m] =
                                    (monthlyTotals[m] || 0) +
                                    (data.monthly[m] || 0);
                                }
                              );
                            });

                            // 상태별 rowspan 계산
                            const statusRowSpan = entries.reduce(
                              (acc, [, data]) => {
                                const key = data.status || '기타';
                                acc[key] = (acc[key] || 0) + 1;
                                return acc;
                              },
                              {}
                            );

                            let renderedStatusCount = {};
                            entries.forEach(([name, data]) => {
                              const statusKey = data.status || '기타';
                              const shouldRenderStatus =
                                !renderedStatusCount[statusKey];
                              renderedStatusCount[statusKey] =
                                (renderedStatusCount[statusKey] || 0) + 1;

                              allRows.push(
                                <tr key={name}>
                                  {shouldRenderStatus && (
                                    <td
                                      className="category"
                                      rowSpan={statusRowSpan[statusKey] || 1}
                                    >
                                      {statusKey}
                                    </td>
                                  )}
                                  <td
                                    className="subcategory"
                                    style={{
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      color: '#2c5aa0',
                                      textDecoration: 'underline',
                                    }}
                                    onClick={() => handleUserClick(data)}
                                    title="클릭하여 최근 승인된 경비 조회"
                                  >
                                    {name}
                                  </td>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                    (month) => (
                                      <td
                                        key={month}
                                        className="monthly-amount"
                                      >
                                        {(
                                          data.monthly[month] || 0
                                        ).toLocaleString()}
                                      </td>
                                    )
                                  )}
                                  <td
                                    className="category-total-amount"
                                    style={{ background: '#C0E6F5' }}
                                  >
                                    {data.total.toLocaleString()}
                                  </td>
                                  <td
                                    className="category-total-amount"
                                    style={{ background: '#C0E6F5' }}
                                  >
                                    {Math.round(data.avg).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            });

                            allRows.push(
                              <tr
                                key="user-monthly-total"
                                className="category-total-row"
                              >
                                <td className="category-total" colSpan="2">
                                  총합계
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="category-total-amount"
                                    >
                                      {(
                                        monthlyTotals[month] || 0
                                      ).toLocaleString()}
                                    </td>
                                  )
                                )}
                                <td className="category-total-amount">
                                  {overallTotal.toLocaleString()}
                                </td>
                                <td className="category-total-amount">
                                  {Math.round(
                                    overallTotal / 12
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            );

                            // 섹션 구분 빈 행
                            allRows.push(
                              <tr key="separator-2" style={{ height: '8px' }}>
                                <td
                                  colSpan="16"
                                  style={{ backgroundColor: '#e0e0e0' }}
                                />
                              </tr>
                            );

                            // 근무 통계 헤더
                            allRows.push(
                              <tr
                                key="work-stats-header"
                                style={{
                                  background:
                                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  fontWeight: 'bold',
                                  borderBottom: '2px solid #ddd',
                                }}
                              >
                                <td
                                  colSpan="2"
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  구분
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  1월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  2월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  3월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  4월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  5월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  6월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  7월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  8월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  9월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  10월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  11월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  12월
                                </td>
                                <td
                                  style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    borderRight:
                                      '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                  }}
                                >
                                  전체 평균
                                </td>
                                <td></td>
                              </tr>
                            );

                            // ========== 3. 근무 통계 섹션 ==========

                            // 임직원수 행
                            allRows.push(
                              <tr key="employee-count" className="data-row">
                                <td colSpan="2" className="category">
                                  임직원수
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="monthly-amount"
                                      style={{ textAlign: 'center' }}
                                    >
                                      {monthlyWorkStats[month]?.employeeCount ||
                                        monthlyWorkStats[month]?.count ||
                                        '-'}
                                    </td>
                                  )
                                )}
                                <td
                                  className="category-total-amount"
                                  style={{
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {(() => {
                                    const counts = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map(
                                        (m) =>
                                          monthlyWorkStats[m]?.employeeCount ||
                                          monthlyWorkStats[m]?.count ||
                                          0
                                      )
                                      .filter((c) => c && c !== 0);
                                    return counts.length > 0
                                      ? Math.round(
                                          counts.reduce((a, b) => a + b, 0) /
                                            counts.length
                                        )
                                      : '-';
                                  })()}
                                </td>
                              </tr>
                            );

                            // 총 출근일수 행
                            allRows.push(
                              <tr key="total-workdays" className="data-row">
                                <td colSpan="2" className="category">
                                  총 출근일수
                                </td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="monthly-amount"
                                      style={{ textAlign: 'center' }}
                                    >
                                      {monthlyWorkStats[month]?.totalWorkdays ||
                                        monthlyWorkStats[month]?.workdays ||
                                        '-'}
                                    </td>
                                  )
                                )}
                                <td
                                  className="category-total-amount"
                                  style={{
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {(() => {
                                    const workdays = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map(
                                        (m) =>
                                          monthlyWorkStats[m]?.totalWorkdays ||
                                          monthlyWorkStats[m]?.workdays ||
                                          0
                                      )
                                      .filter((w) => w && w !== 0);
                                    return workdays.length > 0
                                      ? Math.round(
                                          workdays.reduce((a, b) => a + b, 0) /
                                            workdays.length
                                        )
                                      : '-';
                                  })()}
                                </td>
                              </tr>
                            );

                            // 총경비 - 일평균단가
                            allRows.push(
                              <tr
                                key="total-expense-daily-rate"
                                className="category-total-row"
                              >
                                <td className="category">총경비</td>
                                <td className="subcategory">일평균단가</td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="monthly-amount"
                                      style={{ textAlign: 'right' }}
                                    >
                                      {monthlyWorkStats[month]?.expenseDailyRate
                                        ? monthlyWorkStats[
                                            month
                                          ].expenseDailyRate.toLocaleString()
                                        : '-'}
                                    </td>
                                  )
                                )}
                                <td
                                  className="category-total-amount"
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {(() => {
                                    const rates = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map(
                                        (m) =>
                                          monthlyWorkStats[m]
                                            ?.expenseDailyRate || 0
                                      )
                                      .filter((r) => r && r !== 0);
                                    return rates.length > 0
                                      ? Math.round(
                                          rates.reduce((a, b) => a + b, 0) /
                                            rates.length
                                        ).toLocaleString()
                                      : '-';
                                  })()}
                                </td>
                              </tr>
                            );

                            // 총경비 - %
                            allRows.push(
                              <tr
                                key="total-expense-percentage"
                                className="data-row"
                              >
                                <td className="category"></td>
                                <td className="subcategory">%</td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => {
                                    const percentage =
                                      monthlyWorkStats[month]
                                        ?.expensePercentage;
                                    const percentageNum = percentage
                                      ? parseInt(percentage.toString())
                                      : 0;
                                    return (
                                      <td
                                        key={month}
                                        className="monthly-amount"
                                        style={{
                                          textAlign: 'center',
                                          color:
                                            percentageNum > 100
                                              ? 'red'
                                              : 'inherit',
                                        }}
                                      >
                                        {percentage || '-'}
                                      </td>
                                    );
                                  }
                                )}
                                <td className="category-total-amount">
                                  {(() => {
                                    const percentages = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map((m) => {
                                        const p =
                                          monthlyWorkStats[m]
                                            ?.expensePercentage;
                                        if (!p) return 0;
                                        // 백분율 문자열에서 숫자 추출
                                        const num = parseInt(p.toString());
                                        return num || 0;
                                      })
                                      .filter((p) => p && p !== 0);
                                    const avgPercentage =
                                      percentages.length > 0
                                        ? Math.round(
                                            percentages.reduce(
                                              (a, b) => a + b,
                                              0
                                            ) / percentages.length
                                          )
                                        : 0;
                                    return (
                                      <span
                                        style={{
                                          fontWeight: 'bold',
                                          color:
                                            avgPercentage > 100
                                              ? 'red'
                                              : 'inherit',
                                        }}
                                      >
                                        {percentages.length > 0
                                          ? avgPercentage + '%'
                                          : '-'}
                                      </span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );

                            // 총식사비 - 일평균단가
                            allRows.push(
                              <tr
                                key="total-meal-daily-rate"
                                className="category-total-row"
                              >
                                <td className="category">총식사비</td>
                                <td className="subcategory">일평균단가</td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => (
                                    <td
                                      key={month}
                                      className="monthly-amount"
                                      style={{ textAlign: 'right' }}
                                    >
                                      {monthlyWorkStats[month]?.mealDailyRate
                                        ? monthlyWorkStats[
                                            month
                                          ].mealDailyRate.toLocaleString()
                                        : '-'}
                                    </td>
                                  )
                                )}
                                <td
                                  className="category-total-amount"
                                  style={{
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {(() => {
                                    const rates = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map(
                                        (m) =>
                                          monthlyWorkStats[m]?.mealDailyRate ||
                                          0
                                      )
                                      .filter((r) => r && r !== 0);
                                    return rates.length > 0
                                      ? Math.round(
                                          rates.reduce((a, b) => a + b, 0) /
                                            rates.length
                                        ).toLocaleString()
                                      : '-';
                                  })()}
                                </td>
                              </tr>
                            );

                            // 총식사비 - %
                            allRows.push(
                              <tr
                                key="total-meal-percentage"
                                className="data-row"
                              >
                                <td className="category"></td>
                                <td className="subcategory">%</td>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                  (month) => {
                                    const percentage =
                                      monthlyWorkStats[month]?.mealPercentage;
                                    const percentageNum = percentage
                                      ? parseInt(percentage.toString())
                                      : 0;
                                    return (
                                      <td
                                        key={month}
                                        className="monthly-amount"
                                        style={{
                                          textAlign: 'center',
                                          color:
                                            percentageNum > 100
                                              ? 'red'
                                              : 'inherit',
                                        }}
                                      >
                                        {percentage || '-'}
                                      </td>
                                    );
                                  }
                                )}
                                <td className="category-total-amount">
                                  {(() => {
                                    const percentages = [
                                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                                    ]
                                      .map((m) => {
                                        const p =
                                          monthlyWorkStats[m]?.mealPercentage;
                                        if (!p) return 0;
                                        // 백분율 문자열에서 숫자 추출
                                        const num = parseInt(p.toString());
                                        return num || 0;
                                      })
                                      .filter((p) => p && p !== 0);
                                    const avgPercentage =
                                      percentages.length > 0
                                        ? Math.round(
                                            percentages.reduce(
                                              (a, b) => a + b,
                                              0
                                            ) / percentages.length
                                          )
                                        : 0;
                                    return (
                                      <span
                                        style={{
                                          fontWeight: 'bold',
                                          color:
                                            avgPercentage > 100
                                              ? 'red'
                                              : 'inherit',
                                        }}
                                      >
                                        {percentages.length > 0
                                          ? avgPercentage + '%'
                                          : '-'}
                                      </span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                            return allRows;
                          })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
