import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ExpenseSummary.css';
import { ClipLoader } from 'react-spinners';
import { useToast, useDialog } from '../../common/Toast';

/**
 * 경비 청구 집계 페이지
 * 월별로 마감된 경비 데이터만 표시
 * 관리자만 접근 가능
 */
export default function ExpenseSummary() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { showDialog } = useDialog();

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

  const [year, setYear] = useState(() => {
    const now = new Date();
    return now.getFullYear().toString();
  });
  const [closingData, setClosingData] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [specialItems, setSpecialItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManagerMode, setIsManagerMode] = useState(
    searchParams.get('mode') === 'manager'
  );
  const [factoryCode] = useState('F001'); // 예시, 실제로는 로그인 정보에서 가져옴
  const [currentUser] = useState('ADMIN'); // 예시, 실제로는 로그인 정보에서 가져옴

  // 마감 데이터 및 특별항목 조회
  useEffect(() => {
    loadSummaryData();
  }, [year]);

  const loadSummaryData = async () => {
    setIsLoading(true);
    try {
      // 목 데이터 (테스트용)
      const mockData = [
        // 1월 데이터
        {
          closingId: '1',
          monthYm: '2025-01',
          category: '점심(소담)',
          totalAmount: 1504800,
          closedAt: '2025-01-31',
        },
        {
          closingId: '2',
          monthYm: '2025-01',
          category: '저녁(소담)',
          totalAmount: 140800,
          closedAt: '2025-01-31',
        },
        {
          closingId: '3',
          monthYm: '2025-01',
          category: '점심',
          totalAmount: 949600,
          closedAt: '2025-01-31',
        },
        {
          closingId: '4',
          monthYm: '2025-01',
          category: '저녁',
          totalAmount: 69540,
          closedAt: '2025-01-31',
        },
        // 2월 데이터
        {
          closingId: '5',
          monthYm: '2025-02',
          category: '점심(소담)',
          totalAmount: 1443200,
          closedAt: '2025-02-28',
        },
        {
          closingId: '6',
          monthYm: '2025-02',
          category: '저녁(소담)',
          totalAmount: 132000,
          closedAt: '2025-02-28',
        },
        {
          closingId: '7',
          monthYm: '2025-02',
          category: '점심',
          totalAmount: 1228700,
          closedAt: '2025-02-28',
        },
        {
          closingId: '8',
          monthYm: '2025-02',
          category: '저녁',
          totalAmount: 207000,
          closedAt: '2025-02-28',
        },
        // 3월 데이터
        {
          closingId: '9',
          monthYm: '2025-03',
          category: '점심(소담)',
          totalAmount: 1416800,
          closedAt: '2025-03-31',
        },
        {
          closingId: '10',
          monthYm: '2025-03',
          category: '저녁(소담)',
          totalAmount: 88000,
          closedAt: '2025-03-31',
        },
        {
          closingId: '11',
          monthYm: '2025-03',
          category: '점심',
          totalAmount: 1402600,
          closedAt: '2025-03-31',
        },
        {
          closingId: '12',
          monthYm: '2025-03',
          category: '저녁',
          totalAmount: 242900,
          closedAt: '2025-03-31',
        },
        // 4월 데이터
        {
          closingId: '13',
          monthYm: '2025-04',
          category: '점심(소담)',
          totalAmount: 1232000,
          closedAt: '2025-04-30',
        },
        {
          closingId: '14',
          monthYm: '2025-04',
          category: '저녁(소담)',
          totalAmount: 140800,
          closedAt: '2025-04-30',
        },
        {
          closingId: '15',
          monthYm: '2025-04',
          category: '점심',
          totalAmount: 1429200,
          closedAt: '2025-04-30',
        },
        {
          closingId: '16',
          monthYm: '2025-04',
          category: '저녁',
          totalAmount: 269850,
          closedAt: '2025-04-30',
        },
        // 5월 데이터
        {
          closingId: '17',
          monthYm: '2025-05',
          category: '점심(소담)',
          totalAmount: 862400,
          closedAt: '2025-05-31',
        },
        {
          closingId: '18',
          monthYm: '2025-05',
          category: '저녁(소담)',
          totalAmount: 114400,
          closedAt: '2025-05-31',
        },
        {
          closingId: '19',
          monthYm: '2025-05',
          category: '점심',
          totalAmount: 1377600,
          closedAt: '2025-05-31',
        },
        {
          closingId: '20',
          monthYm: '2025-05',
          category: '저녁',
          totalAmount: 156000,
          closedAt: '2025-05-31',
        },
        // 6월 데이터
        {
          closingId: '21',
          monthYm: '2025-06',
          category: '점심(소담)',
          totalAmount: 695200,
          closedAt: '2025-06-30',
        },
        {
          closingId: '22',
          monthYm: '2025-06',
          category: '저녁(소담)',
          totalAmount: 105600,
          closedAt: '2025-06-30',
        },
        {
          closingId: '23',
          monthYm: '2025-06',
          category: '점심',
          totalAmount: 972600,
          closedAt: '2025-06-30',
        },
        {
          closingId: '24',
          monthYm: '2025-06',
          category: '저녁',
          totalAmount: 213800,
          closedAt: '2025-06-30',
        },
        // 7월 데이터
        {
          closingId: '25',
          monthYm: '2025-07',
          category: '점심(소담)',
          totalAmount: 985600,
          closedAt: '2025-07-31',
        },
        {
          closingId: '26',
          monthYm: '2025-07',
          category: '저녁(소담)',
          totalAmount: 52800,
          closedAt: '2025-07-31',
        },
        {
          closingId: '27',
          monthYm: '2025-07',
          category: '점심(세종)',
          totalAmount: 342000,
          closedAt: '2025-07-31',
        },
        {
          closingId: '28',
          monthYm: '2025-07',
          category: '저녁(세종)',
          totalAmount: 27000,
          closedAt: '2025-07-31',
        },
        {
          closingId: '29',
          monthYm: '2025-07',
          category: '점심',
          totalAmount: 1286800,
          closedAt: '2025-07-31',
        },
        {
          closingId: '30',
          monthYm: '2025-07',
          category: '저녁',
          totalAmount: 222200,
          closedAt: '2025-07-31',
        },
        // 8월 데이터
        {
          closingId: '31',
          monthYm: '2025-08',
          category: '점심(소담)',
          totalAmount: 712800,
          closedAt: '2025-08-31',
        },
        {
          closingId: '32',
          monthYm: '2025-08',
          category: '저녁(소담)',
          totalAmount: 35200,
          closedAt: '2025-08-31',
        },
        {
          closingId: '33',
          monthYm: '2025-08',
          category: '점심(세종)',
          totalAmount: 288000,
          closedAt: '2025-08-31',
        },
        {
          closingId: '34',
          monthYm: '2025-08',
          category: '저녁(세종)',
          totalAmount: 72000,
          closedAt: '2025-08-31',
        },
        {
          closingId: '35',
          monthYm: '2025-08',
          category: '점심',
          totalAmount: 1175100,
          closedAt: '2025-08-31',
        },
        {
          closingId: '36',
          monthYm: '2025-08',
          category: '저녁',
          totalAmount: 173400,
          closedAt: '2025-08-31',
        },
        // 9월 데이터
        {
          closingId: '37',
          monthYm: '2025-09',
          category: '점심(소담)',
          totalAmount: 1003200,
          closedAt: '2025-09-30',
        },
        {
          closingId: '38',
          monthYm: '2025-09',
          category: '저녁(소담)',
          totalAmount: 8800,
          closedAt: '2025-09-30',
        },
        {
          closingId: '39',
          monthYm: '2025-09',
          category: '점심(세종)',
          totalAmount: 288000,
          closedAt: '2025-09-30',
        },
        {
          closingId: '40',
          monthYm: '2025-09',
          category: '저녁(세종)',
          totalAmount: 144000,
          closedAt: '2025-09-30',
        },
        {
          closingId: '41',
          monthYm: '2025-09',
          category: '점심',
          totalAmount: 1473550,
          closedAt: '2025-09-30',
        },
        {
          closingId: '42',
          monthYm: '2025-09',
          category: '저녁',
          totalAmount: 126200,
          closedAt: '2025-09-30',
        },
        // 10월 데이터
        {
          closingId: '43',
          monthYm: '2025-10',
          category: '점심(소담)',
          totalAmount: 563200,
          closedAt: '2025-10-31',
        },
        {
          closingId: '44',
          monthYm: '2025-10',
          category: '저녁(소담)',
          totalAmount: 17600,
          closedAt: '2025-10-31',
        },
        {
          closingId: '45',
          monthYm: '2025-10',
          category: '점심(세종)',
          totalAmount: 252000,
          closedAt: '2025-10-31',
        },
        {
          closingId: '46',
          monthYm: '2025-10',
          category: '저녁(세종)',
          totalAmount: 18000,
          closedAt: '2025-10-31',
        },
        {
          closingId: '47',
          monthYm: '2025-10',
          category: '점심',
          totalAmount: 1166600,
          closedAt: '2025-10-31',
        },
        {
          closingId: '48',
          monthYm: '2025-10',
          category: '저녁',
          totalAmount: 48000,
          closedAt: '2025-10-31',
        },
        // 11월 데이터
        {
          closingId: '49',
          monthYm: '2025-11',
          category: '점심(소담)',
          totalAmount: 739200,
          closedAt: '2025-11-30',
        },
        {
          closingId: '50',
          monthYm: '2025-11',
          category: '저녁(소담)',
          totalAmount: 17600,
          closedAt: '2025-11-30',
        },
        {
          closingId: '51',
          monthYm: '2025-11',
          category: '점심(세종)',
          totalAmount: 342000,
          closedAt: '2025-11-30',
        },
        {
          closingId: '52',
          monthYm: '2025-11',
          category: '점심',
          totalAmount: 718800,
          closedAt: '2025-11-30',
        },
        {
          closingId: '53',
          monthYm: '2025-11',
          category: '저녁',
          totalAmount: 39600,
          closedAt: '2025-11-30',
        },
        // 1월 데이터 - 비식비
        {
          closingId: '54',
          monthYm: '2025-01',
          category: '여비',
          totalAmount: 106860,
          closedAt: '2025-01-31',
        },
        {
          closingId: '55',
          monthYm: '2025-01',
          category: '회식비',
          totalAmount: 63400,
          closedAt: '2025-01-31',
        },
        {
          closingId: '56',
          monthYm: '2025-01',
          category: '회의비',
          totalAmount: 33000,
          closedAt: '2025-01-31',
        },
        {
          closingId: '57',
          monthYm: '2025-01',
          category: '공공요금',
          totalAmount: 5620,
          closedAt: '2025-01-31',
        },
        {
          closingId: '58',
          monthYm: '2025-01',
          category: '기타',
          totalAmount: 667850,
          closedAt: '2025-01-31',
        },
        // 2월 데이터 - 비식비
        {
          closingId: '59',
          monthYm: '2025-02',
          category: '여비',
          totalAmount: 223170,
          closedAt: '2025-02-28',
        },
        {
          closingId: '60',
          monthYm: '2025-02',
          category: '회의비',
          totalAmount: 53200,
          closedAt: '2025-02-28',
        },
        {
          closingId: '61',
          monthYm: '2025-02',
          category: '공공요금',
          totalAmount: 2860,
          closedAt: '2025-02-28',
        },
        {
          closingId: '62',
          monthYm: '2025-02',
          category: '기타',
          totalAmount: 890369,
          closedAt: '2025-02-28',
        },
        // 3월 데이터 - 비식비
        {
          closingId: '63',
          monthYm: '2025-03',
          category: '여비',
          totalAmount: 211260,
          closedAt: '2025-03-31',
        },
        {
          closingId: '64',
          monthYm: '2025-03',
          category: '회식비',
          totalAmount: 196300,
          closedAt: '2025-03-31',
        },
        {
          closingId: '65',
          monthYm: '2025-03',
          category: '회의비',
          totalAmount: 22000,
          closedAt: '2025-03-31',
        },
        {
          closingId: '66',
          monthYm: '2025-03',
          category: '기타',
          totalAmount: 1597800,
          closedAt: '2025-03-31',
        },
        // 4월 데이터 - 비식비
        {
          closingId: '67',
          monthYm: '2025-04',
          category: '여비',
          totalAmount: 185670,
          closedAt: '2025-04-30',
        },
        {
          closingId: '68',
          monthYm: '2025-04',
          category: '회식비',
          totalAmount: 141200,
          closedAt: '2025-04-30',
        },
        {
          closingId: '69',
          monthYm: '2025-04',
          category: '공공요금',
          totalAmount: 3000,
          closedAt: '2025-04-30',
        },
        {
          closingId: '70',
          monthYm: '2025-04',
          category: '기타',
          totalAmount: 1129300,
          closedAt: '2025-04-30',
        },
        // 5월 데이터 - 비식비
        {
          closingId: '71',
          monthYm: '2025-05',
          category: '여비',
          totalAmount: 278660,
          closedAt: '2025-05-31',
        },
        {
          closingId: '72',
          monthYm: '2025-05',
          category: '회식비',
          totalAmount: 132500,
          closedAt: '2025-05-31',
        },
        {
          closingId: '73',
          monthYm: '2025-05',
          category: '공공요금',
          totalAmount: 3620,
          closedAt: '2025-05-31',
        },
        {
          closingId: '74',
          monthYm: '2025-05',
          category: '기타',
          totalAmount: 650000,
          closedAt: '2025-05-31',
        },
        // 6월 데이터 - 비식비
        {
          closingId: '75',
          monthYm: '2025-06',
          category: '여비',
          totalAmount: 480960,
          closedAt: '2025-06-30',
        },
        {
          closingId: '76',
          monthYm: '2025-06',
          category: '회식비',
          totalAmount: 82000,
          closedAt: '2025-06-30',
        },
        {
          closingId: '77',
          monthYm: '2025-06',
          category: '회의비',
          totalAmount: 70100,
          closedAt: '2025-06-30',
        },
        {
          closingId: '78',
          monthYm: '2025-06',
          category: '기타',
          totalAmount: 1284400,
          closedAt: '2025-06-30',
        },
        // 7월 데이터 - 비식비
        {
          closingId: '79',
          monthYm: '2025-07',
          category: '여비',
          totalAmount: 440310,
          closedAt: '2025-07-31',
        },
        {
          closingId: '80',
          monthYm: '2025-07',
          category: '회의비',
          totalAmount: 45800,
          closedAt: '2025-07-31',
        },
        {
          closingId: '81',
          monthYm: '2025-07',
          category: '공공요금',
          totalAmount: 5970,
          closedAt: '2025-07-31',
        },
        {
          closingId: '82',
          monthYm: '2025-07',
          category: '기타',
          totalAmount: 895700,
          closedAt: '2025-07-31',
        },
        // 8월 데이터 - 비식비
        {
          closingId: '83',
          monthYm: '2025-08',
          category: '여비',
          totalAmount: 370290,
          closedAt: '2025-08-31',
        },
        {
          closingId: '84',
          monthYm: '2025-08',
          category: '회의비',
          totalAmount: 41213,
          closedAt: '2025-08-31',
        },
        {
          closingId: '85',
          monthYm: '2025-08',
          category: '기타',
          totalAmount: 751200,
          closedAt: '2025-08-31',
        },
        // 9월 데이터 - 비식비
        {
          closingId: '86',
          monthYm: '2025-09',
          category: '여비',
          totalAmount: 425190,
          closedAt: '2025-09-30',
        },
        {
          closingId: '87',
          monthYm: '2025-09',
          category: '기타',
          totalAmount: 684200,
          closedAt: '2025-09-30',
        },
        // 10월 데이터 - 비식비
        {
          closingId: '88',
          monthYm: '2025-10',
          category: '여비',
          totalAmount: 252830,
          closedAt: '2025-10-31',
        },
        {
          closingId: '89',
          monthYm: '2025-10',
          category: '회식비',
          totalAmount: 142900,
          closedAt: '2025-10-31',
        },
        {
          closingId: '90',
          monthYm: '2025-10',
          category: '회의비',
          totalAmount: 85000,
          closedAt: '2025-10-31',
        },
        {
          closingId: '91',
          monthYm: '2025-10',
          category: '공공요금',
          totalAmount: 19060,
          closedAt: '2025-10-31',
        },
        {
          closingId: '92',
          monthYm: '2025-10',
          category: '기타',
          totalAmount: 926074,
          closedAt: '2025-10-31',
        },
        // 11월 데이터 - 비식비
        {
          closingId: '93',
          monthYm: '2025-11',
          category: '여비',
          totalAmount: 75700,
          closedAt: '2025-11-30',
        },
        {
          closingId: '94',
          monthYm: '2025-11',
          category: '기타',
          totalAmount: 1311600,
          closedAt: '2025-11-30',
        },
      ];

      setClosingData(mockData);
      setMonthlyData({});
      setSpecialItems([]);
    } catch (error) {
      console.error('Error:', error);
      showToast('데이터 조회 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 마감 처리
  const handleCloseExpense = async (closingId) => {
    showDialog({
      title: '마감 처리 확인',
      message: '선택한 경비를 마감 처리하시겠습니까?',
      buttons: [
        {
          text: '마감',
          onClick: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/expense-closing`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    closingId,
                    closedBy: currentUser,
                  }),
                }
              );

              const data = await response.json();

              if (data.success) {
                showToast(data.message, 'success');
                loadSummaryData();
              } else {
                showToast(data.message || '마감에 실패했습니다.', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showToast('마감 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  // 마감 재개
  const handleReopenClosing = async (closingId) => {
    showDialog({
      title: '마감 재개 확인',
      message: '선택한 경비의 마감을 재개하시겠습니까?',
      buttons: [
        {
          text: '재개',
          onClick: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/expense-closing`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    closingId,
                    reopenedBy: currentUser,
                  }),
                }
              );

              const data = await response.json();

              if (data.success) {
                showToast(data.message, 'success');
                loadSummaryData();
              } else {
                showToast(data.message || '재개에 실패했습니다.', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showToast('재개 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  // 부서별 합계 계산
  const getDepartmentSummary = () => {
    const summary = {};
    closingData.forEach((item) => {
      if (!summary[item.department]) {
        summary[item.department] = {
          totalExpense: 0,
          fuelExpense: 0,
          specialItemExpense: 0,
          totalAmount: 0,
          count: 0,
        };
      }
      summary[item.department].totalExpense += item.totalExpense;
      summary[item.department].fuelExpense += item.fuelExpense;
      summary[item.department].specialItemExpense += item.specialItemExpense;
      summary[item.department].totalAmount += item.totalAmount;
      summary[item.department].count += 1;
    });
    return summary;
  };

  // 월별 카테고리 데이터 집계 (이미지 형식)
  const getMonthlyByCategoryData = () => {
    const categories = {};
    const categoryOrder = {}; // 카테고리 순서 유지용

    // 모든 마감 데이터에서 카테고리 정보 수집
    closingData.forEach((item) => {
      // expenseDetails가 있다면 JSON 파싱, 아니면 기본값
      let itemCategory = item.category || '기타';
      let mainCategory = '비식비';
      let subCategory = '기타';

      // categoryMapping에서 매핑 정보 찾기
      if (categoryMapping[itemCategory]) {
        mainCategory = categoryMapping[itemCategory].main;
        subCategory = categoryMapping[itemCategory].sub;
      } else {
        // 매핑이 없으면 카테고리를 그대로 사용
        mainCategory = itemCategory;
        subCategory = itemCategory;
      }

      // 메인 카테고리 초기화
      if (!categories[mainCategory]) {
        categories[mainCategory] = {};
        categoryOrder[mainCategory] = Object.keys(categoryOrder).length;
      }

      // 세목별 데이터
      if (!categories[mainCategory][subCategory]) {
        categories[mainCategory][subCategory] = {
          mainCategory,
          subCategory,
          monthly: {},
          total: 0,
          budget: 0,
        };
      }

      // 월별 데이터 집계
      const itemMonth = item.closedAt
        ? parseInt(item.closedAt.split('-')[1])
        : 0;
      if (itemMonth > 0 && itemMonth <= 12) {
        if (!categories[mainCategory][subCategory].monthly[itemMonth]) {
          categories[mainCategory][subCategory].monthly[itemMonth] = 0;
        }
        categories[mainCategory][subCategory].monthly[itemMonth] +=
          item.totalAmount;
        categories[mainCategory][subCategory].total += item.totalAmount;
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
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((month) => {
          if (!categoryTotals[category].monthly[month]) {
            categoryTotals[category].monthly[month] = 0;
          }
          categoryTotals[category].monthly[month] += data.monthly[month] || 0;
          categoryTotals[category].total += data.monthly[month] || 0;

          if (!monthlyGrandTotal[month]) {
            monthlyGrandTotal[month] = 0;
          }
          monthlyGrandTotal[month] += data.monthly[month] || 0;
        });
      });
    });

    return { categoryTotals, monthlyGrandTotal };
  };

  // 전체 합계
  const getGrandTotal = () => {
    return {
      totalExpense: closingData.reduce(
        (sum, item) => sum + item.totalExpense,
        0
      ),
      fuelExpense: closingData.reduce((sum, item) => sum + item.fuelExpense, 0),
      specialItemExpense: closingData.reduce(
        (sum, item) => sum + item.specialItemExpense,
        0
      ),
      totalAmount: closingData.reduce((sum, item) => sum + item.totalAmount, 0),
    };
  };

  // 특별항목 부서별 합계
  const getSpecialItemsByDepartment = () => {
    const grouped = {};
    specialItems.forEach((item) => {
      if (!grouped[item.department]) {
        grouped[item.department] = 0;
      }
      grouped[item.department] += item.amount;
    });
    return grouped;
  };

  if (!isManagerMode) {
    return (
      <div className="summary-error">
        <h2>접근 권한이 없습니다</h2>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
        <button onClick={() => navigate('/works')}>돌아가기</button>
      </div>
    );
  }

  const deptSummary = getDepartmentSummary();
  const grandTotal = getGrandTotal();
  const specialItemsDept = getSpecialItemsByDepartment();

  return (
    <>
      <Helmet>
        <title>경비 청구 집계</title>
      </Helmet>

      <div className="expense-container">
        <section className="expenseSummary-content">
          <header className="expense-header">
            <div className="header-left">
              <h1>경비 청구 집계</h1>
            </div>
            <div className="header-right">
              <div className="year-selector">
                <label>조회 년도:</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2020"
                  max="2099"
                />
              </div>
              <button
                className="btn-special-items"
                onClick={() => navigate('/works/special-items?mode=manager')}
              >
                특별 항목 관리
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="loading-container">
              <ClipLoader size={50} color="#667eea" />
            </div>
          ) : (
            <>
              {/* 월별 카테고리 집계 */}
              {closingData.length === 0 ? (
                <div className="no-data">
                  <p>{year}년에 마감된 경비가 없습니다.</p>
                </div>
              ) : (
                <>
                  <section className="expense-section">
                    <h2 className="section-title">{year}년 경비 청구 집계</h2>
                    <div className="expense-table-container yearly-table">
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
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const { categories, categoryOrder } =
                              getMonthlyByCategoryData();
                            const { categoryTotals, monthlyGrandTotal } =
                              getCategoryMonthlyTotals();
                            const rows = [];

                            // 각 카테고리별 처리
                            Object.entries(categories)
                              .sort(
                                ([catA], [catB]) =>
                                  categoryOrder[catA] - categoryOrder[catB]
                              )
                              .forEach(([category, subcategories]) => {
                                // 세목 행
                                Object.entries(subcategories).forEach(
                                  ([subcategory, data]) => {
                                    rows.push(
                                      <tr
                                        key={`${category}-${subcategory}`}
                                        className="data-row"
                                      >
                                        <td className="category">{category}</td>
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
                                      </tr>
                                    );
                                  }
                                );

                                // 카테고리 소계 행
                                rows.push(
                                  <tr
                                    key={`${category}-total`}
                                    className="category-total-row"
                                  >
                                    <td colSpan="2" className="category-total">
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
                                  </tr>
                                );
                              });

                            // 전체 합계 행
                            rows.push(
                              <tr key="grand-total" className="grand-total-row">
                                <td colSpan="2" className="grand-total">
                                  합계
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
                              </tr>
                            );

                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
