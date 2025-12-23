import styles from './Monitor.module.css';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useToast } from '../../common/Toast';
import { waitForExtensionLogin, isMobileUA } from '../../common/extensionLogin';

import ModalHelp from '../components/ModalHelp2';

export default function Monitor() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isMobile, setIsMobile] = useState(false);
  const [authUser, setAuthUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [useDateFrom, setUseDateFrom] = useState('');
  const [useDateTo, setUseDateTo] = useState('');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const uaMobile = isMobileUA();
      if (!mounted) return;
      setIsMobile(uaMobile);

      if (uaMobile) {
        setAuthUser('m');
      } else {
        const extLogin = await waitForExtensionLogin({
          minWait: 500,
          maxWait: 2000,
        });
        if (!mounted) return;
        if (!extLogin) {
          showToast('로그인이 필요한 서비스입니다.', 'warning');
          navigate('/works');
          return;
        }
        setAuthUser(extLogin);
      }

      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
      script.async = true;
      document.body.appendChild(script);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [navigate, showToast]);

  const getStringToDate = () => {
    const curDate = new Date();
    const year = curDate.getFullYear();
    const month = curDate.getMonth() + 1;
    const day = curDate.getDate();
    return (
      year +
      '-' +
      ('00' + month.toString()).slice(-2) +
      '-' +
      ('00' + day.toString()).slice(-2)
    );
  };

  const getStringToDateTime = () => {
    const curDate = new Date();
    const year = curDate.getFullYear();
    const month = curDate.getMonth() + 1;
    const day = curDate.getDate();
    const hour = curDate.getHours();
    const minute = curDate.getMinutes();
    return (
      year +
      ('00' + month.toString()).slice(-2) +
      ('00' + day.toString()).slice(-2) +
      ('00' + hour.toString()).slice(-2) +
      ('00' + minute.toString()).slice(-2)
    );
  };

  const skeletonRows = Array.from({ length: 5 });
  const skeletonCols = Array.from({ length: 9 });

  const onSetDefault = useCallback(() => {
    document.querySelector('#appDate').value = getStringToDate();
    document.querySelector('#useDateFrom').min = getStringToDate();
    document.querySelector('#useDateTo').min = getStringToDate();

    document.querySelector('#div01').setAttribute('style', 'display:none');
    document.querySelector('#div02').setAttribute('style', 'display:none');

    document.querySelector('#appNo').removeAttribute('disabled');
  }, []);

  const onModifyForm = useCallback(
    (ele) => {
      const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
      const query =
        'factoryCode=000001&userId=' +
        myId +
        '&dispatchNo=' +
        ele.innerHTML +
        '&dateFrom=' +
        '&dateTo=' +
        '&dispatchGbn=02';

      fetch(`${API_BASE_URL}/jvWorksGetDispatch?` + query, {})
        .then((e) => e.json())
        .then((e) => {
          if (e.data.length === 0) {
            return;
          }

          if (e.success === 'false') {
            alert(
              '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                e.message
            );
            return;
          }

          const item = e.data[0];

          document.querySelector('#formDispatch').reset();

          document
            .querySelector('#div01')
            .setAttribute('style', 'display:none');
          document
            .querySelector('#div02')
            .setAttribute('style', 'display:none');

          document
            .querySelector('#btnSave')
            .setAttribute('style', 'display:none');
          document
            .querySelector('#btnModify')
            .setAttribute('style', 'float:right;margin-right:5px;');
          document.querySelector('#btnDelete').setAttribute('style', '');

          document.getElementById('myForm').style.display = 'block';

          document.querySelector('#dispatchNo').value = item.DISPATCH_NO;
          document.querySelector('#appNo').value = item.APP_NO;
          document.querySelector('#appNo').setAttribute('disabled', 'true');
          document.querySelector('#appDate').value = item.APP_DATE;
          document.querySelector('#rideUserName').value = item.RIDE_USER_NAME;
          document.querySelector('#useDateFrom').value = item.USE_DATE_FROM;
          document.querySelector('#useDateTo').value = item.USE_DATE_TO;
          document.querySelector('#useTimeFrom').value = item.USE_TIME_FROM;
          document.querySelector('#useTimeTo').value = item.USE_TIME_TO;
          document.querySelector('#locationName').value = item.LOCATION_NAME;
          document.querySelector('#distance').value = item.DISTANCE;
          document.querySelector('#fluxFrom').value = item.FLUX_FROM;
          document.querySelector('#fluxTo').value = item.FLUX_TO;
          document.querySelector('#oilingYn').value = item.OILING_YN;
          document.querySelector('#parkingArea').value = item.PARKING_AREA;

          document.querySelector('#bigo').value = item.BIGO.replaceAll(
            '<br />',
            '\r\n'
          );
        });
    },
    [authUser, API_BASE_URL]
  );

  const onViewDispatch = useCallback(() => {
    const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
    const query =
      'factoryCode=000001&userId=' +
      myId +
      '&dateFrom=' +
      '&dateTo=' +
      '&dispatchGbn=02';

    setLoading(true);
    fetch(`${API_BASE_URL}/jvWorksGetDispatch?` + query, {})
      .then((e) => e.json())
      .then((e) => {
        if (e.data.length === 0) {
          return;
        }

        if (e.success === 'false') {
          alert(
            '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
              e.message
          );
          return;
        }

        const ele = document.querySelector('#tbDispatch');

        // 로딩 완료 (스켈레톤 제거)
        setLoading(false);

        // 스켈레톤이 제거된 후 tbody 정리 (이제 스켈레톤 JSX 요소가 없음)
        setTimeout(() => {
          ele.innerHTML = '';

          // 모바일에서는 이 요소들이 없으므로 체크 후 업데이트
          const supNo261 = document.querySelector(`#supNoA-261`);
          if (supNo261) {
            supNo261.setAttribute('style', 'background-color:#808080');
            supNo261.innerHTML = '미사용';
          }
          const supNo262 = document.querySelector(`#supNoA-262`);
          if (supNo262) {
            supNo262.setAttribute('style', 'background-color:#808080');
            supNo262.innerHTML = '미사용';
          }
          const supNo263 = document.querySelector(`#supNoA-263`);
          if (supNo263) {
            supNo263.setAttribute('style', 'background-color:#808080');
            supNo263.innerHTML = '미사용';
          }

          for (let i = 0; i < e.data.length; i++) {
            const item = e.data[i];

            const tr = document.createElement('tr');

            let td = document.createElement('td');
            td.innerHTML = i + 1;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML =
              '<a href="javascript:void(0)" class="aTagDispatCh" style="cursor:pointer;color:#667eea;">' +
              item.DISPATCH_NO +
              '</a>';
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML = item.APP_DATE;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML = item.APP_NO;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML = item.USE_DATE_FROM + ' (' + item.USE_TIME_FROM + ')';
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML = item.USE_DATE_TO + ' (' + item.USE_TIME_TO + ')';
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:left;');
            td.innerHTML = item.LOCATION_NAME;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
            td.innerHTML = item.RIDE_USER_NAME;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:left;');
            td.innerHTML = item.BIGO;
            tr.append(td);

            ele.append(tr);

            if (
              Number(item.USE_DATE_FROM_CHECK) <=
                Number(getStringToDateTime()) &&
              Number(getStringToDateTime()) <= Number(item.USE_DATE_TO_CHECK)
            ) {
              const supNoElement = document.querySelector(
                `#supNo${item.APP_NO}`
              );
              if (supNoElement) {
                supNoElement.setAttribute('style', '');
                supNoElement.innerHTML = '사용중';
              }
            }
          }

          document.querySelectorAll('.aTagDispatCh').forEach((target) =>
            target.addEventListener('click', function () {
              document.querySelector('#lightbox').style.display = 'block';
              onModifyForm(this);
            })
          );
        }, 0);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // 스켈레톤 제거는 이미 setTimeout 내에서 처리됨
      });
  }, [authUser, API_BASE_URL, onModifyForm]);

  const changeDateFrom = (event) => {
    const newDateFrom = event.target.value;
    setUseDateFrom(newDateFrom);
    setUseDateTo(newDateFrom);
  };

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const openDispatch = document.querySelector('#openDispatch');
    const closeDispatch = document.querySelector('#closeDispatch');
    const helpDispatch = document.querySelector('#helpDispatch');
    const formDispatch = document.querySelector('#formDispatch');
    const modifyDispatch = document.querySelector('#btnModify');
    const deleteDispatch = document.querySelector('#btnDelete');

    const handleOpen = () => {
      document.querySelector('#lightbox').style.display = 'block';
      document.querySelector('#formDispatch').reset();
      onSetDefault();

      document
        .querySelector('#btnSave')
        .setAttribute('style', 'float:right;margin-right:5px;');
      document
        .querySelector('#btnModify')
        .setAttribute('style', 'display:none');
      document
        .querySelector('#btnDelete')
        .setAttribute('style', 'visibility:hidden');

      document.getElementById('myForm').style.display = 'block';
    };

    const handleClose = () => {
      document.querySelector('#lightbox').style.display = 'none';
      document.getElementById('myForm').style.display = 'none';
    };

    const handleHelp = () => {
      document.querySelector('#btn-help')?.click();
      setIsOpen(true);
    };

    const handleSubmit = async (event) => {
      event.preventDefault();

      try {
        const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
        const query =
          '' +
          'factoryCode=000001' +
          '&dispatchNo=' +
          document.querySelector('#dispatchNo').value +
          '&rideUserName=' +
          document.querySelector('#rideUserName').value +
          '&useDateFrom=' +
          document.querySelector('#useDateFrom').value +
          '&useDateTo=' +
          document.querySelector('#useDateTo').value +
          '&useTimeFrom=' +
          document.querySelector('#useTimeFrom').value +
          '&useTimeTo=' +
          document.querySelector('#useTimeTo').value +
          '&locationName=' +
          document.querySelector('#locationName').value +
          '&distance=' +
          document.querySelector('#distance').value +
          '&fluxFrom=' +
          document.querySelector('#fluxFrom').value +
          '&fluxTo=' +
          document.querySelector('#fluxTo').value +
          '&oilingYn=' +
          document.querySelector('#oilingYn').value +
          '&parkingArea=' +
          document.querySelector('#parkingArea').value +
          '&bigo=' +
          document
            .querySelector('#bigo')
            .value.replace(/(?:\r\n|\r|\n)/g, '<br />') +
          '&appNo=' +
          document.querySelector('#appNo').value +
          '&dispatchGbn=02' +
          '&opmanCode=' +
          myId +
          '&iud=IU';
        fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
          .then((e) => e.json())
          .then((e) => {
            if (e.success === 'false') {
              alert(
                '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                  e.message
              );
              return;
            }

            const x = document.getElementById('snackbar');
            x.className = 'show';
            x.innerHTML = '모니터가 신청 되었습니다.';

            document.querySelector('#lightbox').style.display = 'none';
            document.getElementById('myForm').style.display = 'none';

            setTimeout(function () {
              x.className = x.className.replace('show', '');
            }, 3000);

            onViewDispatch();
          });
      } catch (error) {
        console.log(error);
      }
    };

    const handleModify = (event) => {
      event.preventDefault();

      try {
        const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
        const query =
          '' +
          'factoryCode=000001' +
          '&dispatchNo=' +
          document.querySelector('#dispatchNo').value +
          '&rideUserName=' +
          document.querySelector('#rideUserName').value +
          '&useDateFrom=' +
          document.querySelector('#useDateFrom').value +
          '&useDateTo=' +
          document.querySelector('#useDateTo').value +
          '&useTimeFrom=' +
          document.querySelector('#useTimeFrom').value +
          '&useTimeTo=' +
          document.querySelector('#useTimeTo').value +
          '&locationName=' +
          document.querySelector('#locationName').value +
          '&distance=' +
          document.querySelector('#distance').value +
          '&fluxFrom=' +
          document.querySelector('#fluxFrom').value +
          '&fluxTo=' +
          document.querySelector('#fluxTo').value +
          '&oilingYn=' +
          document.querySelector('#oilingYn').value +
          '&parkingArea=' +
          document.querySelector('#parkingArea').value +
          '&bigo=' +
          document
            .querySelector('#bigo')
            .value.replace(/(?:\r\n|\r|\n)/g, '<br />') +
          '&appNo=' +
          document.querySelector('#appNo').value +
          '&dispatchGbn=02' +
          '&opmanCode=' +
          myId +
          '&iud=IU';
        fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
          .then((e) => e.json())
          .then((e) => {
            if (e.success === 'false') {
              alert(
                '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                  e.message
              );
              return;
            }

            const x = document.getElementById('snackbar');
            x.className = 'show';
            x.innerHTML = '수정 되었습니다.';

            document.querySelector('#lightbox').style.display = 'none';
            document.getElementById('myForm').style.display = 'none';

            setTimeout(function () {
              x.className = x.className.replace('show', '');
            }, 3000);

            onViewDispatch();
          });
      } catch (error) {
        console.log(error);
      }
    };

    const handleDelete = (event) => {
      event.preventDefault();

      const isConfirmed = window.confirm(
        '모니터 신청 내역을 삭제하시겠습니까?'
      );
      if (isConfirmed) {
        try {
          const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
          const query =
            '' +
            'factoryCode=000001' +
            '&dispatchNo=' +
            document.querySelector('#dispatchNo').value +
            '&rideUserName=' +
            document.querySelector('#rideUserName').value +
            '&useDateFrom=' +
            document.querySelector('#useDateFrom').value +
            '&useDateTo=' +
            document.querySelector('#useDateTo').value +
            '&useTimeFrom=' +
            document.querySelector('#useTimeFrom').value +
            '&useTimeTo=' +
            document.querySelector('#useTimeTo').value +
            '&locationName=' +
            document.querySelector('#locationName').value +
            '&distance=' +
            document.querySelector('#distance').value +
            '&fluxFrom=' +
            document.querySelector('#fluxFrom').value +
            '&fluxTo=' +
            document.querySelector('#fluxTo').value +
            '&oilingYn=' +
            document.querySelector('#oilingYn').value +
            '&parkingArea=' +
            document.querySelector('#parkingArea').value +
            '&bigo=' +
            document
              .querySelector('#bigo')
              .value.replace(/(?:\r\n|\r|\n)/g, '<br />') +
            '&appNo=' +
            document.querySelector('#appNo').value +
            '&dispatchGbn=02' +
            '&opmanCode=' +
            myId +
            '&iud=D';
          fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
            .then((e) => e.json())
            .then((e) => {
              if (e.success === 'false') {
                alert(
                  '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                    e.message
                );
                return;
              }

              const x = document.getElementById('snackbar');
              x.className = 'show';
              x.innerHTML = '삭제 되었습니다.';

              document.querySelector('#lightbox').style.display = 'none';
              document.getElementById('myForm').style.display = 'none';

              setTimeout(function () {
                x.className = x.className.replace('show', '');
              }, 3000);

              onViewDispatch();
            });
        } catch (error) {
          console.log(error);
        }
      }
    };

    openDispatch?.addEventListener('click', handleOpen);
    closeDispatch?.addEventListener('click', handleClose);
    helpDispatch?.addEventListener('click', handleHelp);
    formDispatch?.addEventListener('submit', handleSubmit);
    modifyDispatch?.addEventListener('click', handleModify);
    deleteDispatch?.addEventListener('click', handleDelete);

    onViewDispatch();

    return () => {
      openDispatch?.removeEventListener('click', handleOpen);
      closeDispatch?.removeEventListener('click', handleClose);
      helpDispatch?.removeEventListener('click', handleHelp);
      formDispatch?.removeEventListener('submit', handleSubmit);
      modifyDispatch?.removeEventListener('click', handleModify);
      deleteDispatch?.removeEventListener('click', handleDelete);
    };
  }, [authUser, API_BASE_URL, onSetDefault, onViewDispatch]);

  // 변경: 로딩 표시
  if (!authUser) {
    return (
      <div className={`${styles['car-shell']} ${styles['div-monitor']}`}>
        <div
          className={styles.loadingBar}
          role="status"
          aria-label="인증 확인 중"
        >
          <div className={styles.loadingBarIndicator} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>업무 모니터 신청 현황</title>
        <meta property="og:title" content="업무 모니터 신청 현황" />
        <meta
          property="og:description"
          content="F1Soft 회사 업무 모니터 신청하는 화면입니다."
        />
        <meta property="og:url" content={`https://f1works.netlify.app/`} />
      </Helmet>
      <div className={`${styles['car-shell']} ${styles['div-car']}`}>
        <main className={styles['car-content']}>
          {loading && (
            <div
              className={styles.loadingBar}
              role="status"
              aria-label="데이터 로딩 중"
            >
              <div className={styles.loadingBarIndicator} />
            </div>
          )}
          <section className={styles['dispatch-hero']}>
            <div className={styles['dispatch-hero__text']}>
              <h1 className={styles['hero-title']}>휴대용 모니터 신청</h1>
              <p className={styles['hero-sub']}>
                출장지나 외근지에서도 듀얼 화면을 편하게 사용할 수 있도록
                모니터를 사전 예약해 주세요. <br />
                사용 후에는 케이스/케이블을 함께 반납해 주세요.
              </p>
              <div className={styles['hero-meta']}>
                <span className={`${styles['chip']} ${styles['chip--solid']}`}>
                  제우스랩 P15A 3대 운영
                </span>
                <span className={styles['chip']}>신청 후 승인 사용</span>
                <span className={styles['chip']}>최대 3일 예약 권장</span>
              </div>
            </div>
            <div className={styles['dispatch-hero__status']}>
              <div className={styles['stat-card']}>
                <p className={styles['stat-label']}>신청/반납 규칙</p>
                <p className={styles['stat-value']}>최대 3일</p>
                <small className={styles['stat-desc']}>
                  장기 예약은 제한될 수 있습니다.
                </small>
              </div>
              <div className={styles['stat-card']}>
                <p className={styles['stat-label']}>사용 후 필수</p>
                <p className={styles['stat-value']}>케이스+케이블 반납</p>
                <small className={styles['stat-desc']}>
                  이상 발견 시 관리팀에 바로 알림.
                </small>
              </div>
            </div>
          </section>

          {!isMobile && (
            <div className={styles['info-grid']}>
              <div className={styles['info-card']}>
                <p>
                  <sup>필독</sup>
                  <b>휴대용 모니터 사용 지침</b>
                </p>
                <ul>
                  <li>예약 신청 후 사용 가능합니다.</li>
                  <li>
                    다른 사용자를 위해 <b>3일 초과 예약</b>은 자제해 주세요.
                  </li>
                  <li>사용 후 케이블 등 부속을 케이스에 함께 보관해 주세요.</li>
                  <li>
                    <b>제품 이상</b> 발견 시 관리팀에 즉시 문의해 주세요.
                  </li>
                  <li>
                    사용자 부주의 파손 시 <b>본인 부담</b>으로 수리 또는
                    구매합니다.
                  </li>
                </ul>
              </div>
              <div className={`${styles['info-card']} ${styles['info-spec']}`}>
                <p>
                  <b>모니터 정보</b>
                </p>
                <ul>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>
                    관리번호 : <b>A-261</b>
                    <sup
                      id="supNoA-261"
                      style={{
                        backgroundColor: '#808080',
                        marginLeft: '6px',
                      }}
                    >
                      미사용
                    </sup>
                  </li>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>
                    관리번호 : <b>A-262</b>
                    <sup
                      id="supNoA-262"
                      style={{
                        backgroundColor: '#808080',
                        marginLeft: '6px',
                      }}
                    >
                      미사용
                    </sup>
                  </li>
                  <li>모델명 : 제우스랩 휴대용 모니터 P15A</li>
                  <li>
                    관리번호 : <b>A-263</b>
                    <sup
                      id="supNoA-263"
                      style={{
                        backgroundColor: '#808080',
                        marginLeft: '6px',
                      }}
                    >
                      미사용
                    </sup>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className={styles['ad-row']}>
            <div className={`${styles['ad-card']} ${styles['pc-ad']}`}>
              <ins
                className="kakao_ad_area"
                data-ad-unit="DAN-rcLaDXdMxv9mHsky"
                data-ad-width="728"
                data-ad-height="90"
              ></ins>
            </div>
            <div className={`${styles['ad-card']} ${styles['mobile-ad']}`}>
              <ins
                className="kakao_ad_area"
                data-ad-unit="DAN-F48lGg5Zh7muOpDY"
                data-ad-width="320"
                data-ad-height="50"
              ></ins>
            </div>
          </div>

          <div className={styles['dispatch-toolbar']}>
            <i className={styles['infoI']}>
              💡 작성된 신청 내역은 <b>신청번호*</b>를 클릭하여 수정할 수
              있습니다.
            </i>
            <div className={styles['toolbar-actions']}>
              <button
                id="helpDispatch"
                className={`${styles['btnHelp']} ${styles['btn-ghost']}`}
              >
                신청 안내
              </button>
              <button
                id="openDispatch"
                className={`${styles['btn']} ${styles['btn-elevated']}`}
              >
                모니터 신청
              </button>
            </div>
          </div>

          <section>
            <div className={styles['table-wrapper']}>
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>신청번호*</th>
                    <th>신청일</th>
                    <th>관리번호</th>
                    <th>사용일 (시간)</th>
                    <th>종료일 (시간)</th>
                    <th>출장지</th>
                    <th>사용자</th>
                    <th>특이사항</th>
                  </tr>
                </thead>
                <tbody id="tbDispatch">
                  {loading &&
                    skeletonRows.map((_, idx) => (
                      <tr key={`monitor-skeleton-${idx}`}>
                        {Array.from({ length: 9 }).map((__, colIdx) => (
                          <td key={`monitor-skeleton-cell-${idx}-${colIdx}`}>
                            <span className={styles.skeletonCell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <div className={styles['form-popup']} id="myForm">
          <form id="formDispatch" className={styles['form-container']}>
            <h3>모니터 신청</h3>
            <hr style={{ margin: '0 0 1rem 0' }} />

            <div className={styles['form-row']}>
              <div className={`${styles['field']} ${styles['field--full']}`}>
                <label htmlFor="dispatchNo">
                  <b>신청번호</b>
                </label>
                <input
                  type="text"
                  id="dispatchNo"
                  name="dispatchNo"
                  placeholder="자동생성"
                  readOnly
                />
              </div>
              <div className={styles['field']}>
                <label htmlFor="appDate">
                  <b>신청일</b>
                </label>
                <input
                  type="date"
                  id="appDate"
                  name="appDate"
                  required
                  readOnly
                />
              </div>
            </div>

            <div className={styles['form-row']}>
              <div className={styles['field']}>
                <label htmlFor="appNo">
                  <b>모니터 선택</b>
                </label>
                <select id="appNo" name="appNo" required>
                  <option value="">선택하세요</option>
                  <option value="A-261">A-261(P15A)</option>
                  <option value="A-262">A-262(P15A)</option>
                  <option value="A-263">A-263(P15A)</option>
                </select>
              </div>
              <div className={styles['field']}>
                <label htmlFor="rideUserName">
                  <b>사용자</b>
                </label>
                <input
                  type="text"
                  id="rideUserName"
                  name="rideUserName"
                  required
                />
              </div>
            </div>

            <div className={styles['form-row']}>
              <div className={styles['field']}>
                <label htmlFor="useDate">
                  <b>사용일</b>
                </label>
                <div className={styles['inline-row']}>
                  <input
                    type="date"
                    placeholder="출발"
                    id="useDateFrom"
                    name="useDateFrom"
                    onChange={changeDateFrom}
                    defaultValue={useDateFrom}
                    required
                  />
                  <input
                    type="date"
                    placeholder="복귀"
                    id="useDateTo"
                    name="useDateTo"
                    defaultValue={useDateTo}
                    required
                  />
                </div>
              </div>

              <div className={styles['field']}>
                <label htmlFor="useTime">
                  <b>사용시간</b>
                </label>
                <div className={styles['inline-row']}>
                  <input
                    type="time"
                    placeholder="출발"
                    id="useTimeFrom"
                    name="useTimeFrom"
                    required
                  />
                  <input
                    type="time"
                    placeholder="복귀"
                    id="useTimeTo"
                    name="useTimeTo"
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles['form-row']}>
              <div className={styles['field']}>
                <label htmlFor="locationName">
                  <b>출장지</b>
                </label>
                <input
                  type="text"
                  id="locationName"
                  name="locationName"
                  required
                />
              </div>
            </div>

            <div id="div01" className={styles['form-row']}>
              <div className={styles['field']}>
                <label htmlFor="distance">
                  <b>이동거리</b>
                </label>
                <input type="text" id="distance" name="distance" />
              </div>
              <div className={styles['field']}>
                <label htmlFor="flux">
                  <b>유량(%)</b>
                </label>
                <div className={styles['inline-row']}>
                  <input
                    type="number"
                    placeholder="출발"
                    id="fluxFrom"
                    name="fluxFrom"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="복귀"
                    id="fluxTo"
                    name="fluxTo"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div id="div02" className={styles['form-row']}>
              <div className={styles['field']}>
                <label htmlFor="oilingYn">
                  <b>주유여부(경유)</b>
                </label>
                <input type="text" id="oilingYn" name="oilingYn" />
              </div>
              <div className={styles['field']}>
                <label htmlFor="parkingArea">
                  <b>주차구역</b>
                </label>
                <input type="text" id="parkingArea" name="parkingArea" />
              </div>
            </div>

            <div id="div03" className={styles['form-row']}>
              <div className={`${styles['field']} ${styles['field--full']}`}>
                <label htmlFor="bigo">
                  <b>특이사항</b>
                </label>
                <textarea
                  className={styles['textarea-lg']}
                  id="bigo"
                  name="bigo"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div className={styles['form-actions']}>
              <button
                type="button"
                id="btnDelete"
                className={styles['btn']}
                style={{ display: 'none' }}
              >
                삭제하기
              </button>
              <div className={styles['form-actions-right']}>
                <button type="submit" id="btnSave" className={styles['btn']}>
                  신청하기
                </button>
                <button
                  type="button"
                  id="btnModify"
                  className={styles['btn']}
                  style={{ display: 'none' }}
                >
                  수정하기
                </button>
                <button
                  id="closeDispatch"
                  type="button"
                  className={`${styles['btn']} ${styles['cancel']}`}
                >
                  닫기
                </button>
              </div>
            </div>
          </form>
        </div>

        <ModalHelp isOpen={isOpen} />
        <div id="snackbar">Some text some message..</div>
        <div id="lightbox">
          <img id="lightboxImage" alt="상세 이미지" />
        </div>
      </div>
    </>
  );
}
