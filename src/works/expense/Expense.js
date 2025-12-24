import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './Expense.css';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';
import { useToast, useDialog } from '../../common/Toast';
import {
  checkAdminStatus,
  getCorporateCards,
  deleteExpenseRow as deleteExpenseRowAPI,
} from './expenseAPI';

// const gubuns = [
//   { code: 'EXPENSE', name: '경비' },
//   { code: 'CORPORATE', name: '법인' },
// ];

const categories = [
  { code: 'LUNCH', name: '점심' },
  { code: 'DINNER', name: '저녁' },
  { code: 'PARTY', name: '회식비' },
  { code: 'MEETING', name: '회의비' },
  { code: 'UTILITY', name: '공공요금' },
  { code: 'FUEL', name: '유류비' },
  { code: 'ETC', name: '기타' },
];

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
  const [userEfficiency, setUserEfficiency] = useState(15); // 사용자별 연비 (km/L)
  const [baseEfficiency, setBaseEfficiency] = useState(12.8); // 관리자 설정 기준연비
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('DRAFT');
  const [managerChecked, setManagerChecked] = useState(false);
  const [fuelTypes, setFuelTypes] = useState([
    { name: '없음', price: 0, efficiency: 0 },
    { name: '휘발유', price: 1663, efficiency: 12.8 },
    { name: '경유', price: 1536, efficiency: 12.8 },
    { name: 'LPG', price: 999, efficiency: 12.8 },
  ]);
  const [maintenanceRate, setMaintenanceRate] = useState(1.2);
  const monthInputRef = useRef(null);
  const [rows, setRows] = useState([
    {
      rowId: null, // 서버에서 받은 행 ID
      gbn: 'EXPENSE',
      type: 'expense', // 'expense' or 'fuel'
      category: 'LUNCH',
      date: '',
      description: '',
      amount: '',
      people: 1,
      fuelType: '휘발유',
      distance: '',
      tollFee: '',
      corporateCard: null, // 법인카드 ID
      file: null,
      fileName: '',
      managerConfirmed: false, // 관리자 확인 여부
    },
  ]);
  const [allChecked, setAllChecked] = useState(false);
  const [corporateCards, setCorporateCards] = useState([]);
  const authCheckRef = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);
  // 관리자 대리 신청용 상태
  const [proxyMode, setProxyMode] = useState(false);
  const [proxyUserIdInput] = useState('');
  const [proxyUserNameInput] = useState('');
  const [showUserSelectModal, setShowUserSelectModal] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const renderSkeletonRows = (columnCount, rowCount = 5) => (
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

  // 인증 및 초기화
  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    (async () => {
      const sessionUser = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }

      if (isManagerMode) {
        try {
          const decodedUserId = decodeUserId(sessionUser).trim();
          const isAdmin = await checkAdminStatus(decodedUserId);
          if (!isAdmin) {
            showToast(
              '해당 페이지를 이용할 수 없습니다, 관리자 권한이 없습니다.',
              'warning'
            );
            navigate('/works');
            return;
          }
        } catch (err) {
          console.error('[Expense] 관리자 권한 확인 실패:', err);
          showToast('관리자 권한 확인 중 오류가 발생했습니다.', 'error');
          navigate('/works');
          return;
        }
      }

      initializeExpense(sessionUser);
      setAuthChecked(true);
    })();
    // eslint-disable-next-line
  }, [navigate, expenseId, isManagerMode]);

  // 인증 대기 시 상단 고정 로딩바 표시
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
          setUserEfficiency(parsed.userEfficiency || 15);
          setRows(
            parsed.rows?.map((row) => ({
              rowId: row.rowId || null,
              gbn: row.gbn || 'EXPENSE',
              type:
                row.type || (row.category === '유류비' ? 'fuel' : 'expense'),
              category: row.category === '유류비' ? 'FUEL' : row.category || '',
              date: row.date || '',
              description: row.description || '',
              pay: row.pay || 0,
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
              corporateCard: row.corporateCard || null,
              merchant: row.merchant || '',
              file: null,
              fileName: row.fileName || '',
              dirty: true,
              managerConfirmed: row.managerConfirmed || false,
            })) || [
              {
                rowId: null,
                gbn: 'EXPENSE',
                type: 'expense',
                category: 'LUNCH',
                date: '',
                description: '',
                amount: '',
                people: 1,
                fuelType: '휘발유',
                distance: '',
                tollFee: '',
                corporateCard: null,
                merchant: '',
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

  // 유류비 설정 불러오기
  const fetchFuelSettings = async (month, userId) => {
    if (!month || !userId) return;

    try {
      const url = `${API_BASE_URL}/jvWorksGetFuelSettings?factoryCode=000001&month=${month}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('유류비 설정 조회 실패:', response.status);
        return;
      }

      const result = await response.json();

      if (result) {
        const data = result;

        // 유류 타입 업데이트
        const updatedFuelTypes = [
          { name: '없음', price: 0, efficiency: 0 },
          {
            name: '휘발유',
            price: data.gasoline || 0,
            efficiency: data.baseEfficiency || 12.8,
          },
          {
            name: '경유',
            price: data.diesel || 0,
            efficiency: data.baseEfficiency || 12.8,
          },
          {
            name: 'LPG',
            price: data.lpg || 0,
            efficiency: data.baseEfficiency || 12.8,
          },
        ];
        setFuelTypes(updatedFuelTypes);

        // 유지보수율 업데이트
        setMaintenanceRate(data.maintenanceRate || 1.2);

        // 차량연비는 로컬스토리지에서 불러오거나 API 기준연비로부터 계산
        const savedUserEfficiency = localStorage.getItem(
          `user_efficiency_${userId}`
        );

        if (savedUserEfficiency) {
          // 로컬스토리지에 저장된 차량연비가 있으면 사용
          const userEff = parseFloat(savedUserEfficiency);
          setUserEfficiency(userEff);
          // 차량연비로 기준연비 계산 (소수점 한자리 반올림)
          const calculatedBaseEff = Math.round(userEff * 0.85 * 10) / 10;
          setBaseEfficiency(calculatedBaseEff);
        } else if (data.baseEfficiency) {
          // 없으면 API 기준연비로부터 역산하여 차량연비 계산 (소수점 한자리 반올림)
          const apiBaseEff = data.baseEfficiency;
          const calculatedUserEff = Math.round((apiBaseEff / 0.85) * 10) / 10; // 12.8 / 0.85 = 15.058... → 15.1
          setBaseEfficiency(apiBaseEff);
          setUserEfficiency(calculatedUserEff);
          localStorage.setItem(
            `user_efficiency_${userId}`,
            calculatedUserEff.toString()
          );
        }
      }
    } catch (error) {
      console.error('유류비 설정 조회 오류:', error);
    }
  };

  // 경비청구 초기화
  const initializeExpense = async (user) => {
    // 법인카드 목록 로드
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const cards = await getCorporateCards(factoryCode);
      setCorporateCards(Array.isArray(cards) ? cards : []);
    } catch (error) {
      console.error('법인카드 로드 오류:', error);
    }

    // expenseId가 있으면 ID 기준, 없으면 월 기준 조회
    if (isIdBasedQuery) {
      // ID 기준 조회: expenseId로 조회
      setUserId(user);
      fetchExpenseData(null, user, expenseId);
    } else {
      // 월 기준 조회: 이전 월을 기본값으로 설정 (경비는 지난달 기준)
      const now = new Date();
      now.setMonth(now.getMonth()); // 한 달 이전으로 설정
      const year = now.getFullYear();
      const monthValue = String(now.getMonth() + 1).padStart(2, '0');
      const targetMonth = `${year}${monthValue}`;
      const formattedMonth = `${targetMonth.slice(0, 4)}-${targetMonth.slice(
        4,
        6
      )}`;

      setMonth(formattedMonth);
      setUserId(user);

      // 유류비 설정 불러오기
      fetchFuelSettings(formattedMonth, user);

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

  // 최근 12개월 옵션 생성 (현재 월 포함)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = `${year}년 ${month}월`;
      options.push({ value, label });
    }

    return options;
  };

  // 청구월 변경 핸들러
  const handleMonthChange = async (e) => {
    const newMonth = e.target.value;

    // 같은 월이면 무시
    if (newMonth === month) return;

    // 청구월 변경 및 데이터 조회
    setMonth(newMonth);
    setIsLoading(true);

    // 유류비 설정 불러오기
    await fetchFuelSettings(newMonth, userId);

    // 경비 데이터 조회
    await fetchExpenseData(newMonth, userId, null);
  }; // 사용자 차량 연비 변경 핸들러 (기준연비는 차량연비 × 0.85로 계산, 소수점 한자리)
  const handleEfficiencyChange = (e) => {
    const inputValue = e.target.value;

    // 빈 값이면 0으로 설정
    if (inputValue === '') {
      setUserEfficiency(0);
      setBaseEfficiency(0);
      return;
    }

    const value = parseFloat(inputValue);
    if (isNaN(value) || value < 0) return;

    // 입력한 값 그대로 설정 (15 입력 → 15로 유지)
    setUserEfficiency(value);

    // 차량연비 × 0.85로 기준연비 계산 (15 × 0.85 = 12.75 → 12.8)
    const calculatedBaseEfficiency = Math.round(value * 0.85 * 10) / 10;
    setBaseEfficiency(calculatedBaseEfficiency);

    // 로컬스토리지에 차량연비 저장
    if (userId && value > 0) {
      localStorage.setItem(`user_efficiency_${userId}`, value.toString());
    }
  };

  // 사용자 목록 로드 (관리자용, TIN114 기반 전용 API)
  const loadUserList = async (query = '') => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      if (query) formData.append('query', query);

      const response = await fetch(`${API_BASE_URL}/jvWorksGetUserList`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const txt = await response.text();
        console.warn('사용자 목록 응답 오류:', response.status, txt);
        showToast('사용자 목록을 불러오지 못했습니다.', 'error');
        return;
      }
      let data;
      try {
        data = await response.json();
      } catch (e) {
        const txt = await response.text();
        console.warn('JSON 파싱 실패:', txt);
        data = null;
      }

      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.users)
        ? data.users
        : [];

      // 중복 제거 및 필드 매핑
      const seen = new Set();
      const users = [];
      rawList.forEach((item) => {
        const id = String(
          item.userId ?? item.id ?? item.empNo ?? item.employeeId ?? ''
        ).trim();
        const name = String(item.userName ?? item.name ?? '').trim();
        if (!id) return;
        if (seen.has(id)) return;
        seen.add(id);
        users.push({ userId: id, userName: name });
      });
      setUserList(users);
    } catch (e) {
      console.error('loadUserList error:', e);
      showToast('사용자 목록 로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const openUserSelectModal = async () => {
    if (!isManagerMode || isIdBasedQuery) return;
    await loadUserList('');
    setShowUserSelectModal(true);
  };

  const closeUserSelectModal = () => setShowUserSelectModal(false);

  // 관리자: 사용자 선택 후 대리 청구 시작
  const handleProxySelect = async (selectedUserId, selectedUserName) => {
    if (!isManagerMode) return;
    const rawId = (selectedUserId ?? proxyUserIdInput ?? '').trim();
    const rawName = (selectedUserName ?? proxyUserNameInput ?? '').trim();
    if (!rawId || !rawName) {
      showToast('사용자 ID와 이름을 입력하세요.', 'warning');
      return;
    }

    try {
      const encodedId = btoa(rawId);

      // 월이 비어있다면 기본 월로 설정 (현재 월)
      let targetMonth = month;
      if (!targetMonth) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        targetMonth = `${y}-${m}`;
      }

      // 상태 설정
      setUserId(encodedId);
      setUserName(rawName);
      setMonth(targetMonth);
      setMemo('');
      setManagerChecked(false);
      setStatus('DRAFT');
      setProxyMode(true);

      // 해당 월의 1일 기본 날짜로 초기 행 구성
      const [yy, mm] = targetMonth.split('-');
      const defaultDate = `${yy}-${mm}-01`;
      setRows([
        {
          rowId: null,
          type: 'expense',
          category: 'LUNCH',
          date: defaultDate,
          description: '',
          amount: '',
          people: 1,
          file: null,
          fileName: '',
          dirty: true,
          managerConfirmed: false,
        },
      ]);

      // 유류비 설정 불러오기 (선택 사용자 기준) - encodedId 직접 전달
      await fetchFuelSettings(targetMonth, encodedId);

      // 선택 사용자의 경비 데이터 불러오기 (서버에 저장된 데이터 또는 임시저장 데이터)
      await fetchExpenseData(targetMonth, encodedId, null, rawName);

      showToast('대리 신청 사용자로 전환되었습니다.', 'info');
    } catch (e) {
      console.error('handleProxySelect error:', e);
      showToast('사용자 선택 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 입력 가능 여부 확인 (매니저 모드 제출 상태는 수정 가능, COMPLETED는 비활성화)
  const isInputDisabled = () => {
    // COMPLETED 상태는 항상 비활성화
    if (status === 'COMPLETED') return true;

    if (isManagerMode) {
      // 관리자 모드에서 사용자 미선택 시 비활성화
      if (!proxyMode && !isIdBasedQuery) return true;
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
    updated[idx].dirty = true;
    setRows(updated);
  };

  const handleMoneyBlur = (idx, key) => {
    const updated = [...rows];
    updated[idx][key] = formatWithCommas(updated[idx][key]);
    setRows(updated);
  };

  /** 경비 데이터 조회 */
  const fetchExpenseData = async (
    month,
    userId,
    expenseId,
    presetUserName = null
  ) => {
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

        // ID 기준 조회인 경우 또는 month가 설정되지 않았다면 월 정보 설정
        if (data.month && (isIdBasedQuery || !month)) {
          setMonth(data.month);

          // 유류비 설정 불러오기
          fetchFuelSettings(data.month, userId);
        }

        // 조회된 데이터가 있으면 (제출된 데이터 또는 임시저장된 서버 데이터)
        if (data.rows && data.rows.length > 0) {
          setUserName(data.userName);
          setMemo(data.memo || '');
          setStatus(data.status || 'DRAFT');
          setManagerChecked(!!data.managerChecked);

          setUserEfficiency(data.userEfficiency || 15);

          const calculatedBaseEfficiency =
            Math.round((data.userEfficiency || 15) * 0.85 * 10) / 10;
          setBaseEfficiency(calculatedBaseEfficiency);

          setRows(
            data.rows.map((row) => ({
              rowId: row.rowId || null,
              gbn: row.gbn || 'EXPENSE',
              type:
                row.type || (row.category === '유류비' ? 'fuel' : 'expense'),
              category: row.category === '유류비' ? 'FUEL' : row.category || '',
              date: row.date || '',
              description: row.description || '',
              pay: row.pay ?? null,
              dirty: false,
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
              corporateCard: row.corporateCard || null,
              merchant: row.merchant || '',
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
        setUserName(data?.userName || presetUserName || '사용자');
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
            gbn: 'EXPENSE',
            type: 'expense',
            category: 'LUNCH',
            date: defaultDate,
            description: '',
            amount: '',
            people: 1,
            corporateCard: null,
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
    // 제출 이후(제출, 승인, 완료 등)에는 서버에 저장된 지급액을 그대로 사용하여
    // 추후 단가/연비 변경 시에도 과거 청구 금액이 변하지 않도록 한다.
    if (
      status !== 'DRAFT' &&
      status !== 'REJECTED' &&
      row.pay !== undefined &&
      row.pay !== null &&
      // 매니저가 확인 전(SUBMITTED 등) 수정 중일 때는 최신 단가로 재계산하도록
      // stored pay 사용을 건너뛴다.
      !(isManagerMode && !managerChecked && row.dirty)
    ) {
      return row.pay;
    }

    if (row.type === 'fuel') {
      const fuelPay = calcFuelPay(row.fuelType, row.distance);
      const toll = unformatToInt(row.tollFee);
      return fuelPay + toll;
    }

    // 법인카드는 금액 그대로 반환
    if (row.type === 'corporate') {
      return unformatToInt(row.amount);
    }

    const amt = unformatToInt(row.amount);
    const cnt = parseInt(row.people) || 1;

    // 점심, 저녁일 경우만 인당 8천원 제한 적용
    if (row.category === 'LUNCH' || row.category === 'DINNER') {
      if (cnt === 1) return Math.min(amt, 8000);
      return Math.min(amt, 8000 * cnt);
    }

    // 그 외 카테고리는 제한 없음
    return amt;
  };

  // 유류비 계산 함수 (기준연비 사용)
  const calcFuelPay = (fuelType, distance) => {
    const fuel = fuelTypes.find((f) => f.name === fuelType);
    if (!fuel) return 0;
    // '없음'인 경우 유류비 계산하지 않음 (통행료만)
    if (fuelType === '없음') return 0;
    const dist = parseFloat(distance) || 0;
    // 기준연비 사용
    const efficiency = baseEfficiency || 12.8;
    const fuelCost = (dist / efficiency) * fuel.price;
    const beforeRound = fuelCost * maintenanceRate;
    // 원단위 반올림 (10원 단위에서 반올림)
    const result = Math.round(beforeRound / 10) * 10;

    return result;
  };

  // 최근 내역 가져오기: 지난달 데이터를 불러와 현재 선택 월로 변환 후 추가
  const importLastMonthRows = async () => {
    if (!userId) {
      showToast('사용자 정보가 없습니다.', 'warning');
      return;
    }
    if (!month) {
      showToast('청구 월 정보가 없습니다.', 'warning');
      return;
    }

    try {
      // 현재 선택 월의 지난달 계산 (month: 'YYYY-MM')
      const [yStr, mStr] = month.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const prevDate = new Date(y, m - 2, 1); // JS month index 기반
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevMonth = `${prevY}-${prevM}`;

      // 지난달 데이터 조회 (월 기준)
      const url =
        `${API_BASE_URL}/jvWorksGetExpense?factoryCode=000001&month=${prevMonth}&userId=${atob(
          userId
        )}` + (isManagerMode ? '&manager=true' : '');
      const response = await fetch(url);
      if (!response.ok) {
        showToast('지난달 내역 조회에 실패했습니다.', 'error');
        return;
      }
      const result = await response.json();
      if (
        !(
          result &&
          result.success === 'true' &&
          result.data &&
          result.data.rows
        )
      ) {
        showToast('지난달 내역이 없습니다.', 'info');
        return;
      }

      const prevRows = result.data.rows;

      // 날짜를 현재 선택 월로 변환하며 행 생성
      const transformed = prevRows.map((row) => {
        // 기존 날짜의 일(day)만 유지하고 선택 월로 변경
        let day = '01';
        if (row.date && row.date.length >= 10) {
          day = row.date.substring(8, 10);
        }
        const newDate = `${month}-${day}`;

        const isFuel =
          (row.type && row.type === 'fuel') ||
          row.category === '유류비' ||
          row.category === 'FUEL';

        // 유류비와 일반 경비를 명확히 분리하여 객체 생성
        if (isFuel) {
          return {
            rowId: null,
            gbn: row.gbn || 'EXPENSE',
            type: 'fuel',
            category: 'FUEL',
            date: newDate,
            description: row.description || '',
            fuelType: row.fuelType || '휘발유',
            distance: row.distance || '',
            tollFee: row.tollFee ? formatWithCommas(row.tollFee) : '',
            file: null,
            fileName: '',
            dirty: true,
            managerConfirmed: false,
          };
        } else {
          return {
            rowId: null,
            gbn: row.gbn || 'EXPENSE',
            type: 'expense',
            category: row.category || '',
            date: newDate,
            description: row.description || '',
            amount: row.amount ? formatWithCommas(row.amount) : '',
            people: row.people || 1,
            file: null,
            fileName: '',
            dirty: true,
            managerConfirmed: false,
          };
        }
      });

      // 기존 행 뒤에 추가
      setRows((cur) => [...cur, ...transformed]);
      showToast('지난달 내역을 현재 월로 불러왔습니다.', 'success');
    } catch (e) {
      console.error('importLastMonthRows error:', e);
      showToast('지난달 내역 가져오기 중 오류가 발생했습니다.', 'error');
    }
  };

  // 지급액 합계
  const calculateTotalPay = () => {
    return rows.reduce((sum, row) => sum + calcPay(row), 0);
  };

  // 경비 항목 추가
  const addExpenseRow = () => {
    // 기본값: 해당 월 1일
    const [year, monthStr] = month.split('-');
    const defaultDate = `${year}-${monthStr}-01`;
    const selectedMonth = `${year}-${monthStr}`;
    const today = new Date();

    // 직전 경비청구일 +1일(있으면), 없으면 기본값
    const latestExpenseDate = rows
      .filter((r) => r.type === 'expense' && r.date)
      .reduce((latest, r) => {
        const cur = new Date(r.date);
        if (Number.isNaN(cur.getTime())) return latest;
        if (!latest) return cur;
        return cur > latest ? cur : latest;
      }, null);

    const formatDate = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const nextDate = latestExpenseDate
      ? (() => {
          const d = new Date(latestExpenseDate);
          const isFriday = d.getDay() === 5; // 0: Sun, 5: Fri
          const sameMonthWithToday =
            selectedMonth ===
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
              2,
              '0'
            )}`;
          const todayIsSaturday = today.getDay() === 6;
          const todayIsSunday = today.getDay() === 0;

          if (isFriday) {
            // 금요일 이후 주말 당일 추가는 당일로, 그 외는 월요일로 건너뛰기
            if ((todayIsSaturday || todayIsSunday) && sameMonthWithToday) {
              return formatDate(today);
            }
            d.setDate(d.getDate() + 3);
            return formatDate(d);
          }

          d.setDate(d.getDate() + 1);
          return formatDate(d);
        })()
      : defaultDate;

    setRows([
      ...rows,
      {
        rowId: null,
        gbn: 'EXPENSE',
        type: 'expense',
        category: 'LUNCH',
        date: nextDate,
        description: '',
        amount: '',
        people: 1,
        file: null,
        fileName: '',
        dirty: true,
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
        gbn: 'EXPENSE',
        type: 'fuel',
        category: 'FUEL',
        date: defaultDate,
        description: '',
        fuelType: '휘발유',
        distance: '',
        tollFee: '',
        file: null,
        fileName: '',
        dirty: true,
        managerConfirmed: false,
      },
    ]);
  };

  // 법인카드 항목 추가 (관리자만)
  const addCorporateCardRow = () => {
    // 해당 월의 1일로 기본값 설정
    const [year, monthStr] = month.split('-');
    const defaultDate = `${year}-${monthStr}-01`;

    setRows([
      ...rows,
      {
        rowId: null,
        gbn: 'CORPORATE',
        type: 'corporate',
        category: '',
        corporateCard: null,
        merchant: '',
        date: defaultDate,
        description: '',
        amount: '',
        file: null,
        fileName: '',
        dirty: true,
        managerConfirmed: false,
      },
    ]);
  };

  /** 항목 삭제 */
  const deleteRow = (idx) => {
    const targetRow = rows[idx];
    const factoryCode =
      window.sessionStorage.getItem('factoryCode') || '000001';

    const canImmediateServerDelete =
      isManagerMode &&
      !proxyMode &&
      isIdBasedQuery &&
      !managerChecked &&
      (status === 'DRAFT' || status === 'SUBMITTED' || status === 'REJECTED') &&
      targetRow?.rowId;

    const removeRow = () => {
      setRows((prev) => {
        if (prev.length === 1) {
          showToast('최소 1개 이상의 항목이 필요합니다.', 'warning');
          return prev;
        }
        return prev.filter((_, i) => i !== idx);
      });
    };

    const handleConfirmedDelete = async () => {
      if (canImmediateServerDelete) {
        try {
          await deleteExpenseRowAPI({
            expenseId,
            rowId: targetRow.rowId,
            factoryCode,
          });
          showToast('항목을 삭제했습니다.', 'success');
        } catch (error) {
          console.error('[Expense] deleteExpenseRow failed:', error);
          showToast('삭제 중 오류가 발생했습니다.', 'error');
          return;
        }
      }

      removeRow();
    };

    if (canImmediateServerDelete) {
      showDialog({
        title: '삭제 확인',
        message: canImmediateServerDelete
          ? '이 항목을 삭제하면 즉시 삭제됩니다. 진행하시겠습니까?'
          : '이 항목을 삭제하시겠습니까?',
        okText: '네',
        cancelText: '아니오',
        onOk: handleConfirmedDelete,
      });
      return;
    }

    removeRow();
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
    updated[idx].dirty = true;
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
    // if (isManagerMode && status === 'SUBMITTED' && !managerChecked) {
    //   tempStatus = 'MODIFY';
    //   toastMsg = '수정하였습니다.';
    // }

    // 로컬 스토리지에도 저장
    const tempData = {
      month,
      userId,
      memo,
      rows,
      status: tempStatus,
      managerChecked,
      userEfficiency,
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
    formData.append('userEfficiency', userEfficiency); // 사용자 차량 연비 추가
    if (expenseId) {
      formData.append('expenseId', expenseId);
    }

    rows.forEach((row, idx) => {
      // rowId 전송
      if (row.rowId) {
        formData.append(`rows[${idx}].rowId`, row.rowId);
      }
      formData.append(`rows[${idx}].gbn`, row.gbn || 'EXPENSE');
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

      if (row.gbn === 'CORPORATE') {
        formData.append(`rows[${idx}].corporateCard`, row.corporateCard);
        formData.append(`rows[${idx}].merchant`, row.merchant);
        formData.append(`rows[${idx}].amount`, row.amount);
      }

      formData.append(
        `rows[${idx}].pay`,
        `${calcPay(row).toLocaleString()}` || 0
      );

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

  const handleModifySave = async () => {
    // ...existing code...
    if (!month || !userId) {
      showToast('월 정보와 사용자 정보가 필요합니다.', 'warning');
      return;
    }

    // 매니저 모드에서 제출 상태일 때 status를 MODIFY로 설정
    let tempStatus = 'MODIFY';
    let toastMsg = '수정하였습니다.';

    // 로컬 스토리지에도 저장
    const tempData = {
      month,
      userId,
      memo,
      rows,
      status: tempStatus,
      managerChecked,
      userEfficiency,
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
    formData.append('userEfficiency', userEfficiency); // 사용자 차량 연비 추가
    if (expenseId) {
      formData.append('expenseId', expenseId);
    }

    rows.forEach((row, idx) => {
      // rowId 전송
      if (row.rowId) {
        formData.append(`rows[${idx}].rowId`, row.rowId);
      }
      formData.append(`rows[${idx}].gbn`, row.gbn || 'EXPENSE');
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

      if (row.gbn === 'CORPORATE') {
        formData.append(`rows[${idx}].corporateCard`, row.corporateCard);
        formData.append(`rows[${idx}].merchant`, row.merchant);
        formData.append(`rows[${idx}].amount`, row.amount);
      }

      formData.append(
        `rows[${idx}].pay`,
        `${calcPay(row).toLocaleString()}` || 0
      );

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
        // 유류비: 비고, 유류타입, 날짜 필수 (거리는 '없음'이 아닐 때만 필수, 통행료는 0원 가능)
        if (!row.category || !row.date || !row.description || !row.fuelType) {
          return true;
        }
        // '없음'이 아닐 때만 거리 필수
        if (row.fuelType !== '없음' && !row.distance) {
          return true;
        }
      } else if (row.type === 'corporate') {
        // 법인카드: 카드 종류, 항목, 날짜 필수
        if (!row.corporateCard || !row.category || !row.date) {
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

    // 헤더 청구월과 그리드 항목 날짜의 월이 다르면 저장 불가
    const headerMonth = month; // 'YYYY-MM' 형식
    const hasMismatchMonth = rows.some((row) => {
      if (!row.date) return false; // 날짜가 없으면 위에서 이미 체크됨
      // date 형식: 'YYYY-MM-DD'
      const rowMonth = row.date.substring(0, 7); // 'YYYY-MM'
      return rowMonth !== headerMonth;
    });

    if (hasMismatchMonth) {
      showToast('모든 경비 항목의 월이 청구월과 동일해야 합니다.', 'warning');
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
    formData.append('userEfficiency', userEfficiency); // 사용자 차량 연비 추가

    rows.forEach((row, idx) => {
      // rowId 전송
      if (row.rowId) {
        formData.append(`rows[${idx}].rowId`, row.rowId);
      }
      formData.append(`rows[${idx}].gbn`, row.gbn || 'EXPENSE');
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

      if (row.gbn === 'CORPORATE') {
        formData.append(`rows[${idx}].corporateCard`, row.corporateCard);
        formData.append(`rows[${idx}].merchant`, row.merchant);
        formData.append(`rows[${idx}].amount`, row.amount);
      }

      formData.append(
        `rows[${idx}].pay`,
        `${calcPay(row).toLocaleString()}` || 0
      );

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
        setTimeout(() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/works');
          }
        }, 500);
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('제출 실패:', error);
      showToast('제출 중 오류가 발생했습니다.', 'error');
    }
  };

  /** 제출없음 처리 */
  const handleNoSubmit = async () => {
    // 유효성 검사
    if (!month) {
      showToast('청구 월 정보가 없습니다.', 'warning');
      return;
    }

    if (!userId) {
      showToast('사용자 정보가 없습니다.', 'warning');
      return;
    }

    // 제출없음 확인 다이얼로그
    showDialog({
      title: '제출없음 확인',
      message:
        '해당 월의 경비 청구가 없음으로 처리되며, 자동으로 승인됩니다.\n\n계속하시겠습니까?',
      okText: '확인',
      cancelText: '취소',
      onOk: () => submitNoExpense(),
    });
  };

  const submitNoExpense = async () => {
    const formData = new FormData();
    formData.append('factoryCode', '000001');
    formData.append('month', month);
    formData.append('userId', atob(userId));
    formData.append('userName', userName);
    formData.append('memo', memo || '제출 내역 없음');
    formData.append('status', 'NOT_SUBMITTED'); // 제출없음 상태
    formData.append('userEfficiency', userEfficiency);

    // 빈 행 배열 전송 (제출 내역이 없으므로)
    // 서버에서 빈 배열도 처리할 수 있도록 rows[0] 최소한 전송
    formData.append('rows[0].type', 'expense');
    formData.append('rows[0].category', '');
    formData.append('rows[0].date', '');
    formData.append('rows[0].description', '제출 내역 없음');
    formData.append('rows[0].amount', '0');
    formData.append('rows[0].people', '0');
    formData.append('rows[0].pay', '0');

    // API 호출로 제출없음 처리
    try {
      const response = await fetch(`${API_BASE_URL}/jvWorksSetExpense`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success === 'true') {
        // 임시 저장 데이터 삭제
        localStorage.removeItem(`expense_temp_${month}_${userId}`);
        showToast('제출없음으로 처리되었습니다. (자동 승인)', 'success');
        setTimeout(() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/works/expense-management');
          }
        }, 500);
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('제출없음 처리 실패:', error);
      showToast('제출없음 처리 중 오류가 발생했습니다.', 'error');
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
    const isApproved = status === 'APPROVED';
    showDialog({
      title: '반려 확인',
      message: isApproved
        ? '승인된 경비를 반려하면 사용자가 다시 수정할 수 있습니다.\n\n반려 사유를 입력하세요:'
        : '반려 사유를 입력하세요:',
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
        setTimeout(() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/works/expense-management');
          }
        }, 500);
      } else {
        showToast(result.message || '', 'error');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      showToast('처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleCheckAll = (event) => {
    const checked = event.target.checked;
    setAllChecked(checked);
    setRows((prevRows) =>
      prevRows.map((row) => ({ ...row, managerConfirmed: checked }))
    );
  };

  // 인증 완료 전에는 화면을 비워 두고 상단 바만 표시
  if (!authChecked) {
    return <div className="auth-wait-screen" />;
  }

  return (
    <div className="expense-container">
      <Helmet>
        <title>경비 청구서 제출</title>
        <meta property="og:title" content="경비 청구서 제출" />
        <meta property="og:description" content="월별 경비를 청구하세요" />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/works/expense/"
        />
      </Helmet>

      <div className="expense-content">
        {isLoading && (
          <div
            className="loading-bar"
            role="status"
            aria-label={'데이터 로딩 중'}
          >
            <div className="loading-bar__indicator" />
          </div>
        )}
        <header className="expense-header">
          <div className="header-left">
            <h1>{isManagerMode ? '경비 청구 관리' : '경비 청구서 제출'}</h1>
          </div>
          <div className="header-right">
            {isManagerMode && (
              <>
                {(status === 'SUBMITTED' || status === 'COMPLETED') &&
                  !managerChecked &&
                  isIdBasedQuery &&
                  !proxyMode && (
                    <>
                      {status === 'SUBMITTED' && (
                        <button onClick={handleApprove} className="btn-approve">
                          승인
                        </button>
                      )}
                      <button onClick={handleReject} className="btn-reject">
                        반려
                      </button>
                    </>
                  )}
                <button
                  onClick={() => {
                    // 우선 히스토리 뒤로가기 시도
                    if (window.history.length > 1) {
                      // 여러 화면을 거쳐 왔을 경우 한 단계씩 뒤로가기
                      // 필요 시 더 뒤로가기를 원하면 아래 횟수를 조정 가능
                      navigate(-1);
                    } else {
                      // 히스토리가 없으면 관리 페이지로 이동
                      navigate('/works/expense-management');
                    }
                  }}
                  className="btn-back-inline"
                >
                  뒤로가기
                </button>
              </>
            )}
          </div>
        </header>

        {/* 상태 정보 섹션 */}
        {isManagerMode && (
          <div className="status-info-section">
            <p>{userName}님의 경비 청구 내역</p>
          </div>
        )}
        {!isManagerMode && (
          <div className="status-info-section">
            <p>월별 경비를 입력하고 제출하세요</p>
          </div>
        )}

        {/* 상태 및 알림 정보 */}
        <div className="status-alerts">
          <div
            style={{
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
        </div>

        {/* 기본 정보 */}
        <section className="expense-section">
          <div
            className="section-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ margin: 0 }}>기본 정보</h2>
            {isManagerMode && !isIdBasedQuery && (
              <button
                type="button"
                onClick={openUserSelectModal}
                className="btn-secondary"
                disabled={managerChecked || status === 'COMPLETED'}
              >
                사용자 선택
              </button>
            )}
          </div>
          <div className="form-group-horizontal">
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
            <div className="form-group">
              <label htmlFor="month">청구 월</label>
              <select
                ref={monthInputRef}
                id="month"
                value={month}
                onChange={handleMonthChange}
                className="select-field"
                disabled={isIdBasedQuery}
                style={
                  isIdBasedQuery
                    ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' }
                    : {}
                }
              >
                {generateMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="userEfficiency">
                차량 연비 (km/L)
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: '#888',
                    marginLeft: '4px',
                  }}
                >
                  (기준연비 자동계산)
                </span>
              </label>
              <input
                id="userEfficiency"
                type="number"
                step="0.1"
                min="0.1"
                value={userEfficiency}
                onChange={handleEfficiencyChange}
                className="input-field"
                placeholder="예: 15"
                disabled={status === 'COMPLETED' || status === 'SUBMITTED'}
                style={
                  status === 'COMPLETED' || status === 'SUBMITTED'
                    ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' }
                    : {}
                }
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
                disabled={status === 'COMPLETED' || status === 'SUBMITTED'}
                style={
                  status === 'COMPLETED' || status === 'SUBMITTED'
                    ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' }
                    : {}
                }
              />
            </div>
          </div>
        </section>
        {showUserSelectModal && (
          <div className="modal-overlay" onClick={closeUserSelectModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>사용자 선택</h2>
                <button className="modal-close" onClick={closeUserSelectModal}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="이름 또는 사번 검색"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="input-field"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadUserList(userSearchTerm);
                      }
                    }}
                  />
                  {/* <div style={{ marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => loadUserList(userSearchTerm)}
                    >
                      검색
                    </button>
                  </div> */}
                </div>
                <div>
                  <table className="expense-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>사번</th>
                        <th style={{ textAlign: 'center' }}>이름</th>
                        <th style={{ textAlign: 'center' }}>선택</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(userList || [])
                        .filter((u) => {
                          const term = userSearchTerm.trim().toLowerCase();
                          if (!term) return true;
                          return (
                            String(u.userId).toLowerCase().includes(term) ||
                            String(u.userName).toLowerCase().includes(term)
                          );
                        })
                        .map((u, i) => (
                          <tr key={`${u.userId}-${i}`}>
                            <td style={{ textAlign: 'center' }}>{u.userId}</td>
                            <td style={{ textAlign: 'center' }}>
                              {u.userName}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  closeUserSelectModal();
                                  handleProxySelect(
                                    String(u.userId),
                                    String(u.userName || '')
                                  );
                                }}
                              >
                                선택
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={closeUserSelectModal}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 경비 상세 내역 */}
        <section className="expense-section">
          <h2 className="section-title">경비 상세 내역</h2>

          {isManagerMode && !proxyMode && !isIdBasedQuery && (
            <div
              className="info-box"
              style={{
                marginBottom: '1rem',
                background: '#fff3cd',
                borderLeftColor: '#ffc107',
                color: '#856404',
              }}
            >
              <strong>⚠️ 사용자를 선택해주세요.</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                기본 정보에서 "사용자 선택" 버튼을 클릭하여 대리 신청할 사용자를
                선택한 후 경비 항목을 입력하실 수 있습니다.
              </p>
            </div>
          )}

          <div className="expense-table-container">
            <table
              className={`expense-table ${isManagerMode ? 'manager-mode' : ''}`}
            >
              <thead>
                <tr>
                  {/* 구분 열 숨김 */}
                  {/* <th style={{ textAlign: 'center', width: '10%', minWidth: '100px' }}>구분 *</th> */}
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
                  {isManagerMode && status === 'SUBMITTED' && (
                    <th
                      style={{
                        width: '8%',
                        minWidth: '80px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={handleCheckAll}
                          disabled={status === 'COMPLETED'}
                          style={{
                            cursor:
                              status === 'COMPLETED'
                                ? 'not-allowed'
                                : 'pointer',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                        <span>확인</span>
                      </div>
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
                {isLoading
                  ? renderSkeletonRows(
                      isManagerMode && status === 'SUBMITTED' ? 10 : 9
                    )
                  : rows
                      .filter((row) => row.gbn === 'EXPENSE' || !row.gbn)
                      .map((row, idx) => {
                        const originalIdx = rows.indexOf(row);
                        return (
                          <tr key={originalIdx}>
                            {/* 구분 셀 제거 */}
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
                                    updateRow(
                                      originalIdx,
                                      'category',
                                      e.target.value
                                    )
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
                                onChange={(e) =>
                                  updateRow(originalIdx, 'date', e.target.value)
                                }
                                className="input-field"
                                disabled={isInputDisabled()}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) =>
                                  updateRow(
                                    originalIdx,
                                    'description',
                                    e.target.value
                                  )
                                }
                                className="input-field"
                                placeholder={
                                  row.category === 'LUNCH' ||
                                  row.category === 'DINNER'
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
                                    updateRow(
                                      originalIdx,
                                      'fuelType',
                                      e.target.value
                                    )
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
                                <span
                                  style={{ fontSize: '0.85rem', color: '#999' }}
                                >
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
                                    updateRow(
                                      originalIdx,
                                      'distance',
                                      e.target.value
                                    )
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
                                    updateRow(
                                      originalIdx,
                                      'people',
                                      e.target.value
                                    )
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
                                    handleMoneyChange(
                                      originalIdx,
                                      'tollFee',
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    handleMoneyBlur(originalIdx, 'tollFee')
                                  }
                                  className="input-field text-right"
                                  placeholder="0"
                                  disabled={isInputDisabled()}
                                />
                              ) : (
                                <span
                                  style={{ fontSize: '0.85rem', color: '#999' }}
                                >
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
                                    handleMoneyChange(
                                      originalIdx,
                                      'amount',
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    handleMoneyBlur(originalIdx, 'amount')
                                  }
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
                            {isManagerMode && status === 'SUBMITTED' && (
                              <td
                                style={{
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={row.managerConfirmed || false}
                                  onChange={(e) => {
                                    const updated = [...rows];
                                    updated[originalIdx].managerConfirmed =
                                      e.target.checked;
                                    setRows(updated);
                                    // 모든 행의 체크 상태 확인
                                    setAllChecked(
                                      updated.every((r) => r.managerConfirmed)
                                    );
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
                              style={{
                                textAlign: 'center',
                                verticalAlign: 'middle',
                              }}
                            >
                              {(status === 'DRAFT' ||
                                status === 'REJECTED' ||
                                (isManagerMode && status === 'SUBMITTED')) &&
                                !managerChecked && (
                                  <button
                                    className="btn-delete"
                                    onClick={() => deleteRow(originalIdx)}
                                  >
                                    삭제
                                  </button>

                                  // <button
                                  //   type="button"
                                  //   onClick={() => deleteRow(originalIdx)}
                                  //   className="btn-icon btn-delete"
                                  //   title="삭제"
                                  //   style={{
                                  //     display: 'inline-flex',
                                  //     alignItems: 'center',
                                  //     justifyContent: 'center',
                                  //     height: '100%',
                                  //   }}
                                  // >
                                  //   🗑️
                                  // </button>
                                )}
                            </td>
                          </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>
          {(status === 'DRAFT' ||
            status === 'REJECTED' ||
            (isManagerMode && status === 'SUBMITTED')) &&
            !(isManagerMode && !proxyMode && !isIdBasedQuery) && (
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
                  ⛽ 유류비 추가
                </button>
                <button
                  type="button"
                  onClick={importLastMonthRows}
                  className="btn-add-row"
                  style={{ background: '#28a745' }}
                  title="지난달 내역을 불러와 현재 월로 변환하여 추가"
                >
                  🕘 최근 내역 가져오기
                </button>
              </div>
            )}
        </section>

        {/* 법인카드 상세 내역 */}
        {(status === 'COMPLETED'
          ? rows.some((row) => row.gbn === 'CORPORATE')
          : isManagerMode || rows.some((row) => row.gbn === 'CORPORATE')) && (
          <>
            {isManagerMode ? (
              // 관리자 모드: 기존 방식 - 단일 테이블
              <section className="expense-section">
                <h2 className="section-title">법인카드 상세 내역</h2>

                <div className="expense-table-container">
                  <table className="expense-table">
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '7%',
                            minWidth: '70px',
                          }}
                        >
                          구분
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '11%',
                            minWidth: '110px',
                          }}
                        >
                          카드 종류 *
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '8%',
                            minWidth: '90px',
                          }}
                        >
                          항목 *
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '9%',
                            minWidth: '95px',
                          }}
                        >
                          날짜 *
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '14%',
                            minWidth: '130px',
                          }}
                        >
                          이용가맹점
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '21%',
                            minWidth: '170px',
                          }}
                        >
                          비고
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '10%',
                            minWidth: '90px',
                          }}
                        >
                          금액
                        </th>
                        <th
                          style={{
                            textAlign: 'center',
                            width: '8%',
                            minWidth: '80px',
                          }}
                        >
                          지급액
                        </th>
                        {isManagerMode && status === 'SUBMITTED' && (
                          <th
                            style={{
                              width: '6%',
                              minWidth: '60px',
                              textAlign: 'center',
                            }}
                          >
                            확인
                          </th>
                        )}
                        <th
                          style={{
                            width: '4%',
                            minWidth: '50px',
                            textAlign: 'center',
                          }}
                        >
                          삭제
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? renderSkeletonRows(
                            isManagerMode && status === 'SUBMITTED' ? 10 : 9
                          )
                        : rows
                            .filter((row) => row.gbn === 'CORPORATE')
                            .map((row) => {
                              const originalIdx = rows.indexOf(row);
                              return (
                                <tr key={originalIdx}>
                                  <td
                                    style={{
                                      textAlign: 'center',
                                      fontWeight: 600,
                                      color: '#2c3e50',
                                    }}
                                  >
                                    법인
                                  </td>
                                  <td>
                                    <select
                                      value={row.corporateCard || ''}
                                      onChange={(e) =>
                                        updateRow(
                                          originalIdx,
                                          'corporateCard',
                                          e.target.value
                                        )
                                      }
                                      className="select-field"
                                      disabled={
                                        !isManagerMode || isInputDisabled()
                                      }
                                    >
                                      <option value="">선택</option>
                                      {corporateCards.map((card) => (
                                        <option
                                          key={card.cardId}
                                          value={card.cardId}
                                        >
                                          {card.cardName}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <select
                                      value={row.category || ''}
                                      onChange={(e) =>
                                        updateRow(
                                          originalIdx,
                                          'category',
                                          e.target.value
                                        )
                                      }
                                      className="select-field"
                                      disabled={
                                        !isManagerMode || isInputDisabled()
                                      }
                                    >
                                      <option value="">선택</option>
                                      {categories.map((cat) => (
                                        <option key={cat.code} value={cat.code}>
                                          {cat.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="date"
                                      value={row.date}
                                      onChange={(e) =>
                                        updateRow(
                                          originalIdx,
                                          'date',
                                          e.target.value
                                        )
                                      }
                                      className="input-field"
                                      disabled={
                                        !isManagerMode || isInputDisabled()
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      value={row.merchant || ''}
                                      onChange={(e) =>
                                        updateRow(
                                          originalIdx,
                                          'merchant',
                                          e.target.value
                                        )
                                      }
                                      className="input-field"
                                      placeholder="가맹점명"
                                      disabled={
                                        !isManagerMode || isInputDisabled()
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      value={row.description}
                                      onChange={(e) =>
                                        updateRow(
                                          originalIdx,
                                          'description',
                                          e.target.value
                                        )
                                      }
                                      className="input-field"
                                      placeholder="비고"
                                      disabled={isInputDisabled()}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={row.amount || ''}
                                      onChange={(e) =>
                                        handleMoneyChange(
                                          originalIdx,
                                          'amount',
                                          e.target.value
                                        )
                                      }
                                      onBlur={() =>
                                        handleMoneyBlur(originalIdx, 'amount')
                                      }
                                      className="input-field text-right"
                                      placeholder="0"
                                      disabled={
                                        !isManagerMode || isInputDisabled()
                                      }
                                    />
                                  </td>
                                  <td
                                    style={{
                                      textAlign: 'right',
                                      color: '#2c3e50',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {unformatToInt(
                                      row.amount || 0
                                    ).toLocaleString()}
                                  </td>
                                  {isManagerMode && status === 'SUBMITTED' && (
                                    <td
                                      style={{
                                        textAlign: 'center',
                                        verticalAlign: 'middle',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={row.managerConfirmed || false}
                                        onChange={(e) =>
                                          updateRow(
                                            originalIdx,
                                            'managerConfirmed',
                                            e.target.checked
                                          )
                                        }
                                        disabled={status === 'COMPLETED'}
                                        style={{
                                          cursor:
                                            status === 'COMPLETED'
                                              ? 'not-allowed'
                                              : 'pointer',
                                          width: '18px',
                                          height: '18px',
                                        }}
                                      />
                                    </td>
                                  )}
                                  <td
                                    style={{
                                      textAlign: 'center',
                                      verticalAlign: 'middle',
                                    }}
                                  >
                                    {isManagerMode &&
                                      (status === 'DRAFT' ||
                                        status === 'REJECTED' ||
                                        status === 'SUBMITTED') &&
                                      !managerChecked && (
                                        <button
                                          className="btn-delete"
                                          onClick={() => deleteRow(originalIdx)}
                                        >
                                          삭제
                                        </button>
                                      )}
                                  </td>
                                </tr>
                              );
                            })}
                    </tbody>
                  </table>
                </div>

                {isManagerMode &&
                  (status === 'DRAFT' ||
                    status === 'REJECTED' ||
                    status === 'SUBMITTED') &&
                  !(isManagerMode && !proxyMode && !isIdBasedQuery) && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={addCorporateCardRow}
                        className="btn-add-row"
                        style={{ background: '#9c27b0' }}
                      >
                        💳 법인카드 항목 추가
                      </button>
                    </div>
                  )}
              </section>
            ) : (
              // 일반 사용자 모드: 법인카드별로 그룹화하여 표시
              <>
                {(() => {
                  // 법인카드별로 그룹화
                  const corporateRows = rows.filter(
                    (row) => row.gbn === 'CORPORATE'
                  );
                  const groupedByCard = {};

                  corporateRows.forEach((row) => {
                    const cardId = row.corporateCard || 'unknown';
                    if (!groupedByCard[cardId]) {
                      groupedByCard[cardId] = [];
                    }
                    groupedByCard[cardId].push(row);
                  });

                  return Object.entries(groupedByCard).map(
                    ([cardId, cardRows]) => {
                      const cardInfo = corporateCards.find(
                        (c) => c.cardId === cardId
                      );
                      const cardName = cardInfo
                        ? cardInfo.cardName
                        : '미지정 카드';

                      return (
                        <section
                          key={cardId}
                          className="expense-section"
                          style={{ marginTop: '1.5rem' }}
                        >
                          <h2 className="section-title">
                            💳 {cardName} 상세 내역
                          </h2>

                          <div className="expense-table-container">
                            <table className="expense-table">
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      textAlign: 'center',
                                      width: '8%',
                                      minWidth: '80px',
                                    }}
                                  >
                                    구분
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'center',
                                      width: '12%',
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
                                      width: '16%',
                                      minWidth: '150px',
                                    }}
                                  >
                                    이용가맹점
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'center',
                                      width: '30%',
                                      minWidth: '180px',
                                    }}
                                  >
                                    비고
                                  </th>
                                  <th
                                    style={{
                                      textAlign: 'center',
                                      width: '12%',
                                      minWidth: '110px',
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
                                </tr>
                              </thead>
                              <tbody>
                                {isLoading
                                  ? renderSkeletonRows(7)
                                  : cardRows.map((row) => {
                                      const originalIdx = rows.indexOf(row);
                                      const categoryInfo = categories.find(
                                        (cat) => cat.code === row.category
                                      );
                                      const categoryName = categoryInfo
                                        ? categoryInfo.name
                                        : row.category || '';

                                      return (
                                        <tr key={originalIdx}>
                                          <td
                                            style={{
                                              textAlign: 'center',
                                              fontWeight: 600,
                                              color: '#2c3e50',
                                            }}
                                          >
                                            법인
                                          </td>
                                          <td>
                                            <select
                                              value={row.category || ''}
                                              onChange={(e) =>
                                                updateRow(
                                                  originalIdx,
                                                  'category',
                                                  e.target.value
                                                )
                                              }
                                              className="select-field"
                                              disabled={isInputDisabled()}
                                            >
                                              <option value="">선택</option>
                                              {categories.map((cat) => (
                                                <option
                                                  key={cat.code}
                                                  value={cat.code}
                                                >
                                                  {cat.name}
                                                </option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <input
                                              type="date"
                                              value={row.date}
                                              onChange={(e) =>
                                                updateRow(
                                                  originalIdx,
                                                  'date',
                                                  e.target.value
                                                )
                                              }
                                              className="input-field"
                                              disabled={isInputDisabled()}
                                            />
                                          </td>
                                          <td>{row.merchant || '-'}</td>
                                          <td>
                                            <input
                                              type="text"
                                              value={row.description}
                                              onChange={(e) =>
                                                updateRow(
                                                  originalIdx,
                                                  'description',
                                                  e.target.value
                                                )
                                              }
                                              className="input-field"
                                              placeholder="비고"
                                              disabled={isInputDisabled()}
                                            />
                                          </td>
                                          <td
                                            style={{
                                              textAlign: 'right',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {unformatToInt(
                                              row.amount || 0
                                            ).toLocaleString()}
                                          </td>
                                          <td
                                            style={{
                                              textAlign: 'right',
                                              color: '#2c3e50',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {unformatToInt(
                                              row.amount || 0
                                            ).toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      );
                    }
                  );
                })()}
              </>
            )}
          </>
        )}

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
          {/* 일반 사용자: 임시저장/제출/제출없음 버튼 */}
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
                  onClick={handleNoSubmit}
                  className="btn-secondary"
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  제출없음
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
          {/* 매니저 모드: 제출, 반려 상태에서 수정 가능, 임시저장 버튼만 표시 */}
          {isManagerMode &&
            !proxyMode &&
            isIdBasedQuery &&
            (status === 'DRAFT' ||
              status === 'SUBMITTED' ||
              status === 'REJECTED') &&
            !managerChecked && (
              <div className="button-group">
                <button
                  type="button"
                  onClick={handleModifySave}
                  className="btn-secondary"
                >
                  수정하기
                </button>
              </div>
            )}
          {/* 매니저 모드: 대리 신청 진행 중이면 일반 버튼 표시 */}
          {isManagerMode &&
            proxyMode &&
            (status === 'DRAFT' || status === 'REJECTED') &&
            !managerChecked && (
              <div className="button-group">
                <button
                  type="button"
                  onClick={handleTempSave}
                  className="btn-secondary"
                  disabled={false}
                >
                  임시 저장
                </button>
                <button
                  type="button"
                  onClick={handleNoSubmit}
                  className="btn-secondary"
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                  disabled={false}
                >
                  제출없음
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary"
                  disabled={false}
                >
                  제출하기
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

        {/* 유류비 정보 */}
        <section className="expense-section">
          <h2 className="section-title">💰 유류비 설정 정보</h2>
          <div className="form-group-horizontal">
            <div className="form-group">
              <label>기준연비 (km/L)</label>
              <input
                type="text"
                value={baseEfficiency.toFixed(1)}
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                title="차량연비 × 0.85로 자동 계산됩니다"
              />
            </div>
            <div className="form-group">
              <label>휘발유 (원/L)</label>
              <input
                type="text"
                value={
                  fuelTypes
                    .find((f) => f.name === '휘발유')
                    ?.price.toLocaleString() || '1,663'
                }
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>경유 (원/L)</label>
              <input
                type="text"
                value={
                  fuelTypes
                    .find((f) => f.name === '경유')
                    ?.price.toLocaleString() || '1,536'
                }
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>LPG (원/L)</label>
              <input
                type="text"
                value={
                  fuelTypes
                    .find((f) => f.name === 'LPG')
                    ?.price.toLocaleString() || '999'
                }
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>유지보수율</label>
              <input
                type="text"
                value={maintenanceRate}
                className="input-field"
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
          </div>
          <div
            className="info-box"
            style={{
              marginTop: '1rem',
              background: '#e3f2fd',
              borderLeftColor: '#1976d2',
            }}
          >
            <ul>
              <li>
                차량연비를 입력하면 기준연비가 자동으로 계산됩니다 (차량연비 ×
                0.85, 소수점 한자리).
              </li>
              <li>
                예: 차량연비 15 입력 → 기준연비 12.8로 계산되며, 이 값으로
                유류비가 계산됩니다.
              </li>
              <li>
                유류비는 하단의{' '}
                <strong>기준연비, 휘발유 가격, 유지보수율</strong>로 계산됩니다.
              </li>
              <li>
                위 유류비 설정은 {month || '해당'} 월 기준 관리자 설정값입니다.
              </li>
            </ul>
          </div>
        </section>

        {/* 안내사항 */}
        <section className="expense-section info-box">
          <h3>📌 안내사항</h3>
          <ul>
            <li>제출 후에는 경비 청구를 수정할 수 없습니다.</li>
            <li>담당자가 반려 처리한 경우에만 수정할 수 있습니다.</li>
            <li>
              임시 저장 기능을 이용하여 작성 중인 내용을 저장할 수 있습니다.
            </li>
            <li>유류비 항목은 거리를 입력하면 자동으로 금액이 계산됩니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
