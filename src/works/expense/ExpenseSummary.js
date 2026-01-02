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
import AnalysisBanner from './components/AnalysisBanner';
import { generateAnalysisComment } from './ai/expenseAnalyzer';
import YearSelector from './components/YearSelector';
import HeaderActions from './components/HeaderActions';
import EmptyState from './components/EmptyState';
import SkeletonLoader from './components/SkeletonLoader';
import { parseYearFromUrl, createShareLink } from './utils/linkUtils';
import {
  getMonthlyByCategoryData,
  getCategoryMonthlyTotals,
  getExpenseDepositTotal,
  categoryMapping,
} from './utils/dataCalculations';

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
  const { year: initialYear, isValid: isValidYear } =
    parseYearFromUrl(encodedYear);

  const [year, setYear] = useState(() => {
    // 세션스토리지에서 저장된 년도 확인
    const savedYear = window.sessionStorage.getItem('selectedYear');
    return savedYear || initialYear;
  });

  // 링크 생성 함수
  const handleCreateLink = () => {
    createShareLink(year, showToast);
  };

  // 년도 변경시 세션스토리지에 저장
  useEffect(() => {
    window.sessionStorage.setItem('selectedYear', year);
  }, [year]);
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
  const [userId, setUserId] = useState('');

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
        // showToast('유효하지 않은 링크입니다.', 'error');
        navigate('/notfound');
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

      // 세션 사용자 설정 후 데이터 로드
      setUserId(sessionUser);
      setAuthChecked(true);
    })();
    // eslint-disable-next-line
  }, [navigate, showToast]);

  // userId가 설정되면 데이터 로드
  useEffect(() => {
    if (!userId || !authChecked) {
      return;
    }

    if (!didFetch.current) {
      loadSummaryData(userId);
      didFetch.current = true;
    }
    // eslint-disable-next-line
  }, [userId, authChecked]);

  // year가 변경되면 데이터 다시 로드
  useEffect(() => {
    if (!didFetch.current || !userId) {
      return;
    }
    loadSummaryData(userId);
    // eslint-disable-next-line
  }, [year]);

  const loadSummaryData = async (userIdParam) => {
    const currentUserId = userIdParam || userId;
    if (!currentUserId) {
      return;
    }
    setIsLoading(true);
    try {
      // 승인된 경비 데이터 집계 조회
      const aggregationData = await getExpenseAggregationByYear(
        factoryCode,
        year,
        decodeUserId(currentUserId)
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
          decodeUserId(currentUserId)
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
          getExpenseAggregationByUser(
            factoryCode,
            m,
            decodeUserId(currentUserId)
          )
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
        decodeUserId(currentUserId)
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
        userAggregated,
        year
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
              <YearSelector
                year={year}
                onYearChange={setYear}
                disabled={isSharedLink}
              />
              <HeaderActions
                isSharedLink={isSharedLink}
                year={year}
                onCreateLink={handleCreateLink}
              />
            </div>
          </header>

          <AnalysisBanner comment={analysisComment} isLoading={isLoading} />

          {closingData.length === 0 && !isLoading ? (
            <EmptyState year={year} />
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
                      {isLoading ? (
                        <SkeletonLoader columnCount={16} />
                      ) : (
                        (() => {
                          const allRows = [];

                          // ========== 1. 년별 집계 섹션 ==========
                          const { categories, categoryOrder } =
                            getMonthlyByCategoryData(closingData);
                          const { categoryTotals, monthlyGrandTotal } =
                            getCategoryMonthlyTotals(closingData);

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
                              subItems.forEach(([subcategory, data], index) => {
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
                              });

                              // 카테고리 소계 행
                              allRows.push(
                                <tr
                                  key={`${category}-total`}
                                  className="category-total-row"
                                >
                                  <td className="category-total">
                                    {category}합계
                                  </td>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
                                    (month) => (
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
                                    )
                                  )}
                                  <td style={{ backgroundColor: '#f9f9f9' }} />
                                  <td style={{ backgroundColor: '#f9f9f9' }} />
                                </tr>
                              );
                            });

                          // 합계(경비입금) 행
                          const expenseDepositTotal =
                            getExpenseDepositTotal(closingData);
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
                          const entries = Object.entries(userMonthlyData).sort(
                            ([aName, aData], [bName, bData]) => {
                              const statusOrder = (s) =>
                                s === '재직자' ? 0 : 1;
                              const diff =
                                statusOrder(aData.status) -
                                statusOrder(bData.status);
                              if (diff !== 0) return diff;
                              return aName.localeCompare(bName);
                            }
                          );

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
                                    <td key={month} className="monthly-amount">
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
                                {Math.round(overallTotal / 12).toLocaleString()}
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
                                        monthlyWorkStats[m]?.expenseDailyRate ||
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
                                    monthlyWorkStats[month]?.expensePercentage;
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
                                        monthlyWorkStats[m]?.expensePercentage;
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
                                        monthlyWorkStats[m]?.mealDailyRate || 0
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
                        })()
                      )}
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
