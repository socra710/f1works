import { MAX_DAILY_SERVER_SAVES, DAILY_SAVE_STORAGE_KEY } from './constants';

// 날짜 포맷팅
export const formatDate = (ts) => {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// 오늘 날짜 문자열
export const getTodayString = () => formatDate(Date.now());

// 일일 저장 정보 가져오기
export const getDailySaveInfo = () => {
  try {
    const raw = localStorage.getItem(DAILY_SAVE_STORAGE_KEY);
    if (!raw) {
      return { date: getTodayString(), count: 0 };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.date || typeof parsed.count !== 'number') {
      return { date: getTodayString(), count: 0 };
    }
    if (parsed.date !== getTodayString()) {
      return { date: getTodayString(), count: 0 };
    }
    return parsed;
  } catch (e) {
    console.error('일일 저장 정보 파싱 실패:', e);
    return { date: getTodayString(), count: 0 };
  }
};

// 일일 저장 정보 저장
export const setDailySaveInfo = (info) => {
  try {
    localStorage.setItem(DAILY_SAVE_STORAGE_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('일일 저장 정보 저장 실패:', e);
  }
};

// 저장 횟수 확인
export const canSaveToday = () => {
  const info = getDailySaveInfo();
  return info.count < MAX_DAILY_SERVER_SAVES;
};

// 남은 저장 횟수
export const getRemainingAttempts = () => {
  const info = getDailySaveInfo();
  return Math.max(0, MAX_DAILY_SERVER_SAVES - info.count);
};

// 플레이어 이름 저장/로드
export const savePlayerName = (name) => {
  localStorage.setItem('tetrisPlayerName', name);
};

export const loadPlayerName = () => {
  return localStorage.getItem('tetrisPlayerName') || '';
};
