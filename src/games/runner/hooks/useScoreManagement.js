import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../common/Toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

// 로컬 스토리지 유틸리티
const savePlayerName = (name) => {
  localStorage.setItem('runnerPlayerName', name);
};

const loadPlayerName = () => {
  return localStorage.getItem('runnerPlayerName') || '';
};

const loadLocalCoins = () => {
  const raw = localStorage.getItem('runnerCoins');
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadLocalHighScore = () => {
  const raw = localStorage.getItem('runnerHighScore');
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadUserId = () => {
  const sessionUser = window.sessionStorage.getItem('extensionLogin');
  if (sessionUser) {
    try {
      const decoded = atob(sessionUser);
      if (decoded) return decoded;
    } catch (e) {
      // ignore decode errors
    }
  }
  return localStorage.getItem('runnerUserId') || '';
};

export const useScoreManagement = () => {
  const [highScores, setHighScores] = useState([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  // 순위 데이터 로드
  const fetchHighScores = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const url = `${API_BASE_URL}/jvWorksGetRunnerScores?limit=10`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('순위 조회 API 호출 실패');
      const json = await res.json();
      if (json && (json.success === true || json.success === 'true')) {
        const scores = Array.isArray(json.data) ? json.data : [];
        setHighScores(
          scores.map((s) => ({
            name: s.name,
            score: s.score,
            coins: s.coins || 0,
            date: s.date,
          }))
        );
      } else {
        setHighScores([]);
      }
    } catch (e) {
      console.error('순위 조회 실패:', e);
      setHighScores([]);
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchHighScores();
    const savedName = loadPlayerName();
    if (savedName) {
      setPlayerName(savedName);
    }
    const uid = loadUserId();
    if (!uid) return;
    const syncFromServer = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/jvWorksGetRunnerCoins?userId=${encodeURIComponent(
            uid
          )}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (!res.ok) return;
        const json = await res.json();
        const isSuccess =
          json && (json.success === true || json.success === 'true');
        if (!isSuccess) return;
        const exists = json.exists === true || json.exists === 'true';
        if (!exists) return;
        const serverCoins = Number(json.coins);
        const serverHighScore = Number(json.highScore);
        const serverName = json.name || '';
        if (Number.isFinite(serverCoins)) {
          localStorage.setItem('runnerCoins', serverCoins.toString());
        }
        if (Number.isFinite(serverHighScore)) {
          localStorage.setItem('runnerHighScore', serverHighScore.toString());
        }
        if (serverName && serverName.trim()) {
          localStorage.setItem('runnerPlayerName', serverName.trim());
          setPlayerName(serverName.trim());
        }
      } catch (err) {
        console.error('코인/기록 동기화 실패:', err);
      }
    };
    syncFromServer();
  }, [fetchHighScores]);

  // 서버에 점수 저장
  const saveScoreToServer = useCallback(
    async (name, score, coins, userId) => {
      setIsSaving(true);
      try {
        const url = `${API_BASE_URL}/jvWorksSetRunnerScore`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || '',
            score: score,
            coins: coins || 0,
            date: new Date().toISOString(),
            userId: userId || '',
          }),
        });

        if (!response.ok) {
          throw new Error(`점수 저장 API 오류: ${response.status}`);
        }
        const data = await response.json();
        if (data && (data.success === true || data.success === 'true')) {
          await fetchHighScores();
          return { success: true };
        } else {
          throw new Error(data.message || '점수 저장 실패');
        }
      } catch (error) {
        console.error('점수 저장 실패:', error);
        return { success: false, error: error.message };
      } finally {
        setIsSaving(false);
      }
    },
    [fetchHighScores]
  );

  // 게임 종료 시 자동 점수/코인 저장 (모달 없이 바로 저장)
  const saveScoreAuto = useCallback(
    async (name, score, coins, userId) => {
      try {
        const url = `${API_BASE_URL}/jvWorksSetRunnerScore`;
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || 'Runner',
            score: score || 0,
            coins: coins || 0,
            date: new Date().toISOString(),
            userId: userId || '',
          }),
        });
        // 자동 저장 후 순위표 재조회
        await fetchHighScores();
      } catch (error) {
        console.error('자동 점수 저장 실패:', error);
      }
    },
    [fetchHighScores]
  );

  // 닉네임 저장 핸들러
  const handleSaveName = async (name, userId) => {
    if (!name || name.trim().length === 0) {
      showToast('닉네임을 입력해주세요!', 'warning');
      return;
    }
    if (name.length > 20) {
      showToast('닉네임은 20자 이하로 입력해주세요!', 'warning');

      return;
    }

    // 백엔드에서 닉네임 중복 체크
    try {
      const checkResponse = await fetch(
        `${API_BASE_URL}/jvWorksCheckRunnerNickname`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: name.trim(),
            userId: userId || '',
          }),
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.isDuplicate) {
          showToast(
            checkData.message || '이미 사용 중인 닉네임입니다',
            'warning'
          );
          return;
        }
      }
    } catch (error) {
      console.error('닉네임 중복 체크 실패:', error);
      showToast(
        '닉네임 중복 체크 중 문제가 발생했어요. 다시 시도해주세요.',
        'error'
      );
      // 중복 체크 실패 시에도 계속 진행 (네트워크 오류 등)
    }

    savePlayerName(name.trim());
    setPlayerName(name.trim());

    // 닉네임을 서버에도 업데이트 (코인뱅크 동기화)
    try {
      const currentCoins = loadLocalCoins();
      const currentHighScore = loadLocalHighScore();
      await fetch(`${API_BASE_URL}/jvWorksSetRunnerCoins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || '',
          coins: currentCoins,
          highScore: currentHighScore,
          name: name.trim(),
        }),
      });
      // 닉네임 저장 후 순위표 재조회
      await fetchHighScores();
    } catch (error) {
      console.error('닉네임 업데이트 실패:', error);
      showToast('닉네임 저장 중 문제가 발생했습니다.', 'error');
    }

    showToast('닉네임이 저장되었습니다.', 'success');
    setShowNameModal(false);
  };

  // 모달 취소 핸들러
  const handleCancelModal = () => {
    setShowNameModal(false);
    // 모달을 닫을 때 순위표 재조회
    fetchHighScores();
  };

  return {
    highScores,
    isLoadingScores,
    showNameModal,
    setShowNameModal,
    playerName,
    setPlayerName,
    isSaving,
    handleSaveName,
    handleCancelModal,
    fetchHighScores,
    saveScoreAuto,
  };
};
