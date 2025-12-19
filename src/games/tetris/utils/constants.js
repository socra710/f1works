// 게임 상수
export const COLS = 10;
export const ROWS = 21;
export const BLOCK_SIZE = 35;

// API 설정
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// 저장 관련 상수
export const MAX_DAILY_SERVER_SAVES = 3;
export const DAILY_SAVE_STORAGE_KEY = 'tetrisDailyServerSaves';

// 게임 시간 설정 (초 단위)
export const GAME_DURATION = 300; // 5분

// 속도 설정
export const INITIAL_DROP_SPEED = 800; // ms
export const MIN_DROP_SPEED = 100; // ms
export const SPEED_DECREASE_PER_LEVEL = 50; // ms
export const LEVEL_DURATION = 60; // 1분 = 60초

// 점수 계산
export const SCORE_PER_LINE = 100;

// 캔버스 크기
export const PREVIEW_BLOCK_SIZE = 20;
export const PREVIEW_CANVAS_WIDTH = 130;
export const PREVIEW_CANVAS_HEIGHT = 80;
