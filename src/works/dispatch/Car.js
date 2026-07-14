import styles from './Car.module.css';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useToast } from '../../common/Toast';
import { waitForExtensionLogin, isMobileUA } from '../../common/extensionLogin';

import ModalHelp from '../components/ModalHelp';

const CONSUMABLE_PREVIEW_COUNT = 2;

const CONSUMABLE_CATEGORIES = [
  { key: 'engineOil', label: '엔진오일', keywords: ['엔진오일'] },
  {
    key: 'airFilter',
    label: '에어컨필터',
    keywords: ['에어컨필터', '에어컨 필터'],
  },
  { key: 'wiper', label: '와이퍼', keywords: ['와이퍼'] },
  { key: 'tire', label: '타이어', keywords: ['타이어'] },
  {
    key: 'brakePad',
    label: '브레이크패드',
    keywords: ['브레이크패드', '브레이크 패드'],
  },
  { key: 'battery', label: '배터리', keywords: ['배터리'] },
];

const buildDefaultConsumableMap = () => {
  const base = {};
  CONSUMABLE_CATEGORIES.forEach((category) => {
    base[category.key] = {
      date: null,
      km: null,
    };
  });
  return base;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDateText = (value) => {
  if (!value) {
    return null;
  }

  const parts = value.split(/[./-]/).map((item) => item.trim());
  if (parts.length !== 3) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = parts;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 2000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const normalized =
    String(year).padStart(4, '0') +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0');

  const testDate = new Date(normalized + 'T00:00:00');
  if (Number.isNaN(testDate.getTime())) {
    return null;
  }

  return normalized;
};

const parseKmToNumber = (rawKm) => {
  if (!rawKm) {
    return null;
  }

  const normalizedDigits = rawKm.replace(/[.,\s]/g, '');
  const kmNumber = Number(normalizedDigits);

  if (!Number.isFinite(kmNumber) || kmNumber <= 0) {
    return null;
  }

  return Math.floor(kmNumber);
};

const formatKm = (kmNumber) => {
  if (!Number.isFinite(kmNumber)) {
    return null;
  }
  return kmNumber.toLocaleString('ko-KR') + 'km';
};

const extractKmFromSegment = (segmentText) => {
  if (!segmentText) {
    return null;
  }

  const kmByUnit = segmentText.match(
    /(\d{1,3}(?:,\d{3})+|\d{3,7})\s*(?:km|KM|Km|키로|킬로)/i,
  );
  const kmByLabel = segmentText.match(
    /(?:주행(?:거리)?|누적(?:주행거리)?|거리)\s*[:=]?\s*(\d{1,3}(?:,\d{3})+|\d{3,7})/i,
  );
  const kmByMan = segmentText.match(/(\d{1,3}(?:\.\d+)?)\s*만(?:\s*km)?/i);

  if (kmByMan && kmByMan[1]) {
    const tenThousands = Number(kmByMan[1]);
    if (Number.isFinite(tenThousands) && tenThousands > 0) {
      return Math.floor(tenThousands * 10000);
    }
  }

  const rawKm = (kmByUnit && kmByUnit[1]) || (kmByLabel && kmByLabel[1]);
  return parseKmToNumber(rawKm);
};

const parseLatestConsumableInfoInText = (text, keywords, fallbackDate) => {
  if (!text) {
    return null;
  }

  const datePattern = '(\\d{4}[./-]\\d{1,2}[./-]\\d{1,2})';
  const kmPattern =
    '(?:\\d{1,3}(?:,\\d{3})+|\\d{3,7}|\\d{1,3}(?:\\.\\d+)?\\s*만)\\s*(?:km|KM|Km|키로|킬로)?';
  const candidates = [];
  const normalizedFallbackDate = normalizeDateText(fallbackDate);

  const pushCandidate = (rawDate, segmentText) => {
    const date = normalizeDateText(rawDate);
    if (!date) {
      return;
    }

    const km = extractKmFromSegment(segmentText);

    candidates.push({ date, km });
  };

  keywords.forEach((keyword) => {
    const escaped = escapeRegExp(keyword);

    // 1순위: 카테고리:날짜(, km)
    const strictPattern = new RegExp(
      `${escaped}\\s*[:=]\\s*${datePattern}(?:[\\s,;/|-]+${kmPattern})?`,
      'gi',
    );
    let strictMatch = strictPattern.exec(text);
    while (strictMatch) {
      pushCandidate(strictMatch[1], strictMatch[0]);
      strictMatch = strictPattern.exec(text);
    }

    // 2순위: 카테고리 주변 자유문장 보조 인식 (카테고리 앞/뒤 날짜)
    const nearPattern = new RegExp(
      `${escaped}[\\s\\S]{0,40}?${datePattern}|${datePattern}[\\s\\S]{0,40}?${escaped}`,
      'gi',
    );
    let nearMatch = nearPattern.exec(text);
    while (nearMatch) {
      const rawDate = nearMatch[1] || nearMatch[2];
      pushCandidate(rawDate, nearMatch[0]);
      nearMatch = nearPattern.exec(text);
    }

    // 3순위: 날짜 미기재 교환 문구는 해당 행 날짜를 교환일로 사용
    if (normalizedFallbackDate) {
      const hasKeyword = new RegExp(escaped, 'i').test(text);
      const hasMaintenanceAction = /(교환|교체|수리|보수|보충|완료)/i.test(
        text,
      );
      const seemsPlanned = /(예정|다음\s*교환\s*주기|교환\s*주기)/i.test(text);

      if (hasKeyword && hasMaintenanceAction && !seemsPlanned) {
        candidates.push({
          date: normalizedFallbackDate,
          km: extractKmFromSegment(text),
        });
      }
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (a.date === b.date) {
      return (b.km || 0) - (a.km || 0);
    }
    return a.date > b.date ? -1 : 1;
  });

  const top = candidates[0];
  return {
    date: top.date,
    km: formatKm(top.km),
  };
};

const summarizeConsumableHistory = (rows = []) => {
  const result = buildDefaultConsumableMap();

  rows.forEach((row) => {
    const bigo = (row?.BIGO || '').replaceAll('<br />', '\n');
    const rowDate = row?.USE_DATE_TO || row?.USE_DATE_FROM || row?.APP_DATE;

    CONSUMABLE_CATEGORIES.forEach((category) => {
      const latestInRow = parseLatestConsumableInfoInText(
        bigo,
        category.keywords,
        rowDate,
      );
      if (!latestInRow) {
        return;
      }

      const currentLatest = result[category.key]?.date;
      if (!currentLatest || latestInRow.date > currentLatest) {
        result[category.key] = latestInRow;
      }

      if (
        currentLatest === latestInRow.date &&
        !result[category.key]?.km &&
        latestInRow.km
      ) {
        result[category.key] = latestInRow;
      }
    });
  });

  return result;
};

export default function Car() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [authUser, setAuthUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [carStatus, setCarStatus] = useState('운행 가능');
  const [carStatusDesc, setCarStatusDesc] =
    useState('배차 요청 후 담당자 확인');
  const [consumableHistory, setConsumableHistory] = useState(
    buildDefaultConsumableMap,
  );
  const [consumableExpanded, setConsumableExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const uaMobile = isMobileUA();
      if (!mounted) return;

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

  useEffect(() => {
    if (!authUser) {
      return;
    }

    const openDispatch = document.querySelector('#openDispatch');
    const closeDispatch = document.querySelector('#closeDispatch');
    const helpDispatch = document.querySelector('#btn-help');
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
      // 신규 모드에서 3열(사용일 | 종일 | 사용시간)로 정렬
      const rowUse = document.querySelector('#rowUse');
      if (rowUse) {
        rowUse.style.gridTemplateColumns =
          'minmax(260px, 1fr) max-content minmax(260px, 1fr)';
      }
      // 신규 모드에서만 종일 체크박스 표시
      const divAllDay = document.querySelector('#divAllDay');
      if (divAllDay) {
        divAllDay.style.display = '';
      }
    };

    const handleClose = () => {
      document.querySelector('#lightbox').style.display = 'none';
      document.getElementById('myForm').style.display = 'none';
    };

    const handleHelp = () => {
      const modalButton = document.querySelector('button.modal-help.hidden');
      if (modalButton) {
        modalButton.click();
      }
    };

    const handleSubmit = async (event) => {
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
              showToast(
                '시스템 내부 문제가 발생했습니다. 상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요. 상세내용 >> ' +
                  e.message,
                'error',
              );
              return;
            }

            showToast('배차가 신청 되었습니다.', 'success');

            document.querySelector('#lightbox').style.display = 'none';
            document.getElementById('myForm').style.display = 'none';

            onViewDispatch();
          });
      } catch (error) {
        console.log(error);
      }
    };

    const handleModify = (event) => {
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
              showToast(
                '시스템 내부 문제가 발생했습니다. 상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요. 상세내용 >> ' +
                  e.message,
                'error',
              );
              return;
            }

            showToast('수정 되었습니다.', 'success');

            document.querySelector('#lightbox').style.display = 'none';
            document.getElementById('myForm').style.display = 'none';

            onViewDispatch();
          });
      } catch (error) {
        console.log(error);
      }
    };

    const handleDelete = (event) => {
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
                showToast(
                  '시스템 내부 문제가 발생했습니다. 상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요. 상세내용 >> ' +
                    e.message,
                  'error',
                );
                return;
              }

              showToast('삭제 되었습니다.', 'success');

              document.querySelector('#lightbox').style.display = 'none';
              document.getElementById('myForm').style.display = 'none';

              onViewDispatch();
            });
        } catch (error) {
          console.log(error);
        }
      } else {
        event.preventDefault();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, API_BASE_URL]);

  // 출발일/복귀일 기반 상태 계산 함수
  const calculateCarStatus = (useDateFrom, useDateTo) => {
    const now = new Date();

    if (!useDateFrom || !useDateTo) {
      return { status: '운행 가능', desc: '배차 요청 후 담당자 확인' };
    }

    // "YYYY-MM-DD (HH:mm)" 형식에서 날짜와 시간 추출
    const extractDateTime = (dateTimeStr) => {
      // "2026-01-28 (10:00)" 형식
      const dateMatch = dateTimeStr.match(/(\d{4}-\d{2}-\d{2})/);
      const timeMatch = dateTimeStr.match(/\((\d{2}:\d{2})\)/);

      const dateStr = dateMatch ? dateMatch[1] : null;
      const timeStr = timeMatch ? timeMatch[1] : null;

      return { dateStr, timeStr };
    };

    const fromInfo = extractDateTime(useDateFrom);
    const toInfo = extractDateTime(useDateTo);

    if (!fromInfo.dateStr || !toInfo.dateStr) {
      return { status: '운행 가능', desc: '배차 요청 후 담당자 확인' };
    }

    // 현재 날짜/시간 문자열
    const currentDateStr =
      now.getFullYear() +
      '-' +
      ('00' + (now.getMonth() + 1)).slice(-2) +
      '-' +
      ('00' + now.getDate()).slice(-2);
    const currentTimeStr =
      ('00' + now.getHours()).slice(-2) +
      ':' +
      ('00' + now.getMinutes()).slice(-2);

    // 시작 전
    if (currentDateStr < fromInfo.dateStr) {
      return { status: '예정 중', desc: useDateFrom + ' 예정' };
    }

    // 종료 후
    if (currentDateStr > toInfo.dateStr) {
      return { status: '운행 완료', desc: useDateTo + ' 반납 완료' };
    }

    // 같은 날짜인 경우 시간까지 비교
    if (currentDateStr === toInfo.dateStr && toInfo.timeStr) {
      if (currentTimeStr >= toInfo.timeStr) {
        return { status: '운행 완료', desc: useDateTo + ' 반납 완료' };
      }
    }

    // 운행 중
    return { status: '운행 중', desc: useDateTo + ' 까지 운행' };
  };

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

  const onSetDefault = useCallback(() => {
    document.querySelector('#appDate').value = getStringToDate();
    document.querySelector('#useDateFrom').min = getStringToDate();
    document.querySelector('#useDateTo').min = getStringToDate();

    document.querySelector('#div01').setAttribute('style', 'display:none');
    document.querySelector('#div02').setAttribute('style', 'display:none');

    document.querySelector('#appNo').removeAttribute('disabled');

    // allDayYn 초기화
    const allDayCheckbox = document.querySelector('#allDayYn');
    if (allDayCheckbox) {
      allDayCheckbox.checked = false;
    }

    // 시간 필드 초기 상태 복원 (활성/필수 유지)
    const from = document.querySelector('#useTimeFrom');
    const to = document.querySelector('#useTimeTo');
    if (from && to) {
      from.disabled = false;
      to.disabled = false;
      from.required = true;
      to.required = true;
      from.value = '';
      to.value = '';
    }
  }, []);

  const onViewDispatch = useCallback(() => {
    const myId = authUser === 'm' ? 'MOBILE' : atob(authUser);
    const query =
      'factoryCode=000001&userId=' +
      myId +
      '&dateFrom=' +
      '&dateTo=' +
      '&dispatchGbn=01';

    setLoading(true);
    fetch(`${API_BASE_URL}/jvWorksGetDispatch?` + query, {})
      .then((e) => e.json())
      .then((e) => {
        if (e.data.length === 0) {
          setConsumableHistory(buildDefaultConsumableMap());
          setCarStatus('운행 가능');
          setCarStatusDesc('배차 요청 후 담당자 확인');
          return;
        }

        if (e.success === 'false') {
          showToast(
            '시스템 내부 문제가 발생했습니다. 상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요. 상세내용 >> ' +
              e.message,
            'error',
          );
          return;
        }

        const ele = document.querySelector('#tbDispatch');

        // 로딩 완료 (스켈레톤 제거)
        setLoading(false);

        // 스켈레톤이 제거된 후 tbody 정리 (이제 스켈레톤 JSX 요소가 없음)
        setTimeout(() => {
          ele.innerHTML = '';

          setConsumableHistory(summarizeConsumableHistory(e.data));

          // 첫번째 배차 데이터로 상태 업데이트
          if (e.data.length > 0) {
            const firstItem = e.data[0];
            const useDateFrom =
              firstItem.USE_DATE_FROM + ' (' + firstItem.USE_TIME_FROM + ')';
            const useDateTo =
              firstItem.USE_DATE_TO + ' (' + firstItem.USE_TIME_TO + ')';
            const statusInfo = calculateCarStatus(useDateFrom, useDateTo);
            setCarStatus(statusInfo.status);
            setCarStatusDesc(statusInfo.desc);
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
              '<a href="javascript:void(0)" class="aTagDispatCh" style="cursor:pointer;color:#667eea;">' +
              item.DISPATCH_NO +
              '</a>';
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
            td.className = styles['cell-truncate'];
            td.innerHTML = item.LOCATION_NAME;
            td.title = item.LOCATION_NAME;
            tr.append(td);

            td = document.createElement('td');
            td.innerHTML = item.DISTANCE;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:center;');
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
            td.className = styles['cell-truncate'];
            td.innerHTML = item.PARKING_AREA;
            td.title = item.PARKING_AREA;
            tr.append(td);

            td = document.createElement('td');
            td.setAttribute('style', 'text-align:left;');
            td.className = styles['cell-truncate'];
            td.innerHTML = item.BIGO;
            td.title = item.BIGO.replaceAll('<br />', '\n');
            tr.append(td);

            ele.append(tr);
          }

          document.querySelectorAll('.aTagDispatCh').forEach((target) =>
            target.addEventListener('click', function (evt) {
              evt.preventDefault();
              evt.stopPropagation();
              document.querySelector('#lightbox').style.display = 'block';
              onModifyForm(this);
            }),
          );
        }, 0);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, API_BASE_URL]);

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
        '&dispatchGbn=01';

      fetch(`${API_BASE_URL}/jvWorksGetDispatch?` + query, {})
        .then((e) => e.json())
        .then((e) => {
          if (e.data.length === 0) {
            return;
          }

          if (e.success === 'false') {
            showToast(
              '시스템 내부 문제가 발생했습니다. 상세내용을 알 수 없거나 계속 문제가 발생할 경우 관리자에게 문의하세요. 상세내용 >> ' +
                e.message,
              'error',
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
          // 수정 모드에서는 2열(사용일 | 사용시간)로 정렬
          const rowUse = document.querySelector('#rowUse');
          if (rowUse) {
            rowUse.style.gridTemplateColumns = 'repeat(2, minmax(220px, 1fr))';
          }

          // 수정 모드에서는 종일 체크박스 숨김
          const divAllDay = document.querySelector('#divAllDay');
          if (divAllDay) {
            divAllDay.style.display = 'none';
          }

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
            '\r\n',
          );
        });
    },
    [authUser, API_BASE_URL, showToast],
  );

  const [useDateFrom, setUseDateFrom] = useState('');
  const [useDateTo, setUseDateTo] = useState('');

  const changeDateFrom = (event) => {
    const newDateFrom = event.target.value;
    setUseDateFrom(newDateFrom);

    // Additional logic to update useDateTo based on useDateFrom if needed
    const newDateTo = newDateFrom;
    setUseDateTo(newDateTo);
  };

  const handleAllDayChange = (event) => {
    const isChecked = event.target.checked;

    // 종일 체크 시 기본 시간 세팅 09:00 ~ 18:00
    if (isChecked) {
      const from = document.querySelector('#useTimeFrom');
      const to = document.querySelector('#useTimeTo');
      if (from && to) {
        from.value = '09:00';
        to.value = '18:00';
      }
    }
  };

  const skeletonRows = Array.from({ length: 5 });

  // 변경: 로딩 표시
  if (!authUser) {
    return (
      <div className={`${styles['car-shell']} ${styles['div-car']}`}>
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
        <title>업무 차량 배차 신청 현황</title>
        <meta property="og:title" content="업무 차량 배차 신청 현황" />
        <meta
          property="og:description"
          content="F1Soft 회사 업무 차량 배차 신청하는 화면입니다."
        />
        <meta
          property="og:url"
          content={`https://f1works.netlify.app/works/dispatch/car`}
        />
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
              {/* <p className="eyebrow">F1Works</p> */}
              <h1 className={styles['hero-title']}>업무 차량 배차 신청</h1>
              <p className={styles['hero-sub']}>
                안전하고 효율적인 출장 운행을 위해 사전에 신청하고, 사용 후에는
                이동거리와 주유 정보를 빠짐없이 업데이트하세요.
              </p>
              <div className={styles['hero-meta']}>
                <span className={`${styles['chip']} ${styles['chip--solid']}`}>
                  245로 4279 · 카니발
                </span>
                <span className={styles['chip']}>하이패스 · 주유카드 구비</span>
                <span className={styles['chip']}>실시간 신청 · 수정</span>
              </div>
            </div>
            <div className={styles['dispatch-hero__status']}>
              <div className={styles['stat-card']}>
                <p className={styles['stat-label']}>현재 상태</p>
                <p className={styles['stat-value']}>{carStatus}</p>
                <small className={styles['stat-desc']}>{carStatusDesc}</small>
              </div>
              <div className={styles['stat-card']}>
                <p className={styles['stat-label']}>필수 체크</p>
                <p className={styles['stat-value']}>출발·복귀 시간</p>
                <small className={styles['stat-desc']}>
                  유량/주차 위치 기재
                </small>
              </div>
              <div className={styles['stat-card']}>
                <p className={styles['stat-label']}>소모품 최근 교환</p>
                <div className={styles['consumable-list']}>
                  {(consumableExpanded
                    ? CONSUMABLE_CATEGORIES
                    : CONSUMABLE_CATEGORIES.slice(0, CONSUMABLE_PREVIEW_COUNT)
                  ).map((category) => (
                    <div
                      key={category.key}
                      className={styles['consumable-item']}
                      title={`${category.label} 최근 교환일`}
                    >
                      <span className={styles['consumable-name']}>
                        {category.label}
                      </span>
                      <span className={styles['consumable-date']}>
                        {consumableHistory[category.key]?.date || '미기록'}
                      </span>
                      <span className={styles['consumable-km']}>
                        {consumableHistory[category.key]?.km || 'km 미기록'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles['consumable-toggle']}
                  onClick={() => setConsumableExpanded((prev) => !prev)}
                  aria-expanded={consumableExpanded}
                >
                  {consumableExpanded
                    ? '접기'
                    : `더보기 (+${CONSUMABLE_CATEGORIES.length - CONSUMABLE_PREVIEW_COUNT})`}
                </button>
              </div>
            </div>
          </section>

          {/* <div className={styles['ad-row']}>
            <div className={`${styles['ad-card']} ${styles['pc-ad']}`}>
              <ins
                className="kakao_ad_area"
                data-ad-unit="DAN-0oWzN1iMfbRwhBwd"
                data-ad-width="728"
                data-ad-height="90"
              ></ins>
            </div>
            <div className={`${styles['ad-card']} ${styles['mobile-ad']}`}>
              <ins
                className="kakao_ad_area"
                data-ad-unit="DAN-oggtfE3ed1r7kKEV"
                data-ad-width="320"
                data-ad-height="50"
              ></ins>
            </div>
          </div> */}

          <div className={styles['dispatch-toolbar']}>
            <i className={styles['infoI']}>
              💡 작성된 배차 신청 내역은 <b>신청번호*</b>를 클릭하여 수정할 수
              있습니다.
            </i>
            <div className={styles['toolbar-actions']}>
              <button
                type="button"
                id="btn-help"
                className={`${styles['btnHelp']} ${styles['btn-ghost']}`}
              >
                배차 안내 보기
              </button>
              <button
                id="openDispatch"
                className={`${styles['btn']} ${styles['btn-elevated']}`}
              >
                배차 신청
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
                    <th>출발일 (시간)</th>
                    <th>복귀일 (시간)</th>
                    <th>출장지</th>
                    <th>이동거리</th>
                    <th>출발유량/복귀유량</th>
                    <th>주유여부(경유)</th>
                    <th>운전자</th>
                    <th>주차구역</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody id="tbDispatch">
                  {loading &&
                    skeletonRows.map((_, idx) => (
                      <tr key={`car-skeleton-${idx}`}>
                        {Array.from({ length: 13 }).map((__, colIdx) => (
                          <td key={`car-skeleton-cell-${idx}-${colIdx}`}>
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
            <div className={styles['form-header']}>
              <h3>배차 신청</h3>
            </div>

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
                  <b>차량 선택</b>
                </label>
                <select id="appNo" name="appNo" required>
                  <option value="">선택하세요</option>
                  <option value="245-4279">245-4279(카니발)</option>
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

            <div
              id="rowUse"
              className={`${styles['form-row']} ${styles['form-row--three']}`}
            >
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

              <div
                id="divAllDay"
                className={`${styles['field']} ${styles['field--checkbox']}`}
              >
                <label htmlFor="allDayYn">
                  <input
                    type="checkbox"
                    id="allDayYn"
                    name="allDayYn"
                    onChange={handleAllDayChange}
                  />
                  <b>종일</b>
                </label>
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
                  <b>정비이력 등 특이사항</b>
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
        <ModalHelp isOpen={false} />
        <div id="snackbar">Some text some message..</div>
        <div id="lightbox">
          <img id="lightboxImage" alt="" />
        </div>
      </div>
    </>
  );
}
