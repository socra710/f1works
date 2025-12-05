import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './Expense.css';
import { ClipLoader } from 'react-spinners';
import { useToast, useDialog } from '../common/Toast';

const categories = [
  { code: 'LUNCH', name: '점심' },
  { code: 'DINNER', name: '저녁' },
  { code: 'PARTY', name: '회식비' },
  { code: 'MEETING', name: '회의비' },
  { code: 'UTILITY', name: '공공요금' },
  { code: 'ETC', name: '기타' },
];
const fuelTypes = [
  { name: '휘발유', price: 1663, efficiency: 12.8 },
  { name: '경유', price: 1536, efficiency: 12.8 },
  { name: 'LPG', price: 999, efficiency: 12.8 },
];
const maintenanceRate = 1.2;

export default function Expense() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  // 일반 유저: /expense (월 기준 조회) 또는 /expense/:expenseId (ID 기준 조회)
  // 관리자: ?mode=manager 쿼리파라미터로 관리자 모드 활성화
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isManagerMode = searchParams.get('mode') === 'manager';
  const { showToast } = useToast();
  const { showDialog } = useDialog();

  // expenseId가 있으면 ID 기준 조회, 없으면 월 기준 조회
  const isIdBasedQuery = !!expenseId;

  const [month, setMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('DRAFT');
  const [managerChecked, setManagerChecked] = useState(false);
  const [rows, setRows] = useState([
    {
      rowId: null, // 서버에서 받은 행 ID
      type: 'expense', // 'expense' or 'fuel'
      category: '',
      date: '',
      description: '',
      amount: '',
      people: 1,
      fuelType: '휘발유',
      distance: '',
      tollFee: '',
      file: null,
      fileName: '',
      managerConfirmed: false, // 관리자 확인 여부
    },
  ]);

  // 인증 및 초기화
  useEffect(() => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
      navigator.userAgent
    );
    setTimeout(() => {
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }
      initializeExpense(sessionUser);
    }, 1000);
    // eslint-disable-next-line
  }, [navigate, expenseId]);

  // 임시 저장 데이터 체크 함수
  const checkAndLoadTempData = (month, userId) => {
    const tempKey = `expense_temp_${month}_${userId}`;
    const tempData = localStorage.getItem(tempKey);

    if (tempData) {
      try {
        const parsed = JSON.parse(tempData);
        if (
          window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')
        ) {
          setMemo(parsed.memo || '');
          setStatus(parsed.status || 'DRAFT');
          setManagerChecked(!!parsed.managerChecked);
          setRows(
            parsed.rows?.map((row) => ({
              rowId: row.rowId || null,
              type:
                row.type || (row.category === '유류비' ? 'fuel' : 'expense'),
              category: row.category === '유류비' ? 'FUEL' : row.category || '',
              date: row.date || '',
              description: row.description || '',
              amount:
                row.type && row.type === 'fuel'
                  ? ''
                  : row.amount
                  ? formatWithCommas(row.amount)
                  : '',
              people: row.people || 1,
              fuelType: row.fuelType || '휘발유',
              distance: row.distance || '',
              tollFee:
                row.type && row.type === 'fuel'
                  ? row.tollFee
                    ? formatWithCommas(row.tollFee)
                    : ''
                  : '',
              file: null,
              fileName: row.fileName || '',
              managerConfirmed: row.managerConfirmed || false,
            })) || [
              {
                rowId: null,
                type: 'expense',
                category: '',
                date: '',
                description: '',
                amount: '',
                people: 1,
                fuelType: '휘발유',
                distance: '',
                tollFee: '',
                file: null,
                fileName: '',
                managerConfirmed: false,
              },
            ]
          );
          return true; // 임시 데이터 로드됨
        }
      } catch (e) {
        console.error('임시 저장 데이터 로드 실패:', e);
      }
    }
    return false; // 임시 데이터 없음 또는 거부
  };

  // 경비청구 초기화
  const initializeExpense = (user) => {
    // expenseId가 있으면 ID 기준, 없으면 월 기준 조회
    if (isIdBasedQuery) {
      // ID 기준 조회: expenseId로 조회
      setUserId(user);
      fetchExpenseData(null, user, expenseId);
    } else {
      // 월 기준 조회: 이전 월을 기본값으로 설정 (경비는 지난달 기준)
      const now = new Date();
      now.setMonth(now.getMonth() - 1); // 한 달 이전으로 설정
      const year = now.getFullYear();
      const monthValue = String(now.getMonth() + 1).padStart(2, '0');
      const targetMonth = `${year}${monthValue}`;
      const formattedMonth = `${targetMonth.slice(0, 4)}-${targetMonth.slice(
        4,
        6
      )}`;

      setMonth(formattedMonth);
      setUserId(user);
      fetchExpenseData(formattedMonth, user, null);
    }
  };

  // 숫자 포맷/파싱 유틸
  const formatWithCommas = (value) => {
    const num = String(value).replace(/[^0-9]/g, '');
    if (!num) return '';
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const unformatToInt = (value) => {
    const num = String(value).replace(/[^0-9]/g, '');
    return num ? parseInt(num, 10) : 0;
  };

  // 입력 가능 여부 확인 (매니저 모드 제출 상태는 수정 가능, COMPLETED는 비활성화)
  const isInputDisabled = () => {
    // COMPLETED 상태는 항상 비활성화
    if (status === 'COMPLETED') return true;

    if (isManagerMode) {
      // 매니저 모드에서 관리팀 확인 전이면 제출 상태도 수정 가능
      if (status === 'SUBMITTED' && !managerChecked) return false;
      return managerChecked;
    }
    return managerChecked || !(status === 'DRAFT' || status === 'REJECTED');
  };

  // 금액/통행료 입력 핸들러 (실시간 입력은 숫자만, 포맷은 blur에서 적용)
  const handleMoneyChange = (idx, key, raw) => {
    // 숫자만 허용, 빈 값 허용
    const cleaned = String(raw).replace(/[^0-9]/g, '');
    const updated = [...rows];
    updated[idx][key] = cleaned; // 실시간 콤마 없이 저장
    setRows(updated);
  };

  const handleMoneyBlur = (idx, key) => {
    const updated = [...rows];
    updated[idx][key] = formatWithCommas(updated[idx][key]);
    setRows(updated);
  };

  /** 경비 데이터 조회 */
  const fetchExpenseData = async (month, userId, expenseId) => {
    if (!userId) return;

    setIsLoading(true);
    let serverDataLoaded = false;

    try {
      let url;

      // ID 기준 조회 또는 월 기준 조회
      if (expenseId) {
        // ID 기준 조회
        url = `${API_BASE_URL}/jvWorksGetExpense?factoryCode=000001&expenseId=${expenseId}&userId=${atob(
          userId
        )}`;
        // 관리자 모드인 경우 manager 파라미터 추가
        if (isManagerMode) {
          url += '&manager=true';
        }
      } else {
        // 월 기준 조회
        if (!month) return;
        url = `${API_BASE_URL}/jvWorksGetExpense?factoryCode=000001&month=${month}&userId=${atob(
          userId
        )}`;
        // 관리자 모드인 경우 manager 파라미터 추가
        if (isManagerMode) {
          url += '&manager=true';
        }
      }

      const response = await fetch(url);

      if (!response.ok) {
        // 401 / 403 : 권한 없음
        if (response.status === 403 || response.status === 401) {
          showToast('해당 사용자는 접근할 수 없는 페이지입니다.', 'warning');
          navigate('/works');
          return;
        }

        // 백엔드에서 JSON 에러 메시지를 내려준 경우 처리
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            showToast(errorData.message, 'error');
            return;
          }
        } catch (e) {
          // JSON 파싱 실패 → 무시하고 아래 공통 에러 처리
        }

        // 공통 에러 처리
        throw new Error('Failed to fetch expense data');
      }

      const result = await response.json();

      // API 응답 확인
      if (result.success === 'true' && result.data) {
        const data = result.data;

        // 조회된 데이터가 있으면 (제출된 데이터 또는 임시저장된 서버 데이터)
        if (data.rows && data.rows.length > 0) {
          setUserName(data.userName);
          setMemo(data.memo || '');
          setStatus(data.status || 'DRAFT');
          setManagerChecked(!!data.managerChecked);

          // month가 설정되지 않았다면 (ID 기준 조회인 경우) 월 정보 설정
          if (!month && data.month) {
            setMonth(data.month);
          }

          setRows(
            data.rows.map((row) => ({
              rowId: row.rowId || null,
              type:
                row.type || (row.category === '유류비' ? 'fuel' : 'expense'),
              category: row.category === '유류비' ? 'FUEL' : row.category || '',
              date: row.date || '',
              description: row.description || '',
              amount:
                row.type && row.type === 'fuel'
                  ? ''
                  : row.amount
                  ? formatWithCommas(row.amount)
                  : '',
              people: row.people || 1,
              fuelType: row.fuelType || '휘발유',
              distance: row.distance || '',
              tollFee:
                row.type && row.type === 'fuel'
                  ? row.tollFee
                    ? formatWithCommas(row.tollFee)
                    : ''
                  : '',
              file: null,
              fileName: row.fileName || '',
              managerConfirmed: row.managerConfirmed || false,
            }))
          );

          serverDataLoaded = true;
          setIsLoading(false);
          return; // 서버 데이터가 있으면 임시 저장 데이터 체크 안 함
        }

        // 기본 사용자 정보 설정 (서버에서 받아야 함)
        setUserName(data?.userName || '사용자');
        setStatus(data?.status || 'DRAFT');
        setManagerChecked(!!data?.managerChecked);
      }
    } catch (error) {
      console.error('경비 데이터 조회 실패:', error);
    }

    // 서버 데이터가 없으면 임시 저장 데이터 체크 (월 기준 조회일 때만)
    if (!serverDataLoaded && month) {
      // 해당 월의 1일로 기본값 설정 (예: 2025-11-01)
      const [year, monthStr] = month.split('-');
      const defaultDate = `${year}-${monthStr}-01`;

      const tempLoaded = checkAndLoadTempData(month, userId);

      // 임시 저장 데이터도 없으면 기본 빈 폼 설정
      if (!tempLoaded) {
        setMemo('');
        setRows([
          {
            rowId: null,
            type: 'expense',
            category: '',
            date: defaultDate,
            description: '',
            amount: '',
            people: 1,
            file: null,
            fileName: '',
            managerConfirmed: false,
          },
        ]);
      }
    }

    setIsLoading(false);
  };

  // 지급액 계산 함수
  const calcPay = (row) => {
    if (row.type === 'fuel') {
      const fuelPay = calcFuelPay(row.fuelType, row.distance);
      const toll = unformatToInt(row.tollFee);
      return fuelPay + toll;
    }
    const amt = unformatToInt(row.amount);
    const cnt = parseInt(row.people) || 1;
    if (cnt === 1) return Math.min(amt, 8000);
    return Math.min(amt, 8000 * cnt);
  };

  // 유류비 계산 함수
  const calcFuelPay = (fuelType, distance) => {
    const fuel = fuelTypes.find((f) => f.name === fuelType);
    if (!fuel) return 0;
    const dist = parseFloat(distance) || 0;
    const fuelCost = (dist / fuel.efficiency) * fuel.price;
    return Math.round(fuelCost * maintenanceRate);
  };

  // 지급액 합계
  const calculateTotalPay = () => {
    return rows.reduce((sum, row) => sum + calcPay(row), 0);
  };

  // 경비 항목 추가
  const addExpenseRow = () => {
    // 해당 월의 1일로 기본값 설정
    const [year, monthStr] = month.split('-');
    const defaultDate = `${year}-${monthStr}-01`;

    setRows([
      ...rows,
      {
        rowId: null,
        type: 'expense',
        category: '',
        date: defaultDate,
        description: '',
        amount: '',
        people: 1,
        file: null,
        fileName: '',
        managerConfirmed: false,
      },
    ]);
  };

  // 유류비 항목 추가
  const addFuelRow = () => {
    // 해당 월의 1일로 기본값 설정
    const [year, monthStr] = month.split('-');
    const defaultDate = `${year}-${monthStr}-01`;

    setRows([
      ...rows,
      {
        rowId: null,
        type: 'fuel',
        category: 'FUEL',
        date: defaultDate,
        description: '',
        fuelType: '휘발유',
        distance: '',
        tollFee: '',
        file: null,
        fileName: '',
        managerConfirmed: false,
      },
    ]);
  };

  /** 항목 삭제 */
  const deleteRow = (idx) => {
    if (rows.length === 1) {
      showToast('최소 1개 이상의 항목이 필요합니다.', 'warning');
      return;
    }
    setRows(rows.filter((_, i) => i !== idx));
  };

  /** 항목 변경 */
  const updateRow = (idx, key, value) => {
    const updated = [...rows];
    // 금액/통행료 입력은 천단위 콤마 포맷 유지
    if (key === 'amount' || key === 'tollFee') {
      updated[idx][key] = formatWithCommas(value);
    } else {
      updated[idx][key] = value;
    }
    setRows(updated);
  };

  /** 총 금액 계산 */
  // const calculateTotal = () => {
  //   return rows.reduce((sum, row) => {
  //     const amount = unformatToInt(row.amount);
  //     return sum + amount;
  //   }, 0);
  // };

  /** 임시 저장 */
  const handleTempSave = async () => {
    // ...existing code...
    if (!month || !userId) {
      showToast('월 정보와 사용자 정보가 필요합니다.', 'warning');
      return;
    }

    // 매니저 모드에서 제출 상태일 때 status를 MODIFY로 설정
    let tempStatus = 'DRAFT';
    let toastMsg = '임시 저장되었습니다.';
    if (isManagerMode && status === 'SUBMITTED' && !managerChecked) {
      tempStatus = 'MODIFY';
      toastMsg = '수정하였습니다.';
    }

    // 로컬 스토리지에도 저장
    const tempData = {
      month,
      userId,
      memo,
      rows,
      status: tempStatus,
      managerChecked,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      `expense_temp_${month}_${userId}`,
      JSON.stringify(tempData)
    );

    // 백엔드 API 호출
    const formData = new FormData();
    formData.append('factoryCode', '000001');
    formData.append('month', month);
    formData.append('userId', atob(userId));
    formData.append('userName', userName);
    formData.append('memo', memo);
    formData.append('status', tempStatus); // 임시 저장 상태
    formData.append('managerChecked', managerChecked ? 'true' : 'false');
    if (expenseId) {
      formData.append('expenseId', expenseId);
    }

    rows.forEach((row, idx) => {
      // rowId 전송
      if (row.rowId) {
        formData.append(`rows[${idx}].rowId`, row.rowId);
      }
      formData.append(`rows[${idx}].type`, row.type);
      formData.append(`rows[${idx}].category`, row.category);
      formData.append(`rows[${idx}].date`, row.date);
      formData.append(`rows[${idx}].description`, row.description);

      if (row.type === 'fuel') {
        formData.append(`rows[${idx}].fuelType`, row.fuelType);
        formData.append(`rows[${idx}].distance`, row.distance);
        formData.append(`rows[${idx}].tollFee`, row.tollFee);
      } else {
        formData.append(`rows[${idx}].amount`, row.amount);
        formData.append(`rows[${idx}].people`, row.people);
      }

      if (row.file) {
        formData.append(`rows[${idx}].file`, row.file);
      }
      // managerConfirmed 값도 전송
      formData.append(
        `rows[${idx}].managerConfirmed`,
        row.managerConfirmed ? 'Y' : 'N'
      );
    });

    try {
      const response = await fetch(`${API_BASE_URL}/jvWorksSetExpense`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true') {
        showToast(toastMsg, 'success');
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  /** 제출 처리 */
  const handleSubmit = async () => {
    // 유효성 검사
    if (!month) {
      showToast('청구 월 정보가 없습니다.', 'warning');
      return;
    }

    if (!userId) {
      showToast('사용자 정보가 없습니다.', 'warning');
      return;
    }

    const hasEmptyRow = rows.some((row) => {
      if (row.type === 'fuel') {
        // 유류비: 비고, 유류타입, 거리, 날짜 필수 (통행료는 0원 가능)
        if (
          !row.category ||
          !row.date ||
          !row.description ||
          !row.fuelType ||
          !row.distance
        ) {
          return true;
        }
      } else {
        // 일반 경비: 인원, 금액(콤마 제거 후 체크), 날짜, 카테고리만 필수
        const amountValue = unformatToInt(row.amount);
        const peopleValue = parseInt(row.people) || 0;
        if (
          !row.category ||
          !row.date ||
          amountValue === 0 ||
          peopleValue === 0
        ) {
          return true;
        }
      }
      return false;
    });

    if (hasEmptyRow) {
      showToast('필수 항목을 모두 입력해주세요.', 'warning');
      return;
    }

    // 제출 확인 다이얼로그
    showDialog({
      title: '제출 확인',
      message: '경비 청구서를 제출하시겠습니까?',
      okText: '제출',
      cancelText: '취소',
      onOk: () => submitExpense(),
    });
  };

  const submitExpense = async () => {
    const formData = new FormData();
    formData.append('factoryCode', '000001');
    formData.append('month', month);
    formData.append('userId', atob(userId));
    formData.append('userName', userName);
    formData.append('memo', memo);
    formData.append('status', 'SUBMITTED'); // 제출 상태

    rows.forEach((row, idx) => {
      // rowId 전송
      if (row.rowId) {
        formData.append(`rows[${idx}].rowId`, row.rowId);
      }
      formData.append(`rows[${idx}].type`, row.type);
      formData.append(`rows[${idx}].category`, row.category);
      formData.append(`rows[${idx}].date`, row.date);
      formData.append(`rows[${idx}].description`, row.description);

      if (row.type === 'fuel') {
        formData.append(`rows[${idx}].fuelType`, row.fuelType);
        formData.append(`rows[${idx}].distance`, row.distance);
        formData.append(`rows[${idx}].tollFee`, row.tollFee);
      } else {
        formData.append(`rows[${idx}].amount`, row.amount);
        formData.append(`rows[${idx}].people`, row.people);
      }

      if (row.file) {
        formData.append(`rows[${idx}].file`, row.file);
      }
    });

    // API 호출로 경비 청구서 제출
    try {
      const response = await fetch(`${API_BASE_URL}/jvWorksSetExpense`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true') {
        // 임시 저장 데이터 삭제
        localStorage.removeItem(`expense_temp_${month}_${userId}`);
        showToast('경비 청구서가 제출되었습니다.', 'success');
        setTimeout(() => navigate('/works'), 1500);
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('제출 실패:', error);
      showToast('제출 중 오류가 발생했습니다.', 'error');
    }
  };

  // 관리자 전용: 승인/반려 처리
  const handleApprove = async () => {
    showDialog({
      title: '승인 확인',
      message: '이 경비 청구를 승인하시겠습니까?',
      okText: '승인',
      cancelText: '취소',
      onOk: () => updateExpenseStatus('APPROVED'),
    });
  };

  const handleReject = async () => {
    showDialog({
      title: '반려 확인',
      message: '반려 사유를 입력하세요:',
      hasInput: true,
      inputPlaceholder: '반려 사유',
      okText: '반려',
      cancelText: '취소',
      onOk: (reason) => updateExpenseStatus('REJECTED', reason),
    });
  };

  const updateExpenseStatus = async (newStatus, rejectReason = '') => {
    const factoryCode =
      window.sessionStorage.getItem('factoryCode') || '000001';
    const formData = new FormData();
    formData.append('factoryCode', factoryCode);
    formData.append('userId', atob(userId));
    formData.append('month', month);
    formData.append('status', newStatus);
    formData.append('expenseId', expenseId);
    if (rejectReason) formData.append('rejectReason', rejectReason);

    try {
      const response = await fetch(
        `${API_BASE_URL}/jvWorksUpdateExpenseStatus`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success === 'true') {
        showToast(
          `경비 청구가 ${
            newStatus === 'APPROVED' ? '승인' : '반려'
          }되었습니다.`,
          'success'
        );
        setTimeout(() => navigate('/works/expense-management'), 1500);
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      showToast('처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className="expense-container">
        <Helmet>
          <title>경비 청구서 제출 - F1Works</title>
        </Helmet>
        <section className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '60vh',
            }}
          >
            <ClipLoader color="#f88c6b" loading={isLoading} size={120} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="expense-container">
      <Helmet>
        <title>경비 청구서 제출 - F1Works</title>
        <meta property="og:title" content="경비 청구서 제출 - F1Works" />
        <meta property="og:description" content="월별 경비를 청구하세요" />
      </Helmet>

      <div className="expense-content">
        <header className="expense-header">
          <h1>{isManagerMode ? '경비 청구 상세 확인' : '경비 청구서 제출'}</h1>
          <p>
            {isManagerMode
              ? `${userName}님의 경비 청구 내역`
              : '월별 경비를 입력하고 제출하세요'}
          </p>

          {isManagerMode && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => navigate('/works/expense-management')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                목록으로
              </button>
              {status === 'SUBMITTED' && !managerChecked && (
                <>
                  <button
                    onClick={handleApprove}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    승인
                  </button>
                  <button
                    onClick={handleReject}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    반려
                  </button>
                </>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              상태: {status}
              {managerChecked ? ' (관리팀 확인됨)' : ''}
            </span>
            {managerChecked && (
              <span style={{ color: '#c0392b', fontWeight: 600 }}>
                관리팀 확인 후에는 수정할 수 없습니다.
              </span>
            )}
          </div>
          {status !== 'DRAFT' &&
            status !== 'REJECTED' &&
            status !== 'COMPLETED' &&
            !managerChecked && (
              <div
                style={{
                  marginTop: '0.5rem',
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                }}
              >
                현재 상태에서는 임시저장/제출이 불가합니다. 상태가
                임시저장(DRAFT) 또는 반려(REJECTED)일 때만 가능합니다.
              </div>
            )}
          {managerChecked && status !== 'COMPLETED' && (
            <div
              style={{
                marginTop: '0.5rem',
                background: '#fdecea',
                color: '#c0392b',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
              }}
            >
              관리팀 확인됨: 항목 수정/삭제 및 임시저장/제출이 모두 불가합니다.
            </div>
          )}
        </header>

        {/* 기본 정보 */}
        <section className="expense-section">
          <h2 className="section-title">기본 정보</h2>
          <div className="form-group-horizontal">
            {userName && (
              <div className="form-group">
                <label htmlFor="userName">제출자</label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  className="input-field"
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="month">청구 월</label>
              <input
                id="month"
                type="text"
                value={month}
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group flex-grow">
              <label htmlFor="memo">비고 (선택)</label>
              <input
                id="memo"
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="input-field"
                placeholder="특이사항이 있으면 입력하세요"
                disabled={status === 'COMPLETED'}
                style={
                  status === 'COMPLETED'
                    ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' }
                    : {}
                }
              />
            </div>
          </div>
        </section>

        {/* 경비 상세 내역 */}
        <section className="expense-section">
          <h2 className="section-title">경비 상세 내역</h2>

          <div className="expense-table-container">
            <table
              className={`expense-table ${isManagerMode ? 'manager-mode' : ''}`}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '10%',
                      minWidth: '100px',
                    }}
                  >
                    항목 *
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '12%',
                      minWidth: '130px',
                    }}
                  >
                    날짜 *
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '25%',
                      minWidth: '180px',
                    }}
                  >
                    비고 *
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '10%',
                      minWidth: '80px',
                    }}
                  >
                    유류
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '8%',
                      minWidth: '70px',
                    }}
                  >
                    거리/인원
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '10%',
                      minWidth: '90px',
                    }}
                  >
                    통행료
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '10%',
                      minWidth: '100px',
                    }}
                  >
                    금액
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      width: '10%',
                      minWidth: '100px',
                    }}
                  >
                    지급액
                  </th>
                  {isManagerMode && (
                    <th
                      style={{
                        width: '8%',
                        minWidth: '80px',
                        textAlign: 'center',
                      }}
                    >
                      확인
                    </th>
                  )}
                  <th
                    style={{
                      width: '5%',
                      minWidth: '60px',
                      textAlign: 'center',
                    }}
                  >
                    삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      {row.type === 'fuel' ? (
                        <input
                          type="text"
                          value="유류비"
                          className="input-field"
                          disabled
                          style={{
                            backgroundColor: '#f5f5f5',
                            cursor: 'not-allowed',
                          }}
                        />
                      ) : (
                        <select
                          value={row.category}
                          onChange={(e) =>
                            updateRow(idx, 'category', e.target.value)
                          }
                          className="select-field"
                          disabled={isInputDisabled()}
                        >
                          <option value="">선택</option>
                          {categories.map((cat) => (
                            <option key={cat.code} value={cat.code}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(idx, 'date', e.target.value)}
                        className="input-field"
                        disabled={isInputDisabled()}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(idx, 'description', e.target.value)
                        }
                        className="input-field"
                        placeholder={
                          row.category === 'LUNCH' || row.category === 'DINNER'
                            ? '동행자만 기입(본인 미기입)'
                            : '비고(유류비일 경우 필수)'
                        }
                        disabled={isInputDisabled()}
                      />
                    </td>
                    <td>
                      {row.type === 'fuel' ? (
                        <select
                          value={row.fuelType || '휘발유'}
                          onChange={(e) =>
                            updateRow(idx, 'fuelType', e.target.value)
                          }
                          className="select-field"
                          style={{ fontSize: '0.85rem' }}
                          disabled={isInputDisabled()}
                        >
                          {fuelTypes.map((fuel) => (
                            <option key={fuel.name} value={fuel.name}>
                              {fuel.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#999' }}>
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      {row.type === 'fuel' ? (
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.distance || ''}
                          onChange={(e) =>
                            updateRow(idx, 'distance', e.target.value)
                          }
                          className="input-field text-right"
                          placeholder="km"
                          disabled={isInputDisabled()}
                        />
                      ) : (
                        <input
                          type="number"
                          min="1"
                          value={row.people || 1}
                          onChange={(e) =>
                            updateRow(idx, 'people', e.target.value)
                          }
                          className="input-field text-right"
                          disabled={isInputDisabled()}
                        />
                      )}
                    </td>
                    <td>
                      {row.type === 'fuel' ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.tollFee || ''}
                          onChange={(e) =>
                            handleMoneyChange(idx, 'tollFee', e.target.value)
                          }
                          onBlur={() => handleMoneyBlur(idx, 'tollFee')}
                          className="input-field text-right"
                          placeholder="0"
                          disabled={isInputDisabled()}
                        />
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#999' }}>
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      {row.type === 'fuel' ? (
                        <span
                          style={{
                            fontSize: '0.85rem',
                            color: '#999',
                            textAlign: 'center',
                            display: 'block',
                          }}
                        >
                          자동계산
                        </span>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.amount || ''}
                          onChange={(e) =>
                            handleMoneyChange(idx, 'amount', e.target.value)
                          }
                          onBlur={() => handleMoneyBlur(idx, 'amount')}
                          className="input-field text-right"
                          placeholder="0"
                          disabled={isInputDisabled()}
                        />
                      )}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#2c3e50',
                        fontWeight: 600,
                      }}
                    >
                      {calcPay(row).toLocaleString()}
                    </td>
                    {isManagerMode && (
                      <td
                        style={{ textAlign: 'center', verticalAlign: 'middle' }}
                      >
                        <input
                          type="checkbox"
                          checked={row.managerConfirmed || false}
                          onChange={(e) => {
                            const updated = [...rows];
                            updated[idx].managerConfirmed = e.target.checked;
                            setRows(updated);
                          }}
                          disabled={status === 'COMPLETED'}
                          style={{
                            cursor:
                              status === 'COMPLETED'
                                ? 'not-allowed'
                                : 'pointer',
                            width: '18px',
                            height: '18px',
                            opacity: status === 'COMPLETED' ? 0.5 : 1,
                          }}
                        />
                      </td>
                    )}
                    <td
                      style={{ textAlign: 'center', verticalAlign: 'middle' }}
                    >
                      {(status === 'DRAFT' || status === 'REJECTED') &&
                        !managerChecked && (
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            className="btn-icon btn-delete"
                            title="삭제"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100%',
                            }}
                          >
                            🗑️
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(status === 'DRAFT' || status === 'REJECTED') && !managerChecked && (
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={addExpenseRow}
                className="btn-add-row"
              >
                ➕ 경비 항목 추가
              </button>
              <button
                type="button"
                onClick={addFuelRow}
                className="btn-add-row"
                style={{ background: '#007bff' }}
              >
                ⛽ 유류비 항목 추가
              </button>
            </div>
          )}
        </section>

        {/* 합계 */}
        <section className="expense-section">
          <div className="total-section">
            <span className="total-label">총 지급액 합계</span>
            <span className="total-amount">
              {calculateTotalPay().toLocaleString()} 원
            </span>
          </div>
        </section>

        {/* 제출 버튼 */}
        <section className="expense-section">
          {/* 일반 사용자: 임시저장/제출 버튼 */}
          {(status === 'DRAFT' || status === 'REJECTED') &&
            !managerChecked &&
            !isManagerMode && (
              <div className="button-group">
                <button
                  type="button"
                  onClick={handleTempSave}
                  className="btn-secondary"
                >
                  임시 저장
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary"
                >
                  제출하기
                </button>
              </div>
            )}
          {/* 매니저 모드: 제출 상태에서 수정 가능, 임시저장 버튼만 표시 */}
          {isManagerMode && status === 'SUBMITTED' && !managerChecked && (
            <div className="button-group">
              <button
                type="button"
                onClick={handleTempSave}
                className="btn-secondary"
              >
                수정하기
              </button>
            </div>
          )}
          {/* 안내 메시지 */}
          {!(status === 'DRAFT' || status === 'REJECTED') &&
            !managerChecked &&
            !isManagerMode && (
              <div className="info-box" style={{ marginTop: '0.75rem' }}>
                <ul>
                  <li>
                    임시저장/제출은 ‘임시저장(DRAFT)’ 또는 ‘반려(REJECTED)’
                    상태에서만 가능합니다.
                  </li>
                </ul>
              </div>
            )}
          {managerChecked && (
            <div className="info-box" style={{ marginTop: '0.75rem' }}>
              <ul>
                <li>관리팀 확인됨 상태에서는 수정/삭제/제출이 불가합니다.</li>
              </ul>
            </div>
          )}
          {status === 'COMPLETED' && (
            <div
              className="info-box"
              style={{
                marginTop: '0.75rem',
                background: '#e8f4fd',
                borderLeftColor: '#0288d1',
                color: '#01579b',
              }}
            >
              <ul>
                <li>경비 청구가 완료 처리되었습니다.</li>
              </ul>
            </div>
          )}
        </section>

        {/* 안내사항 */}
        <section className="expense-section info-box">
          <h3>📌 안내사항</h3>
          <ul>
            <li>제출 후에는 담당자가 확인할 때까지 수정할 수 있습니다.</li>
            <li>담당자가 확인 처리한 항목은 수정할 수 없습니다.</li>
            <li>
              임시 저장 기능을 이용하여 작성 중인 내용을 저장할 수 있습니다.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
