import './index.css';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getAttendanceRanking, getDispatchRanking } from './expense/expenseAPI';
import { checkAdminRole } from './admin/adminAPI';
import { waitForExtensionLogin, decodeUserId } from '../common/extensionLogin';

// 날짜 기반 배지 표시 체크 함수 (한 달 이내인지 확인)
const isWithinOneMonth = (dateString) => {
  if (!dateString) return false;
  try {
    const targetDate = new Date(dateString);
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    return targetDate >= oneMonthAgo && targetDate <= now;
  } catch (err) {
    return false;
  }
};

export default function Works() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(() => {
    try {
      const cachedAdmin = sessionStorage.getItem('isAdminStatus');
      const cachedMenuKeys = sessionStorage.getItem('userMenuKeys');
      return (
        (cachedAdmin === 'true' || cachedAdmin === 'false') &&
        cachedMenuKeys !== null
      );
    } catch (err) {
      return false;
    }
  });
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [userMenuKeys, setUserMenuKeys] = useState(() => {
    try {
      const cached = sessionStorage.getItem('userMenuKeys');
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      return [];
    }
  });
  const [insights, setInsights] = useState({
    attendance: [
      { rank: 1, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 2, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 3, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 4, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 5, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
    ],
    dispatch: [
      { rank: 1, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 2, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 3, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 4, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
      { rank: 5, name: '데이터가 존재하지 않습니다', department: '', count: 0 },
    ],
  });
  const fetchedInsightsRef = useRef(false);
  const adminCheckRef = useRef(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedTab, setSelectedTab] = useState(() => {
    // sessionStorage에서 저장된 탭 불러오기
    const savedTab = sessionStorage.getItem('selectedTab');
    return savedTab || '업무';
  });
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [showAllNotices, setShowAllNotices] = useState(false);
  const VISIBLE_COUNT = 3;

  const persistAdminStatus = (status) => {
    try {
      sessionStorage.setItem('isAdminStatus', status ? 'true' : 'false');
    } catch (err) {
      // 세션스토리지 접근 불가 시 무시
    }
  };

  const persistUserMenuKeys = (menuKeys) => {
    try {
      sessionStorage.setItem('userMenuKeys', JSON.stringify(menuKeys || []));
    } catch (err) {
      // 세션스토리지 접근 불가 시 무시
    }
  };

  const hasAdminStatusCached = () => {
    try {
      const cachedAdmin = sessionStorage.getItem('isAdminStatus');
      const cachedMenuKeys = sessionStorage.getItem('userMenuKeys');
      return cachedAdmin !== null && cachedMenuKeys !== null;
    } catch (err) {
      return false;
    }
  };

  const skipAdminSkeleton = checked || hasAdminStatusCached();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (fetchedInsightsRef.current) return;
    fetchedInsightsRef.current = true;

    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const factoryCode = '000001';
        const attendanceData = await getAttendanceRanking(factoryCode);
        const dispatchData = await getDispatchRanking(factoryCode);
        setInsights({ attendance: attendanceData, dispatch: dispatchData });
      } catch (error) {
        console.error('인사이트 데이터 로드 실패:', error);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchInsights();
  }, []);

  useEffect(() => {
    if (adminCheckRef.current) return;
    adminCheckRef.current = true;

    (async () => {
      // 캐시된 권한 정보가 있으면 API 호출 건너뛰기
      const cachedAdmin = sessionStorage.getItem('isAdminStatus');
      const cachedMenuKeys = sessionStorage.getItem('userMenuKeys');
      const hasCachedData = cachedAdmin !== null && cachedMenuKeys !== null;

      if (hasCachedData) {
        // 캐시된 데이터만 사용하고 API 호출 건너뛰기
        setChecked(true);
        return;
      }

      try {
        const sessionUser = await waitForExtensionLogin({
          minWait: 0,
          maxWait: 2000,
        });
        const decodedUserId = sessionUser ? decodeUserId(sessionUser) : null;
        const fallbackUserId =
          localStorage.getItem('userId') || sessionStorage.getItem('userId');
        const userId = (decodedUserId || fallbackUserId || '').trim();

        if (userId) {
          try {
            // 헤더 우측 관리자 버튼 권한: jvWorksCheckAdminRole 기반
            const roleAll = await checkAdminRole({ userId });
            const headerAdmin =
              !!roleAll?.isSuperAdmin ||
              !!roleAll?.isGlobalAdmin ||
              !!roleAll?.isMenuAdmin;
            persistAdminStatus(headerAdmin);

            // 관리 탭 메뉴 권한: menuKeys 배열로 저장
            const menuKeys = Array.isArray(roleAll?.menuKeys)
              ? roleAll.menuKeys
                  .map((k) =>
                    typeof k === 'string' ? k.trim().toUpperCase() : '',
                  )
                  .filter((k) => k !== '')
              : [];

            // SuperAdmin이나 GlobalAdmin은 모든 권한 부여
            const finalMenuKeys =
              !!roleAll?.isSuperAdmin || !!roleAll?.isGlobalAdmin
                ? ['EXPENSE', 'EXPENSE_SUMMARY', 'GLOBAL', 'IFORM', ...menuKeys]
                : menuKeys;

            setUserMenuKeys(finalMenuKeys);
            persistUserMenuKeys(finalMenuKeys);
          } catch (apiError) {
            console.error('[Works] API 호출 실패:', apiError);
            setUserMenuKeys([]);
            persistAdminStatus(false);
            persistUserMenuKeys([]);
          }
        } else {
          setUserMenuKeys([]);
          persistAdminStatus(false);
          persistUserMenuKeys([]);
        }
      } catch (error) {
        console.error('[Works] Admin check failed:', error);
        setUserMenuKeys([]);
        persistAdminStatus(false);
        persistUserMenuKeys([]);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const categoryOrder = useMemo(
    () => ['업무', '게임', '메뉴', '뉴스', '관리'],
    [],
  );

  const allFeatures = useMemo(
    () => [
      {
        title: '배차 신청',
        description: '차량 배차를 쉽고 빠르게 신청하고 현황을 확인하세요',
        icon: '🚗',
        path: '/works/dispatch/car',
        category: '업무',
        inUpdate: '2025-12-16', // 업데이트 날짜
      },
      {
        title: '모니터 신청',
        description: '모니터 대여 신청 및 사용 현황을 관리하세요',
        icon: '🖥️',
        path: '/works/dispatch/monitor',
        category: '업무',
        inUpdate: '2025-12-16', // 업데이트 날짜
      },
      {
        title: '일정 관리',
        description: '개인 및 팀 일정을 한눈에 확인하고 관리하세요',
        icon: '📅',
        path: '/works/calendar',
        category: '업무',
      },
      {
        title: '경비 청구',
        description: '월별 경비를 청구하고 승인 현황을 확인하세요',
        icon: '💰',
        path: '/works/expense',
        category: '업무',
        inNew: '2025-12-15', // 신규 출시 날짜
      },
      {
        title: 'H/W 관리대장',
        description: '자산(하드웨어)을 등록하고 관리하세요',
        icon: '🖥️',
        path: '/works/asset/hw',
        category: '업무',
        inNew: '2025-12-22', // 신규 출시 날짜
      },
      {
        title: '통합 문서 작성(베타)',
        description: '동적 양식 기반의 문서 템플릿을 선택하고 작성하세요',
        icon: '🖥️',
        path: '/works/iform/user',
        category: '업무',
        inUpdate: '2026-02-03', // 업데이트 날짜
      },
      {
        title: '고객과의 연결고리',
        description:
          '고객사 방문·통화 이력을 관리하고 장기간 이상 미컨택 고객을 알림받으세요',
        icon: '👥',
        path: '/works/customer/contact',
        category: '업무',
        inNew: '2026-01-16', // 신규 출시 날짜
      },
      {
        title: '경비 청구 관리',
        description: '직원들의 경비 청구 내역을 확인하고 승인하세요',
        icon: '📊',
        path: '/works/expense-management',
        category: '관리',
        requiresAdmin: true,
        requiredMenuKey: 'EXPENSE',
        inNew: '2025-12-15', // 신규 출시 날짜
      },
      {
        title: '경비 청구 집계',
        description: '월별 마감된 경비 데이터를 집계하여 조회하세요',
        icon: '📈',
        path: '/works/expense-summary',
        category: '관리',
        requiresAdmin: true,
        requiredMenuKey: 'EXPENSE_SUMMARY',
        inNew: '2025-12-15', // 신규 출시 날짜
      },
      {
        title: '통합 문서 관리',
        description: '동적 양식 기반의 문서 템플릿을 생성하고 관리하세요',
        icon: '🖥️',
        path: '/works/iform',
        category: '관리',
        requiresAdmin: true,
        requiredMenuKey: 'IFORM',
        inNew: '2025-12-29', // 신규 출시 날짜
      },
      {
        title: '관리자 설정',
        description: 'F1Works 관리자 설정 페이지입니다',
        icon: '📊',
        path: '/works/admin',
        category: '관리',
        requiresAdmin: true,
        requiredMenuKey: 'GLOBAL',
        inNew: '2025-12-26', // 신규 출시 날짜
      },
      {
        title: '오늘의 단어',
        description: '영어 단어 퍼즐 게임으로 짧은 휴식을 즐겨보세요',
        icon: '🎮',
        path: '/games/wordle',
        category: '게임',
      },
      {
        title: '테트리스',
        description: '블록을 쌓아 라인을 지우는 클래식 게임',
        icon: '🎮',
        path: '/games/tetris',
        category: '게임',
        inNew: '2025-12-13', // 신규 출시 날짜
      },
      {
        title: '러너',
        description: '장애물을 피하며 달리는 러너 게임',
        icon: '🎮',
        path: '/games/runner',
        category: '게임',
        inNew: '2025-12-22', // 신규 출시 날짜
      },
      {
        title: '오늘의 메뉴',
        description: '소담뷔페 오늘의 메뉴를 확인하세요',
        icon: '🍽️',
        path: 'https://watbab.com',
        category: '메뉴',
      },
      {
        title: '뉴스 피드',
        description: 'Works 사용자를 위한 뉴스 피드',
        icon: '📰',
        path: '/feed',
        category: '뉴스',
        inUpdate: '2025-12-16', // 업데이트 날짜
      },
    ],
    [],
  );

  // 관리자 권한이 필요 없는 메뉴 (즉시 표시)
  const publicFeatures = useMemo(
    () => allFeatures.filter((feature) => !feature.requiresAdmin),
    [allFeatures],
  );

  // 관리자 권한이 필요한 메뉴 (권한 체크 후 표시)
  const adminFeatures = useMemo(
    () =>
      allFeatures.filter(
        (feature) =>
          feature.requiresAdmin &&
          (!feature.requiredMenuKey ||
            userMenuKeys.includes(feature.requiredMenuKey)),
      ),
    [allFeatures, userMenuKeys],
  );

  // 전체 메뉴 (일반 + 관리)
  const filteredFeatures = useMemo(
    () => [...publicFeatures, ...adminFeatures],
    [publicFeatures, adminFeatures],
  );

  const categoriesWithItems = useMemo(
    () =>
      categoryOrder
        .map((cat) => ({
          category: cat,
          items: filteredFeatures.filter((f) => f.category === cat),
          isAdminCategory: cat === '관리',
        }))
        .filter((g) => g.items.length > 0),
    [categoryOrder, filteredFeatures],
  );

  useEffect(() => {
    if (!checked || !categoriesWithItems.length) return;

    const hasSelected = categoriesWithItems.some(
      (cat) => cat.category === selectedTab,
    );

    if (!hasSelected) {
      const newTab = categoriesWithItems[0].category;
      setSelectedTab(newTab);
      sessionStorage.setItem('selectedTab', newTab);
    }
  }, [checked, categoriesWithItems, selectedTab, userMenuKeys]);

  const updates = [
    {
      date: '2026.04.17',
      title: 'F1Works 웹 폰트 변경 적용',
      description: 'KoPubWorldDotum 폰트가 적용되어 가독성이 향상되었습니다.',
    },
    {
      date: '2026.02.03',
      title: '통합 문서 작성 업데이트',
      description: '인쇄 미리보기 기능이 추가되고, 일부 버그가 수정되었습니다.',
    },
    {
      date: '2026.01.16',
      title: '고객과의 연결고리 기능 출시',
      description:
        '고객사 방문 및 통화 이력을 기록하고 30일 이상 미컨택 고객을 알림받는 기능이 추가되었습니다.',
    },
    {
      date: '2026.01.02',
      title: '통합 문서 작성(베타) 기능 출시',
      description:
        '통합 문서(동적 양식) 템플릿을 선택하고 작성할 수 있는 기능이 추가되었습니다.',
    },
    {
      date: '2025.12.22',
      title: 'H/W 관리대장 기능 출시',
      description:
        '보유 중인 하드웨어 자산을 효율적으로 관리합니다. 납품, A/S, 폐기 등 모든 내역을 한곳에서 기록하고 조회할 수 있습니다.',
    },
    {
      date: '2025.12.16',
      title: '배차/모니터/뉴스피드 UI/UX 개선',
      description:
        '배차/모니터/뉴스피드 페이지의 UI/UX가 더욱 직관적으로 개선되었습니다',
    },
    {
      date: '2025.12.13',
      title: '신규 게임 2종 출시',
      description:
        '테트리스와 러너 게임이 새롭게 추가되어 짧은 휴식을 즐기실 수 있습니다.',
    },
    {
      date: '2025.12.11',
      title: '재미로 보는 인사이트',
      description:
        '직원들의 근태·배차 데이터를 바탕으로 실시간 랭킹을 보여드립니다.',
    },
    {
      date: '2025.12.04',
      title: '경비 청구 기능 출시',
      description:
        '월별 경비 청구 및 승인 현황을 확인할 수 있는 기능이 추가되었습니다',
    },
    {
      date: '2025.12.03',
      title: '메인 페이지 개편',
      description: '모든 기능을 한눈에 볼 수 있는 대시보드 형태로 개선했습니다',
    },
    {
      date: '2025.12.01',
      title: '차량 정보 업데이트',
      description: '배차 시스템의 차량 정보가 최신화되었습니다',
    },
    {
      date: '2025.01.01',
      title: '모니터 신청 화면 추가',
      description: '모니터 대여 신청 및 현황 확인 기능이 추가되었습니다',
    },
  ];

  const notices = [
    {
      date: '2026.04.01',
      title: '오늘의 메뉴 알림 서비스 재개 안내',
      content: '오늘의 메뉴 알림 서비스가 재개되었습니다!',
    },
    {
      date: '2025.12.23',
      title: 'F1Works 커뮤니티 플로우 방 개설',
      content:
        'F1Soft 직원들을 위한 F1Works 커뮤니티 플로우 방이 개설되었습니다. 자유롭게 소통하고 정보를 공유하세요!',
      link: 'https://flow.team/Invitation/SDD7_0y6gY',
      isLink: true,
    },
    // {
    //   date: '2025.12.17',
    //   title: '경비 청구 안내 (12월 베타 운영)',
    //   content:
    //     '📢 12월은 온라인 경비청구 베타 기간입니다.\n' +
    //     '12월분 경비청구는 기존 방식과 온라인 경비청구를 병행하여 작성해 주세요.\n' +
    //     '베타 테스트를 거쳐 2026년 1월부터는 온라인 경비청구로만 진행될 예정입니다.\n\n' +
    //     '📍 온라인 경비청구 이용 방법\n' +
    //     '1. F1Works 확장 프로그램 다운로드(클릭)\n' +
    //     '2. 확장 프로그램에서 로그인\n' +
    //     '3. 통합 포털 아이콘 클릭 후 경비청구 메뉴 이동\n\n' +
    //     '⚠️ 사용자 정보 확인이 필수이므로 F1Works 로그인 상태에서만 이용 가능합니다.\n' +
    //     '⚠️ 베타 기간 중 일부 기능이 불안정할 수 있으니, 오류 발생 시 기존 방식으로도 함께 작성해 주세요.',
    //   link: 'https://chromewebstore.google.com/detail/f1works-extensions/ljpcdbbmboicadbkkkobjpnfgdaickjj?authuser=0&hl=ko',
    //   isLink: true,
    // },
    {
      date: '2025.12.12',
      title: '카카오 광고 게재 안내',
      content:
        '포털 및 콘텐츠 영역에 카카오 광고가 게재됩니다.\n현재는 운영자 개인 실험용으로 진행 중이며, 수익은 거의 없습니다.\n\n이용에 불편을 드려 죄송하며, 요청 시 광고 수익 현황은 투명하게 공개 가능합니다.\n(커피값도 안 나와요 😅) 🙏🏻',
    },
    {
      date: '2025.12.11',
      title: 'F1Works 확장 프로그램 다운로드',
      content: 'F1Works 확장 프로그램을 설치하여 더 편리하게 사용하세요',
      link: 'https://chromewebstore.google.com/detail/f1works-extensions/ljpcdbbmboicadbkkkobjpnfgdaickjj?authuser=0&hl=ko',
      isLink: true,
    },
    {
      date: '2025.12.01',
      title: '주유 카드 위치 안내',
      content: '주유 카드는 중앙 팔걸이 보관함 비닐 케이스에 있습니다',
    },
  ];

  // 상단 알림 배너 설정
  const topNotification = useMemo(
    () => ({
      id: 'notification-20251218-expense', // 공지마다 고유 ID (날짜-내용 형식 권장)
      type: 'info', // 'info', 'warning', 'success', 'error'
      message:
        '경비 청구(베타) 기능이 추가되었습니다! 12월은 베타 기간이니 기존 방식과 병행해 주세요.',
      link: '/works/expense',
      linkText: '지금 이용하기',
    }),
    [],
  );

  // 닫힌 공지 확인 및 알림 표시 여부 설정
  useEffect(() => {
    if (topNotification && topNotification.id) {
      const dismissedNotifications = JSON.parse(
        localStorage.getItem('dismissedNotifications') || '[]',
      );
      const isDismissed = dismissedNotifications.includes(topNotification.id);
      setNotificationVisible(!isDismissed);
    }
  }, [topNotification]);

  const handleDismissNotification = () => {
    setNotificationVisible(false);
    if (topNotification && topNotification.id) {
      const dismissedNotifications = JSON.parse(
        localStorage.getItem('dismissedNotifications') || '[]',
      );
      if (!dismissedNotifications.includes(topNotification.id)) {
        dismissedNotifications.push(topNotification.id);
        localStorage.setItem(
          'dismissedNotifications',
          JSON.stringify(dismissedNotifications),
        );
      }
    }
  };

  const handleNavigate = (path) => {
    if (path.startsWith('https://')) {
      window.open(path, '_blank');
      return;
    }
    navigate(path);
  };

  const renderFeatures = () => {
    if (!categoriesWithItems.length) return null;

    const activeCategory =
      categoriesWithItems.find((cat) => cat.category === selectedTab) ||
      categoriesWithItems[0];

    const isExpanded = expandedCategories[activeCategory.category] !== false;
    const visibleItems = isExpanded ? activeCategory.items : [];

    const toggleCategory = () =>
      setExpandedCategories((prev) => ({
        ...prev,
        [activeCategory.category]: !isExpanded,
      }));

    return (
      <div>
        <div
          className="tab-bar"
          style={{
            display: 'flex',
            gap: 8,
            // marginBottom: 12,
            overflowX: 'auto',
          }}
        >
          {categoryOrder.map((catName) => {
            // 일반 카테고리는 publicFeatures에서, 관리 카테고리는 체크 여부나 캐시 여부에 따라 표시
            const catData = categoriesWithItems.find(
              (c) => c.category === catName,
            );
            const isAdminCat = catName === '관리';

            // 관리 카테고리인데 아직 체크 안됐으면 스켈레톤
            if (isAdminCat && !skipAdminSkeleton) {
              return (
                <div
                  key={catName}
                  className="skeleton-tab-button"
                  style={{
                    width: '60px',
                    height: '36px',
                    borderRadius: 10,
                  }}
                />
              );
            }

            // 카테고리에 아이템이 없으면 표시 안함
            if (!catData) return null;

            const isActive = catData.category === activeCategory.category;
            const newCount = catData.items.filter((item) =>
              isWithinOneMonth(item.inNew),
            ).length;
            return (
              <button
                key={catData.category}
                onClick={() => {
                  setSelectedTab(catData.category);
                  // sessionStorage에 선택된 탭 저장
                  sessionStorage.setItem('selectedTab', catData.category);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: isActive ? '2px solid #4a5568' : '1px solid #e2e8f0',
                  background: isActive ? '#4a5568' : '#fff',
                  color: isActive ? '#fff' : '#4a5568',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {newCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isActive ? '#ff758c' : '#ff7eb3',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    {newCount}
                  </span>
                )}
                {catData.category}
              </button>
            );
          })}
        </div>

        <div>
          <div
            className="section-header"
            onClick={toggleCategory}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCategory();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          ></div>

          <div className="features-grid">
            {/* 관리 카테고리이고 아직 체크/캐시 안됐으면 스켈레톤 */}
            {activeCategory.isAdminCategory && !skipAdminSkeleton
              ? [...Array(2)].map((_, index) => (
                  <div key={index} className="skeleton-card" />
                ))
              : visibleItems.map((feature, index) => (
                  <div
                    key={`${activeCategory.category}-${index}`}
                    className="feature-card"
                    onClick={() => handleNavigate(feature.path)}
                  >
                    {isWithinOneMonth(feature.inNew) && (
                      <span className="feature-badge-new" aria-label="신규">
                        NEW
                      </span>
                    )}
                    {isWithinOneMonth(feature.inUpdate) && (
                      <span
                        className="feature-badge-updated"
                        aria-label="업데이트"
                      >
                        UPDATE
                      </span>
                    )}
                    <div className="feature-category">{feature.category}</div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    <div className="feature-arrow">→</div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="works-container">
      <Helmet>
        <title>F1Works - 통합 포털</title>
        <meta property="og:title" content="F1Works - 통합 포털" />
        <meta
          property="og:description"
          content="F1Soft 직원들을 위한 통합 업무 포털입니다."
        />
        <meta
          property="og:image"
          content="https://f1lab.co.kr:444/mail_sign/sign_logo01.jpg"
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works`}
        />
      </Helmet>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">F1Works</h1>
          <p className="hero-subtitle">F1Soft 직원들을 위한 통합 업무 포털</p>
          <p className="hero-description">
            업무 효율성을 높이고 팀원들과 소통하는 모든 것이 한 곳에
          </p>
        </div>
      </header>

      {/* Notification Banner */}
      {notificationVisible && (
        <div
          className={`notification-banner notification-${topNotification.type}`}
        >
          <div className="notification-content">
            <span className="notification-message">
              {topNotification.message}
            </span>
            {topNotification.link && (
              <button
                className="notification-link"
                onClick={() => handleNavigate(topNotification.link)}
              >
                {topNotification.linkText}
              </button>
            )}
          </div>
          <button
            className="notification-close"
            onClick={handleDismissNotification}
            aria-label="알림 닫기"
          >
            ✕
          </button>
        </div>
      )}

      {/* Features Grid */}
      <section className="features-section">
        {/* Mobile Ad (320x50) */}
        <div className="kakao-ad-mobile">
          <ins
            className="kakao_ad_area"
            data-ad-unit="DAN-7QuGrRryqcxW0vSl"
            data-ad-width="320"
            data-ad-height="50"
          ></ins>
        </div>

        {renderFeatures()}
      </section>

      {/* Desktop Ad (728x90) */}
      <div className="kakao-ad-desktop">
        <ins
          className="kakao_ad_area"
          data-ad-unit="DAN-lEKg1XIxGnp97OrH"
          data-ad-width="728"
          data-ad-height="90"
        ></ins>
      </div>
      {/* Updates and Notices */}
      <section className="info-section">
        <div className="info-grid info-grid-secondary">
          <div className="info-card updates-card">
            <div className="info-card-header">
              <h3>📢 최근 업데이트</h3>
            </div>
            <div className="info-card-body">
              {(showAllUpdates ? updates : updates.slice(0, VISIBLE_COUNT)).map(
                (update, index) => (
                  <div key={index} className="info-item">
                    <div className="info-date">{update.date}</div>
                    <div className="info-content">
                      <h4>{update.title}</h4>
                      <p>{update.description}</p>
                    </div>
                  </div>
                ),
              )}
              {updates.length > VISIBLE_COUNT && (
                <button
                  className="info-show-more"
                  onClick={() => setShowAllUpdates((prev) => !prev)}
                >
                  {showAllUpdates
                    ? '접기 ▲'
                    : `더보기 (${updates.length - VISIBLE_COUNT}건 더) ▼`}
                </button>
              )}
            </div>
          </div>

          <div className="info-card notices-card">
            <div className="info-card-header">
              <h3>📌 공지사항</h3>
            </div>
            <div className="info-card-body">
              {(showAllNotices ? notices : notices.slice(0, VISIBLE_COUNT)).map(
                (notice, index) => (
                  <div
                    key={index}
                    className="info-item"
                    onClick={() =>
                      notice.isLink && window.open(notice.link, '_blank')
                    }
                    style={{ cursor: notice.isLink ? 'pointer' : 'default' }}
                  >
                    <div className="info-date">{notice.date}</div>
                    <div className="info-content">
                      <h4>{notice.title}</h4>
                      <p style={{ whiteSpace: 'pre-line' }}>{notice.content}</p>
                    </div>
                  </div>
                ),
              )}
              {notices.length > VISIBLE_COUNT && (
                <button
                  className="info-show-more"
                  onClick={() => setShowAllNotices((prev) => !prev)}
                >
                  {showAllNotices
                    ? '접기 ▲'
                    : `더보기 (${notices.length - VISIBLE_COUNT}건 더) ▼`}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="info-grid info-grid-main">
          {/* Fun Insights */}
          <div className="info-card insights-card">
            <div className="info-card-header">
              <h3>👑 근태왕</h3>
            </div>
            <div className="info-card-body">
              {loadingInsights ? (
                <div className="king-ranking-skeleton">
                  <div className="skeleton-king-first">
                    <div className="skeleton-badge"></div>
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-name"></div>
                    <div className="skeleton-department"></div>
                  </div>
                  <div className="skeleton-king-others">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="skeleton-king-other-item">
                        <div className="skeleton-badge-small"></div>
                        <div className="skeleton-avatar-small"></div>
                        <div className="skeleton-text"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {insights.attendance.every(
                    (user) => user.name === '데이터가 존재하지 않습니다',
                  ) ? (
                    <div className="king-no-data">
                      데이터가 존재하지 않습니다
                    </div>
                  ) : (
                    <div className="king-ranking">
                      <div className="king-first">
                        <div className="king-rank-number">1위</div>
                        {insights.attendance[0]?.name !==
                          '데이터가 존재하지 않습니다' && (
                          <div className="king-avatar-circle">
                            {(insights.attendance[0]?.name || '집계')[1] +
                              (insights.attendance[0]?.name || '집계')[2]}
                          </div>
                        )}
                        <div className="king-name">
                          {insights.attendance[0]?.name || '집계 중...'}
                        </div>
                        <div className="king-department">
                          {insights.attendance[0]?.department || ''}
                        </div>
                      </div>

                      <div className="king-others">
                        {insights.attendance.slice(1, 5).map((user, index) => (
                          <div key={index} className="king-other-item">
                            <div className="king-other-badge">{user.rank}</div>
                            {user.rank <= 3 &&
                            user.name !== '데이터가 존재하지 않습니다' ? (
                              <>
                                <div className="king-other-avatar">
                                  {(user.name || '데이터')[1] +
                                    (user.name || '데이터')[2]}
                                </div>
                                <div className="king-other-info">
                                  <div className="king-other-name">
                                    {user.name}
                                  </div>
                                  <div className="king-other-department">
                                    {user.department}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="king-other-name">{user.name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dispatch Ranking */}
          <div className="info-card insights-card dispatch-card">
            <div className="info-card-header">
              <h3>🚗 배차왕</h3>
            </div>
            <div className="info-card-body">
              {loadingInsights ? (
                <div className="king-ranking-skeleton">
                  <div className="skeleton-king-first">
                    <div className="skeleton-badge"></div>
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-name"></div>
                    <div className="skeleton-department"></div>
                  </div>
                  <div className="skeleton-king-others">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="skeleton-king-other-item">
                        <div className="skeleton-badge-small"></div>
                        <div className="skeleton-avatar-small"></div>
                        <div className="skeleton-text"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {insights.dispatch.every(
                    (user) => user.name === '데이터가 존재하지 않습니다',
                  ) ? (
                    <div className="king-no-data">
                      데이터가 존재하지 않습니다
                    </div>
                  ) : (
                    <div className="king-ranking">
                      <div className="king-first">
                        <div className="king-rank-number">1위</div>
                        {insights.dispatch[0]?.name !==
                          '데이터가 존재하지 않습니다' && (
                          <div className="king-avatar-circle">
                            {(insights.dispatch[0]?.name || '집계')[1] +
                              (insights.dispatch[0]?.name || '집계')[2]}
                          </div>
                        )}
                        <div className="king-name">
                          {insights.dispatch[0]?.name || '집계 중...'}
                        </div>
                        <div className="king-department">
                          {insights.dispatch[0]?.department || ''}
                        </div>
                      </div>

                      <div className="king-others">
                        {insights.dispatch.slice(1, 5).map((user, index) => (
                          <div key={index} className="king-other-item">
                            <div className="king-other-badge">{user.rank}</div>
                            {user.rank <= 3 &&
                            user.name !== '데이터가 존재하지 않습니다' ? (
                              <>
                                <div className="king-other-avatar">
                                  {(user.name || '데이터')[1] +
                                    (user.name || '데이터')[2]}
                                </div>
                                <div className="king-other-info">
                                  <div className="king-other-name">
                                    {user.name}
                                  </div>
                                  <div className="king-other-department">
                                    {user.department}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="king-other-name">{user.name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="quick-info-section">
        <div className="quick-info-grid">
          <div className="quick-info-card">
            <div className="quick-info-icon">🔔</div>
            <h4>실시간 알림</h4>
            <p>중요한 업무와 일정을 놓치지 마세요</p>
          </div>
          <div className="quick-info-card">
            <div className="quick-info-icon">🤝</div>
            <h4>협업 강화</h4>
            <p>효율적인 자원 공유로 팀워크를 향상시키세요</p>
          </div>
        </div>
      </section>

      <footer className="works-footer">
        <p>© 2025 F1Works는 직원들의 업무 효율성 향상을 위해 만들어졌습니다.</p>
        {/* <a
          href="https://www.buymeacoffee.com/socra710"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <button
            style={{
              background: '#FFDD00',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ☕ 커피 한 잔 보내기
          </button>
        </a> */}
      </footer>
    </div>
  );
}
