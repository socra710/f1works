import './Dispatch.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // 추가

export default function Dispatch() {
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [authUser, setAuthUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setIsMobile(true);
    } else {
      setIsMobile(false);
    }

    setTimeout(() => {
      // 처음 컴포넌트가 마운트될 때 체크
      if (isMobile) {
        setAuthUser('m');
      } else {
        if (!window.sessionStorage.getItem('extensionLogin')) {
          alert('로그인이 필요한 서비스입니다.');
          navigate('/works');
          return;
        }
        setAuthUser(window.sessionStorage.getItem('extensionLogin'));
      }
      setLoading(false);
    }, 1000);
  }, [isMobile]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    document.body.appendChild(script);
  });

  const onMoveMonitor = () => {
    // alert('서비스 준비중..\n조금만 기다려주세요.');
    navigate('monitor');
  };

  const onMoveCar = () => {
    navigate('car');
  };

  return (
    <>
      <Helmet>
        <title>F1Soft 배차 및 모니터 신청</title>
        <meta property="og:title" content="F1Soft 배차 및 모니터 신청" />
        <meta
          property="og:description"
          content="F1Soft 배차 및 모니터를 신청하는 화면입니다."
        />
        <meta
          property="og:image"
          content="https://f1lab.co.kr:444/mail_sign/sign_logo01.jpg"
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works/dispatch`}
        />
      </Helmet>
      <main className="dispatch">
        <section>
          <div
            style={{ width: '400px', textAlign: 'center', padding: '80' }}
            className="div-space-between-dispatch"
          >
            <div style={{ margin: 'auto' }}>
              <span
                style={{
                  fontSize: '15px',
                  color: '#5C5F6B',
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '20px',
                }}
              >
                {' '}
                • 아래 메뉴를 선택해주세요.
              </span>
              <span style={{ display: 'inline-block', marginRight: '15px' }}>
                <button
                  className="button03"
                  id="monitorDispatch"
                  onClick={onMoveMonitor}
                >
                  모니터 <br />
                  현황/신청
                </button>
              </span>
              <span style={{ display: 'inline-block' }}>
                {' '}
                <button
                  className="button03"
                  id="carDispatch"
                  onClick={onMoveCar}
                >
                  배차 <br />
                  현황/신청
                </button>
              </span>
            </div>
          </div>
        </section>
        <section>
          <aside
            style={{
              flexBasis: '1000px',
              color: '#5c5f6b',
              fontSize: '14px',
            }}
          >
            <p>
              <sup>공지사항</sup>{' '}
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: '15px',
                  fontWeight: '600',
                }}
              ></span>
            </p>
            <ul>
              <li>
                - 주유 카드는 중앙 팔걸이 보관함 비닐 케이스에 있습니다.
                <span className="point01"></span>
              </li>
              {/* <li>
                - 배차신청 버튼을 클릭하면 기존 배차 신청 페이지로 이동됩니다.
                <span className="point01"></span>
              </li> */}
            </ul>
          </aside>
          <aside
            style={{
              flexBasis: '1000px',
              color: '#5c5f6b',
              fontSize: '14px',
            }}
          >
            <p>
              <sup>최근 업데이트 내역</sup>{' '}
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: '15px',
                  fontWeight: '600',
                }}
              ></span>
            </p>
            <ul>
              <li>
                - <span className="point01">차량 정보</span>가 업데이트
                되었습니다.<span className="point01"></span>
              </li>
              {/* <li>
                - <span className="point01">모니터 신청 화면</span>이 추가
                되었습니다.<span className="point01"></span>
              </li>
              <li>
                - 배차 및 모니터 신청 현황{' '}
                <span className="point01">관리번호</span> 항목이 추가
                되었습니다.
              </li> */}
            </ul>
          </aside>
        </section>
        <section>
          <iframe
            src="https://ads-partners.coupang.com/widgets.html?id=750727&template=carousel&trackingCode=AF6973392&subId=&width=380&height=50&tsource="
            width="650"
            height="100"
            frameborder="0"
            scrolling="no"
            referrerpolicy="unsafe-url"
            browsingtopics
          ></iframe>
        </section>
        <section
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            zIndex: 1000, // 다른 요소 위에 배치
            backgroundColor: '#fff', // 배경색 (필요에 따라 설정)
          }}
        >
          <ins
            className="kakao_ad_area"
            style={{ display: 'none' }}
            data-ad-unit="DAN-a0gNzc8RTnvzuTRI"
            data-ad-width="320"
            data-ad-height="100"
          ></ins>
        </section>
      </main>
    </>
  );
}
