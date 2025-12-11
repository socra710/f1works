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
  const [checked, setChecked] = useState(false); // 관리자 확인 완료 여부
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
  const fetchedInsightsRef = useRef(false); // React.StrictMode 중복 호출 방지
  const adminCheckRef = useRef(false); // React.StrictMode 중복 호출 방지

  useEffect(() => {
    if (fetchedInsightsRef.current) return; // React.StrictMode 중복 호출 방지
    fetchedInsightsRef.current = true;

    // 인사이트 데이터 가져오기
    const fetchInsights = async () => {
      setLoadingInsights(true);
      try {
        const factoryCode = '000001';

        // 근태왕 데이터 가져오기
        const attendanceData = await getAttendanceRanking(factoryCode);

        // 배차왕 데이터 가져오기
        const dispatchData = await getDispatchRanking(factoryCode);

        setInsights({
          attendance: attendanceData,
          dispatch: dispatchData,
        });
      } catch (error) {
        console.error('인사이트 데이터 로드 실패:', error);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchInsights();
  }, []);

  useEffect(() => {
    // 페이지 진입시 관리자 권한 확인
    // StrictMode에서도 한 번만 API 호출되도록 타이머 내부에서 가드
    const timer = setTimeout(async () => {
      if (adminCheckRef.current) return;
      adminCheckRef.current = true;

      try {
        // localStorage에서 userId 가져오기 (로그인 시 저장된 정보)
        let userId = null;

        // 다양한 형식으로 저장된 userId 시도
        const extensionLogin =
          localStorage.getItem('extensionLogin') ||
          sessionStorage.getItem('extensionLogin');

        if (extensionLogin) {
          try {
            // Base64 디코딩 시도
            userId = atob(extensionLogin);
          } catch (e) {
            // 디코딩 실패시 원본 사용
            userId = extensionLogin;
          }
        }

        // 다른 저장소 확인
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
          console.log('[Works] userId를 찾을 수 없습니다');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[Works] Admin check failed:', error);
        setIsAdmin(false);
      } finally {
        setChecked(true); // 관리자 확인 완료
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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

  // 관리자 권한에 따라 features 필터링
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

  const updates = [
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
        <div className="section-header">
          <h2>모든 서비스</h2>
          <p>필요한 기능을 선택하여 바로 이동하세요</p>
        </div>

        {checked ? (
          <div className="features-grid">
            {filteredFeatures.map((feature, index) => (
              <div
                key={index}
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
        ) : (
          <div className="skeleton-grid">
            {[...Array(9)].map((_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </div>
        )}
      </section>

      {/* Updates and Notices */}
      <section className="info-section">
        <div className="section-header">
          <h2>🎉 재미로 보는 인사이트</h2>
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
                <div className="king-ranking">
                  {/* 1위 - 왼쪽 큰 영역 */}
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

                  {/* 2-5위 - 오른쪽 세로 목록 */}
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
                              <div className="king-other-name">{user.name}</div>
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
                <div className="king-ranking">
                  {/* 1위 - 왼쪽 큰 영역 */}
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

                  {/* 2-5위 - 오른쪽 세로 목록 */}
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
                              <div className="king-other-name">{user.name}</div>
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
            </div>
          </div>
        </div>

        <div className="info-grid info-grid-secondary">
          {/* Recent Updates */}
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

          {/* Notices */}
          <div className="info-card notices-card">
            <div className="info-card-header">
              <h3>📌 공지사항</h3>
            </div>
            <div className="info-card-body">
              {notices.map((notice, index) => (
                <div key={index} className="info-item">
                  <div className="info-date">{notice.date}</div>
                  <div className="info-content">
                    <h4>{notice.title}</h4>
                    <p>{notice.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Section */}
      <section className="quick-info-section">
        <div className="quick-info-grid">
          {/* <div className="quick-info-card">
            <div className="quick-info-icon">💡</div>
            <h4>퀵링크 기능</h4>
            <p>웹사이트 정보를 팀원들과 손쉽게 공유하세요</p>
          </div> */}
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

      {/* Footer */}
      <footer className="works-footer">
        <p>© 2025 F1Works는 직원들의 업무 효율성 향상을 위해 만들어졌습니다.</p>
      </footer>
    </div>
  );
}
