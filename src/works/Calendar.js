import './Calendar.css';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // 추가
import { waitForExtensionLogin, isMobileUA } from '../common/extensionLogin';
import { useToast } from '../common/Toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import koLocale from '@fullcalendar/core/locales/ko';
import ModalHelp from './components/ModalHelp';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Calendar() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isMobile, setIsMobile] = useState(false);
  const [authUser, setAuthUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [innerWidth, setInnerWidth] = useState(window.innerWidth);
  const [renderHeight, setRenderHeight] = useState(false);
  const [initialView, setInitialView] = useState('dayGridMonth');
  const [headerToolbar, setHeaderToolbar] = useState({
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay', // 월별 및 주별 뷰를 전환할 수 있는 UI 추가
  });

  const calendarRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const uaMobile = isMobileUA();
      if (!mounted) return;
      setIsMobile(uaMobile);

      const extLogin = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      if (!mounted) return;
      if (!extLogin) {
        showToast('로그인이 필요한 서비스입니다.', 'error');
        navigate('/works');
        return;
      }
      setAuthUser(extLogin);

      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
      script.async = true;
      document.body.appendChild(script);

      setLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    onViewCalendar();
  }, [authUser]);

  const onViewCalendar = () => {
    var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
    const query = 'factoryCode=000001&userId=' + myId;
    fetch(`${API_BASE_URL}/jvWorksGetCalendar?${query}`, {})
      .then((e) => e.json())
      .then((e) => {
        if (e.data.length === 0) {
          return;
        }

        if (e.success === 'false') {
          showToast(
            '시스템 내부 문제가 발생했습니다. 관리자에게 문의하세요.',
            'error'
          );
          return;
        }

        setEvents(e.data);
      });
  };

  // const getStringToDate = () => {
  //   const curDate = new Date();
  //   const year = curDate.getFullYear();
  //   const month = curDate.getMonth() + 1;
  //   const day = curDate.getDate();

  //   const convertDate =
  //     year +
  //     '-' +
  //     ('00' + month.toString()).slice(-2) +
  //     '-' +
  //     ('00' + day.toString()).slice(-2);

  //   return convertDate;
  // };

  const onCreateSch = () => {
    showToast('서비스 준비중입니다.', 'info');
  };

  const resizeListener = () => {
    setInnerWidth(window.innerWidth);
  };

  // const onDateClick = (date) => {
  //   onOpenScheduleDialog(date);
  //   console.log(date);
  // };

  // const onOpenScheduleDialog = (selected) => {
  //   setSelectedDate(selected);
  //   setIsOpenScheduleDialog(true);
  // };

  useEffect(() => {
    window.addEventListener('resize', resizeListener);

    return () => {
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  useEffect(() => {
    if (isMobile || innerWidth < 767) {
      setRenderHeight('auto');
      setHeaderToolbar({
        left: 'title',
        right: 'prev,next today,listWeek', // 월별 및 주별 뷰를 전환할 수 있는 UI 추가
      });
      setInitialView('listWeek');

      if (calendarRef.current) {
        calendarRef.current.getApi().changeView('listWeek');
      }
    } else {
      setRenderHeight('100%');
      setHeaderToolbar({
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay', // 월별 및 주별 뷰를 전환할 수 있는 UI 추가
      });
      setInitialView('dayGridMonth');

      if (calendarRef.current) {
        calendarRef.current.getApi().changeView('dayGridMonth');
      }
    }
  }, [innerWidth]);

  return (
    <>
      <Helmet>
        <title>Works캘린더</title>
        <meta property="og:title" content="Works캘린더" />
        <meta
          property="og:description"
          content="Works 사용자의 일정을 관리하는 화면입니다."
        />
        <meta
          property="og:image"
          content="https://f1lab.co.kr:444/mail_sign/sign_logo01.jpg"
        />
        <meta
          property="og:url"
          content={`https://codefeat.netlify.app/works/calendar`}
        />
      </Helmet>

      {loading ? (
        <section className="section-calendar">
          <div className="loading-bar" role="status" aria-label="로딩 중">
            <div className="loading-bar__indicator" />
          </div>
        </section>
      ) : (
        <>
          <header className="header-calendar">
            <nav className="nav-calendar">
              <h3>Works캘린더</h3>
            </nav>
          </header>
          <main className="main-calendar">
            <div
              className="div-flex-calendar"
              style={{ width: '100%', height: '100%' }}
            >
              <div className="div-flex-calendar1">
                <button className="btnCreateSch" onClick={onCreateSch}>
                  일정 만들기
                </button>
                {/* <div
                  className="bottom-div-kakao-mobile"
                  style={{ justifyContent: 'center', margin: '0 auto' }}
                >
                  <ins
                    className="kakao_ad_area"
                    data-ad-unit="DAN-JOCnGXp6XUwu70kK"
                    data-ad-width="320"
                    data-ad-height="50"
                  ></ins>
                </div> */}
                <article>
                  <aside>
                    <p>캘린더구분</p>
                  </aside>
                  <ul className="ul-calendar">
                    <li className="li-calendar">
                      <input
                        className="input-calendar checkbox1"
                        type="checkbox"
                        readOnly
                        checked="checked"
                      />
                      <label className="label-calendar">개인 일정</label>
                    </li>
                    <li className="li-calendar">
                      <input
                        className="input-calendar checkbox2"
                        type="checkbox"
                        readOnly
                        checked="checked"
                      />
                      <label className="label-calendar">연차 일정</label>
                    </li>
                    <li className="li-calendar">
                      <input
                        className="input-calendar checkbox3"
                        type="checkbox"
                        readOnly
                        checked="checked"
                      />
                      <label className="label-calendar">모니터/배차 일정</label>
                    </li>
                    <li className="li-calendar">
                      <input
                        className="input-calendar checkbox4"
                        type="checkbox"
                        readOnly
                        checked="checked"
                      />
                      <label className="label-calendar">생일 일정</label>
                    </li>
                    <li className="li-calendar">
                      <input
                        className="input-calendar checkbox5"
                        type="checkbox"
                        readOnly
                        checked="checked"
                      />
                      <label className="label-calendar">외근 일정</label>
                    </li>
                  </ul>
                </article>
                <div
                  className="bottom-div-kakao-calendar"
                  style={{
                    justifyContent: 'center',
                    margin: '0 auto',
                    display: isMobile || innerWidth < 767 ? 'none' : 'block',
                  }}
                >
                  <ins
                    className="kakao_ad_area"
                    style={{ height: '100%' }}
                    data-ad-unit="DAN-vDPJxStOywYqmdm0"
                    data-ad-width="160"
                    data-ad-height="600"
                  ></ins>
                </div>
              </div>
              <div className="div-flex-calendar2">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[
                    dayGridPlugin,
                    timeGridPlugin,
                    listPlugin,
                    interactionPlugin,
                  ]}
                  initialView={initialView}
                  headerToolbar={headerToolbar}
                  locale={koLocale}
                  height={renderHeight}
                  dayMaxEventRows={true} // for all non-TimeGrid views
                  weekends={true}
                  events={events}
                  // selectable={true}
                  // dateClick={onDateClick}
                />
              </div>
            </div>
          </main>
          <ModalHelp isOpen={isOpen} />
          <div id="snackbar">Some text some message..</div>
          <div id="lightbox">
            <img id="lightboxImage" />
          </div>
        </>
      )}
    </>
  );
}
