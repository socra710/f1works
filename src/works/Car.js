import './Monitor.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // 추가
import ClipLoader from 'react-spinners/ClipLoader'; //설치한 cliploader을 import한다

import ModalHelp from './components/ModalHelp';

export default function Car() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [authUser, setAuthUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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

    var openDispatch = document.querySelector('#openDispatch');
    openDispatch.addEventListener('click', function (event) {
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
    });

    var closeDispatch = document.querySelector('#closeDispatch');
    closeDispatch.addEventListener('click', function (event) {
      document.querySelector('#lightbox').style.display = 'none';
      document.getElementById('myForm').style.display = 'none';
    });

    var helpDispatch = document.querySelector('#helpDispatch');
    helpDispatch.addEventListener('click', function (event) {
      document.querySelector('#btn-help').click();
      setIsOpen(true);
    });

    var formDispatch = document.querySelector('#formDispatch');
    formDispatch.addEventListener('submit', async function (event) {
      event.preventDefault();

      try {
        var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
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
          '&dispatchGbn=01' +
          '&opmanCode=' +
          myId +
          '&iud=IU';
        fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
          .then((e) => e.json())
          .then((e) => {
            if (e.success === 'false') {
              // chrome.storage.sync.set({ attendanceDate: getStringToDate() });
              alert(
                '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                  e.message
              );
              return;
            }

            var x = document.getElementById('snackbar');
            x.className = 'show';
            x.innerHTML = '배차가 신청 되었습니다.';

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
    });

    var modifyDispatch = document.querySelector('#btnModify');
    modifyDispatch.addEventListener('click', function (event) {
      event.preventDefault();

      try {
        var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
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
          '&dispatchGbn=01' +
          '&opmanCode=' +
          myId +
          '&iud=IU';
        fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
          .then((e) => e.json())
          .then((e) => {
            if (e.success === 'false') {
              // chrome.storage.sync.set({ attendanceDate: getStringToDate() });
              alert(
                '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                  e.message
              );
              return;
            }

            var x = document.getElementById('snackbar');
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
    });

    var deleteDispatch = document.querySelector('#btnDelete');
    deleteDispatch.addEventListener('click', function (event) {
      event.preventDefault();

      var isConfirmed = window.confirm('배차신청 내역을 삭제하시겠습니까?');
      if (isConfirmed) {
        try {
          var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
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
            '&dispatchGbn=01' +
            '&opmanCode=' +
            myId +
            '&iud=D';
          fetch(`${API_BASE_URL}/jvWorksSetDispatch?` + query, {})
            .then((e) => e.json())
            .then((e) => {
              if (e.success === 'false') {
                // chrome.storage.sync.set({ attendanceDate: getStringToDate() });
                alert(
                  '시스템 내부 문제가 발생했습니다.\n상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요.\n\n상세내용 >> ' +
                    e.message
                );
                return;
              }

              var x = document.getElementById('snackbar');
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
      } else {
        event.preventDefault();
      }
    });

    onViewDispatch();
  }, [authUser]);

  const getStringToDate = () => {
    const curDate = new Date();
    const year = curDate.getFullYear();
    const month = curDate.getMonth() + 1;
    const day = curDate.getDate();

    const convertDate =
      year +
      '-' +
      ('00' + month.toString()).slice(-2) +
      '-' +
      ('00' + day.toString()).slice(-2);

    return convertDate;
  };

  const onSetDefault = () => {
    document.querySelector('#appDate').value = getStringToDate();
    document.querySelector('#useDateFrom').min = getStringToDate();
    document.querySelector('#useDateTo').min = getStringToDate();

    document.querySelector('#div01').setAttribute('style', 'display:none');
    document.querySelector('#div02').setAttribute('style', 'display:none');

    document.querySelector('#appNo').removeAttribute('disabled');
  };

  const onViewDispatch = () => {
    var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
    const query =
      'factoryCode=000001&userId=' +
      myId +
      '&dateFrom=' +
      '&dateTo=' +
      '&dispatchGbn=01';

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
        while (ele.firstChild) {
          ele.firstChild.remove();
        }

        for (var i = 0; i < e.data.length; i++) {
          const item = e.data[i];

          let tr = document.createElement('tr');

          let td = document.createElement('td');
          td.innerHTML = i + 1;
          tr.append(td);

          // 신청번호
          td = document.createElement('td');
          td.innerHTML =
            '<a href="#" class="aTagDispatCh">' + item.DISPATCH_NO + '</a>';
          tr.append(td);

          // 신청일
          td = document.createElement('td');
          td.innerHTML = item.APP_DATE;
          tr.append(td);

          // 관리번호
          td = document.createElement('td');
          td.innerHTML = item.APP_NO;
          tr.append(td);

          // 사용일
          td = document.createElement('td');
          td.innerHTML = item.USE_DATE_FROM + ' (' + item.USE_TIME_FROM + ')';
          tr.append(td);

          // 사용일
          td = document.createElement('td');
          td.innerHTML = item.USE_DATE_TO + ' (' + item.USE_TIME_TO + ')';
          tr.append(td);

          // td = document.createElement('td');
          // td.innerHTML = item.USE_TIME_FROM;
          // tr.append(td);

          // td = document.createElement('td');
          // td.innerHTML = item.USE_TIME_TO;
          // tr.append(td);

          td = document.createElement('td');
          td.setAttribute('style', 'text-align:left;');
          td.innerHTML = item.LOCATION_NAME;
          tr.append(td);

          td = document.createElement('td');
          td.innerHTML = item.DISTANCE;
          tr.append(td);

          td = document.createElement('td');
          td.innerHTML = item.FLUX_FROM + '/' + item.FLUX_TO;
          tr.append(td);

          // td = document.createElement('td');
          // td.innerHTML = item.FLUX_TO;
          // tr.append(td);

          td = document.createElement('td');
          td.innerHTML = item.OILING_YN;
          tr.append(td);

          td = document.createElement('td');
          td.innerHTML = item.RIDE_USER_NAME;
          tr.append(td);

          td = document.createElement('td');
          td.setAttribute('style', 'text-align:left;');
          td.innerHTML = item.PARKING_AREA;
          tr.append(td);

          td = document.createElement('td');
          td.setAttribute('style', 'text-align:left;');
          td.innerHTML = item.BIGO;
          tr.append(td);

          ele.append(tr);
        }

        document.querySelectorAll('.aTagDispatCh').forEach((target) =>
          target.addEventListener('click', function (evt) {
            document.querySelector('#lightbox').style.display = 'block';
            onModifyForm(this);
          })
        );
      });
  };

  const onModifyForm = (ele) => {
    var myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
    const query =
      'factoryCode=000001&userId=' +
      myId +
      '&dispatchNo=' +
      ele.innerHTML +
      '&dateFrom=' +
      '&dateTo=' +
      '&dispatchGbn=01';

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

        document.querySelector('#div01').setAttribute('style', '');
        document.querySelector('#div02').setAttribute('style', '');

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
  };

  const [useDateFrom, setUseDateFrom] = useState('');
  const [useDateTo, setUseDateTo] = useState('');

  const changeDateFrom = (event) => {
    const newDateFrom = event.target.value;
    setUseDateFrom(newDateFrom);

    // Additional logic to update useDateTo based on useDateFrom if needed
    const newDateTo = newDateFrom;
    setUseDateTo(newDateTo);
  };

  return (
    <>
      <Helmet>
        <title>업무 차량 배차 신청 현황</title>
        <meta property="og:title" content="업무 차량 배차 신청 현황" />
        <meta
          property="og:description"
          content="F1Soft 회사 업무 차량 배차 신청하는 화면입니다."
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
      <div className="div-monitor">
        {loading ? (
          <section className="container">
            <ClipLoader
              color="#f88c6b"
              loading={loading} //useState로 관리
              size={150}
            />
          </section>
        ) : (
          <>
            <main style={{ padding: '0', maxWidth: 'max-content' }}>
              <div
                className="bottom-div-kakao"
                style={{
                  justifyContent: 'center',
                  margin: '5px auto',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  zIndex: 1000, // 다른 요소 위에 배치
                  backgroundColor: '#fff', // 배경색 (필요에 따라 설정)
                }}
              >
                <ins
                  className="kakao_ad_area"
                  data-ad-unit="DAN-pZmlN1MItQ7KYhKe"
                  data-ad-width="728"
                  data-ad-height="90"
                ></ins>
              </div>
              <div
                className="bottom-div-kakao-mobile"
                style={{
                  justifyContent: 'center',
                  margin: '5px auto',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  zIndex: 1000, // 다른 요소 위에 배치
                  backgroundColor: '#fff', // 배경색 (필요에 따라 설정)
                }}
              >
                <ins
                  className="kakao_ad_area"
                  data-ad-unit="DAN-SbkOGtj1vmVCDoVX"
                  data-ad-width="320"
                  data-ad-height="50"
                ></ins>
              </div>
              <section className="pc_exp">
                <div className="div-space-between" style={{ width: '100%' }}>
                  <aside style={{ width: '60%', minHeight: '310px' }}>
                    <p>
                      <sup>필독</sup>
                      <b>업무용 차량 운용 및 배차 요령</b>
                    </p>
                    <ul>
                      <li>
                        신청은 1일 전에 신청하되 급한 용무에 한해 당일 배차 가능
                        <mark>(단, 선배차된 사용자 우선)</mark>
                      </li>
                      <li>
                        차량 관리 : 최정욱 부장, 키 수령 : 백지선 선임 자리
                        책꽂이, 최정욱 부장 자리 옆 칸막이
                      </li>
                      <li>
                        사용 후 특이사항에 주차위치 기재, 출발전과 복귀후 반드시
                        이동거리 및 유량(%)을 체크할 것.
                      </li>
                      <li>
                        주유 및 주차비는 영수증 첨부하여 개별 경비 청구할 것.
                      </li>
                      <li>
                        운전자 부주의로 법규 미준수하여 과태료
                        <mark>(과속, 주정차 등)</mark> 부과시 본인 부담으로
                        과태료 납부할 것.
                      </li>
                      <li>
                        차량에 이상 발생<mark>(파손, 사고, 고장증세 등)</mark>시
                        특이사항에 기재할 것.
                      </li>
                      <li>
                        <b>사용 후 키를 반드시 관리팀에 반납할 것.</b>
                        <mark>
                          (외부에서 퇴근하여 바로 반납이 불가한 경우에는
                          관리팀에 알려주시기 바랍니다.)
                        </mark>
                      </li>
                      <li>
                        <b>차량내 금연</b>해주시고 <b>연비 운전</b>{' '}
                        부탁드립니다.
                        <mark>
                          (차간거리 충분히 유지, 탄력운전, 급출발 및 급제동 지양
                          등)
                        </mark>
                      </li>
                      <li>
                        <b>출발 및 복귀</b> 시간을 정확하게 입력 부탁드립니다.
                        <mark>
                          (복귀 시간이 다음날을 넘어갈 경우 복귀일을 정확하게
                          입력할것.)
                        </mark>
                      </li>
                    </ul>
                  </aside>
                  <aside style={{ width: '40%', minHeight: '310px' }}>
                    <p>
                      <b>차량 정보</b>
                    </p>
                    <ul>
                      <li>모델명 : 기아 더뉴 카니발 9인승 럭셔리</li>
                      <li>
                        차량번호 : <b>245로 4279</b>
                      </li>
                      <li>
                        유종 및 배기량 : <b>디젤</b>(2199CC)
                      </li>
                      <li>연월식 : 18년 5월식(19년형)</li>
                      <li>주행거리 : 98,000KM</li>
                      <li>
                        구매처 : K CAR 안양직영점(이성원
                        차량평가사,0501-13740-3514)
                      </li>
                      <li>구매일 : 2022년 8월 30일</li>
                      <li>
                        하이패스 : <b>있음</b>
                      </li>
                      <li>
                        주유카드 :{' '}
                        <b style={{ color: 'red' }}>
                          중앙 팔걸이 보관함 비닐 케이스에 있음
                        </b>
                      </li>
                    </ul>
                  </aside>
                </div>
              </section>
              <div className="div-space-between2">
                <i className="infoI">
                  💡 작성된 배차 신청 내역은 <b>신청번호</b>를 클릭하여 수정할
                  수 있습니다.
                </i>
                <div
                  style={{ justifyContent: 'space-between', display: 'flex' }}
                >
                  <button
                    id="openDispatch"
                    className="btn"
                    style={{ marginRight: '5px' }}
                  >
                    배차 신청
                  </button>
                  <button
                    id="helpDispatch"
                    className="btnHelp"
                    style={{ fontSize: '13px' }}
                  >
                    도움말
                  </button>
                </div>
              </div>
              <section>
                <table className="table_style">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th class="importantCell">신청번호</th>
                      <th>신청일</th>
                      <th>관리번호</th>
                      <th>출발일 (시간)</th>
                      <th>복귀일 (시간)</th>
                      <th>출장지</th>
                      <th>이동거리</th>
                      <th>출발유량/복귀유량</th>
                      <th>주유여부(경유)</th>
                      <th>운전자</th>
                      <th>주차구역</th>
                      <th>정비이력 등 특이사항</th>
                    </tr>
                    {/* <tr>
                      <th rowSpan="2" colSpan="1">No</th>
                      <th rowSpan="2" colSpan="1" className="importantCell">신청번호</th>
                      <th rowSpan="2" colSpan="1">신청일</th>
                      <th className="thparent" rowSpan="1" colSpan="2">사용일</th>
                      <th className="thparent" rowSpan="1" colSpan="2">사용시간</th>
                      <th rowSpan="2" colSpan="1">출장지</th>
                      <th rowSpan="2" colSpan="1">이동거리</th>
                      <th className="thparent" rowSpan="1" colSpan="2">유량(%)</th>
                      <th rowSpan="2" colSpan="1">주유여부(경유)</th>
                      <th rowSpan="2" colSpan="1">운전자</th>
                      <th rowSpan="2" colSpan="1">주차구역</th>
                      <th rowSpan="2" colSpan="1">정비이력 등 특이사항</th>
                    </tr>
                    <tr>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopLeftRadius: '0', textAlign: 'center' }}>출발</th>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopRightRadius: '0' }}>복귀</th>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopLeftRadius: '0' }}>출발</th>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopRightRadius: '0' }}>복귀</th>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopLeftRadius: '0' }}>출발</th>
                      <th className="thchild" style={{ backgroundColor: '#fafafa', borderTopRightRadius: '0' }}>복귀</th>
                    </tr> */}
                  </thead>
                  <tbody id="tbDispatch"></tbody>
                </table>
              </section>
            </main>
            <div className="form-popup" id="myForm">
              <form id="formDispatch" className="form-container">
                <h3>배차 신청</h3>
                <hr style={{ margin: '0 0 1rem 0' }} />

                <div className="div-space-between">
                  <div style={{ marginRight: '5px', width: '100%' }}>
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
                  <div style={{ marginRight: '5px', width: '100%' }}>
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

                <div className="div-space-between">
                  <div style={{ marginRight: '5px', width: '100%' }}>
                    <label htmlFor="appNo">
                      <b>차량 선택</b>
                    </label>
                    <select id="appNo" name="appNo" required>
                      <option value="">선택하세요</option>
                      <option value="245-4279">245-4279(카니발)</option>
                    </select>
                  </div>
                  <div style={{ width: '100%' }}>
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

                <div className="div-space-between">
                  <div style={{ marginRight: '5px', width: '100%' }}>
                    <label htmlFor="useDate">
                      <b>사용일</b>
                    </label>
                    <div className="div-space-between">
                      <input
                        type="date"
                        placeholder="출발"
                        id="useDateFrom"
                        name="useDateFrom"
                        style={{ marginRight: '5px' }}
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

                  <div style={{ width: '100%' }}>
                    <label htmlFor="useTime">
                      <b>사용시간</b>
                    </label>
                    <div className="div-space-between">
                      <input
                        type="time"
                        placeholder="출발"
                        id="useTimeFrom"
                        name="useTimeFrom"
                        style={{ marginRight: '5px' }}
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

                <label htmlFor="locationName">
                  <b>출장지</b>
                </label>
                <input
                  type="text"
                  id="locationName"
                  name="locationName"
                  required
                />

                <div id="div01" className="div-space-between">
                  <div style={{ marginRight: '5px', width: '100%' }}>
                    <label htmlFor="distance">
                      <b>이동거리</b>
                    </label>
                    <input type="text" id="distance" name="distance" />
                  </div>
                  <div style={{ width: '100%' }}>
                    <label htmlFor="flux">
                      <b>유량(%)</b>
                    </label>
                    <div className="div-space-between">
                      <input
                        type="number"
                        placeholder="출발"
                        id="fluxFrom"
                        name="fluxFrom"
                        style={{ marginRight: '5px' }}
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

                <div id="div02" className="div-space-between">
                  <div style={{ marginRight: '5px', width: '100%' }}>
                    <label htmlFor="oilingYn">
                      <b>주유여부(경유)</b>
                    </label>
                    <input type="text" id="oilingYn" name="oilingYn" />
                  </div>
                  <div style={{ width: '100%' }}>
                    <label htmlFor="parkingArea">
                      <b>주차구역</b>
                    </label>
                    <input type="text" id="parkingArea" name="parkingArea" />
                  </div>
                </div>

                <div id="div03">
                  <label htmlFor="bigo">
                    <b>정비이력 등 특이사항</b>
                  </label>
                  <textarea
                    id="bigo"
                    name="bigo"
                    rows="3"
                    style={{ resize: 'none' }}
                  ></textarea>
                </div>

                <button
                  type="button"
                  id="btnDelete"
                  className="btn"
                  style={{ display: 'none', float: 'right' }}
                >
                  삭제하기
                </button>
                <button
                  id="closeDispatch"
                  type="button"
                  className="btn cancel"
                  style={{ float: 'right' }}
                >
                  닫기
                </button>
                <button
                  type="submit"
                  id="btnSave"
                  className="btn"
                  style={{ float: 'right' }}
                >
                  신청하기
                </button>
                <button
                  type="button"
                  id="btnModify"
                  className="btn"
                  style={{ display: 'none', float: 'right' }}
                >
                  수정하기
                </button>
              </form>
            </div>
            <ModalHelp isOpen={isOpen} />
            <div id="snackbar">Some text some message..</div>
            <div id="lightbox">
              <img id="lightboxImage" />
            </div>
          </>
        )}
      </div>
    </>
  );
}
