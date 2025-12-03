import './index.css';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

export default function Works() {
  const navigate = useNavigate();

  const features = [
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
      title: 'Wordle 게임',
      description: '영어 단어 퍼즐 게임으로 짧은 휴식을 즐겨보세요',
      icon: '🎮',
      path: '/games/wordle',
      category: '게임',
    },
    {
      title: '오늘의 메뉴',
      description: '식당의 오늘 메뉴를 확인하세요',
      icon: '🍽️',
      path: 'https://watbab.com',
      category: '메뉴',
    },
    {
      title: '피드',
      description: 'Works 사용자를 위한 뉴스 피드',
      icon: '📰',
      path: '/feed',
      category: '뉴스',
    },
  ];

  const updates = [
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

        <div className="features-grid">
          {features.map((feature, index) => (
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
      </section>

      {/* Updates and Notices */}
      <section className="info-section">
        <div className="info-grid">
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
