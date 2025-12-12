import './index.css';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  checkAdminStatus,
  getAttendanceRanking,
  getDispatchRanking,
} from './expense/expenseAPI';

export default function Works() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(true);
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
  const [selectedTab, setSelectedTab] = useState('업무');

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
    const timer = setTimeout(async () => {
      if (adminCheckRef.current) return;
      adminCheckRef.current = true;

      try {
        let userId = null;
        const extensionLogin =
          localStorage.getItem('extensionLogin') ||
          sessionStorage.getItem('extensionLogin');

        if (extensionLogin) {
          try {
            userId = atob(extensionLogin);
          } catch (e) {
            userId = extensionLogin;
          }
        }

        if (!userId) {
          userId =
            localStorage.getItem('userId') || sessionStorage.getItem('userId');
        }

        if (userId && userId.trim()) {
          try {
            const adminStatus = await checkAdminStatus(userId.trim());
            setIsAdmin(adminStatus);
          } catch (apiError) {
            console.error('[Works] API 호출 실패:', apiError);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[Works] Admin check failed:', error);
        setIsAdmin(false);
      } finally {
        setChecked(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const categoryOrder = useMemo(
    () => ['업무', '관리', '게임', '메뉴', '뉴스'],
    []
  );

  const allFeatures = useMemo(
    () => [
      {
        title: '배차 신청',
        description: '차량 배차를 쉽고 빠르게 신청하고 현황을 확인하세요',
        icon: '🚗',
        path: '/works/dispatch/car',
        category: '업무',
      },
      {
        title: '모니터 신청',
        description: '모니터 대여 신청 및 사용 현황을 관리하세요',
        icon: '🖥️',
        path: '/works/dispatch/monitor',
        category: '업무',
      },
      {
        title: '일정 관리',
        description: '개인 및 팀 일정을 한눈에 확인하고 관리하세요',
        icon: '📅',
        path: '/works/calendar',
        category: '업무',
      },
      {
        title: '경비 청구(베타)',
        description: '월별 경비를 청구하고 승인 현황을 확인하세요',
        icon: '💰',
        path: '/works/expense',
        category: '업무',
        requiresAdmin: false,
      },
      {
        title: '경비 청구 관리',
        description: '직원들의 경비 청구 내역을 확인하고 승인하세요',
        icon: '📊',
        path: '/works/expense-management',
        category: '관리',
        requiresAdmin: true,
      },
      {
        title: '경비 청구 집계',
        description: '월별 마감된 경비 데이터를 집계하여 조회하세요',
        icon: '📈',
        path: '/works/expense-summary',
        category: '관리',
        requiresAdmin: true,
      },
      {
        title: 'Wordle 게임',
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
      },
    ],
    []
  );

  const filteredFeatures = useMemo(
    () =>
      allFeatures.filter((feature) => {
        if (feature.requiresAdmin) {
          return isAdmin;
        }
        return true;
      }),
    [allFeatures, isAdmin]
  );

  const categoriesWithItems = useMemo(
    () =>
      categoryOrder
        .map((cat) => ({
          category: cat,
          items: filteredFeatures.filter((f) => f.category === cat),
        }))
        .filter((g) => g.items.length > 0),
    [categoryOrder, filteredFeatures]
  );

  useEffect(() => {
    if (!categoriesWithItems.length) return;
    const hasSelected = categoriesWithItems.some(
      (cat) => cat.category === selectedTab
    );
    if (!hasSelected) {
      setSelectedTab(categoriesWithItems[0].category);
    }
  }, [categoriesWithItems, selectedTab]);

  const updates = [
    {
      date: '2025.12.11',
      title: '재미로 보는 인사이트',
      description:
        '직원들의 근태·배차 데이터를 바탕으로 실시간 랭킹을 보여드립니다.',
    },
    {
      date: '2025.12.04',
      title: '경비 청구(베타) 기능 출시',
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
      date: '2025.12.12',
      title: '카카오 광고 게재 안내',
      content:
        '포털과 콘텐츠에 카카오 광고가 게재됩니다.\n수익은 거의 없으니 불편하게 보지 말아주세요 😅\n운영자 개인 실험용이며, 요청 시 수익 현황 투명하게 공개 가능합니다.\n(커피값도 안 나와요 ㅠㅠ) 🙏🏻🙏🏻',
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
          {categoriesWithItems.map((cat) => {
            const isActive = cat.category === activeCategory.category;
            return (
              <button
                key={cat.category}
                onClick={() => setSelectedTab(cat.category)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: isActive ? '2px solid #4a5568' : '1px solid #e2e8f0',
                  background: isActive ? '#4a5568' : '#fff',
                  color: isActive ? '#fff' : '#4a5568',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.category}
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
            {visibleItems.map((feature, index) => (
              <div
                key={`${activeCategory.category}-${index}`}
                className="feature-card"
                onClick={() => handleNavigate(feature.path)}
              >
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
        <title>F1Works - 직원 포털</title>
        <meta property="og:title" content="F1Works - 직원 포털" />
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

        {checked ? (
          renderFeatures()
        ) : (
          <div className="skeleton-grid">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </div>
        )}
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
                    (user) => user.name === '데이터가 존재하지 않습니다'
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
                    (user) => user.name === '데이터가 존재하지 않습니다'
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

        <div className="info-grid info-grid-secondary">
          <div className="info-card updates-card">
            <div className="info-card-header">
              <h3>📢 최근 업데이트</h3>
            </div>
            <div className="info-card-body">
              {updates.map((update, index) => (
                <div key={index} className="info-item">
                  <div className="info-date">{update.date}</div>
                  <div className="info-content">
                    <h4>{update.title}</h4>
                    <p>{update.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="info-card notices-card">
            <div className="info-card-header">
              <h3>📌 공지사항</h3>
            </div>
            <div className="info-card-body">
              {notices.map((notice, index) => (
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
              ))}
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
      </footer>
    </div>
  );
}
