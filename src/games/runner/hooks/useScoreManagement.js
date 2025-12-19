import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';
const MAX_DAILY_SERVER_SAVES = 3;

// 로컬 스토리지 유틸리티
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(today.getDate()).padStart(2, '0')}`;
};

const getDailySaveInfo = () => {
  const saved = localStorage.getItem('runnerDailySaves');
  if (!saved) return { date: getTodayString(), count: 0 };

  const data = JSON.parse(saved);
  if (data.date !== getTodayString()) {
    return { date: getTodayString(), count: 0 };
  }
  return data;
};

const setDailySaveInfo = (count) => {
  localStorage.setItem(
    'runnerDailySaves',
    JSON.stringify({
      date: getTodayString(),
      count: count,
    })
  );
};

const savePlayerName = (name) => {
  localStorage.setItem('runnerPlayerName', name);
};

const loadPlayerName = () => {
  return localStorage.getItem('runnerPlayerName') || '';
};

export const useScoreManagement = () => {
  const [highScores, setHighScores] = useState([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveLimitMessage, setSaveLimitMessage] = useState('');
  const [saveAttemptsLeft, setSaveAttemptsLeft] = useState(
    MAX_DAILY_SERVER_SAVES
  );

  // 순위 데이터 로드
  const fetchHighScores = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const url = `${API_BASE_URL}/jvWorksGetRunnerScores?limit=8`;
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
  }, [fetchHighScores]);

  // 모달 표시 시 남은 횟수 업데이트
  useEffect(() => {
    if (!showNameModal) return;
    const info = getDailySaveInfo();
    const remaining = Math.max(0, MAX_DAILY_SERVER_SAVES - info.count);
    setSaveAttemptsLeft(remaining);
    if (info.count >= MAX_DAILY_SERVER_SAVES) {
      setSaveLimitMessage(
        '아쉽지만 서버 점수 기록은 하루에 3번만 가능해요.<br />하지만 연습은 계속할 수 있어요!'
      );
    } else {
      setSaveLimitMessage('');
    }
  }, [showNameModal]);

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
          const info = getDailySaveInfo();
          setDailySaveInfo(info.count + 1);
          setSaveAttemptsLeft(
            Math.max(0, MAX_DAILY_SERVER_SAVES - info.count - 1)
          );
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

  // 게임 종료 시 자동 코인/점수 기록 (일일 제한/모달과 무관하게 저장 시도)
  const saveCoinsAuto = useCallback(async (name, score, coins, userId) => {
    try {
      const url = `${API_BASE_URL}/jvWorksSetRunnerScore`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || '',
          score: score || 0,
          coins: coins || 0,
          date: new Date().toISOString(),
          userId: userId || '',
        }),
      });
      // 성공/실패와 무관하게 모달 상태나 일일 제한은 건드리지 않음
    } catch (error) {
      console.error('자동 코인 저장 실패:', error);
    }
  }, []);

  // 닉네임 저장 핸들러
  const handleSaveName = async (name, score, coins, userId) => {
    if (!name || name.trim().length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    if (name.length > 20) {
      alert('닉네임은 20자 이하로 입력해주세요!');
      return;
    }

    const info = getDailySaveInfo();
    if (info.count >= MAX_DAILY_SERVER_SAVES) {
      setSaveLimitMessage(
        '아쉽지만 서버 점수 기록은 하루에 3번만 가능해요.<br />하지만 연습은 계속할 수 있어요!'
      );
      return;
    }

    const result = await saveScoreToServer(name.trim(), score, coins, userId);
    if (result.success) {
      savePlayerName(name.trim());
      alert('점수가 저장되었습니다!');
      setShowNameModal(false);
    } else {
      alert(`점수 저장에 실패했습니다: ${result.error}`);
    }
  };

  // 모달 취소 핸들러
  const handleCancelModal = () => {
    setShowNameModal(false);
  };

  return {
    highScores,
    isLoadingScores,
    showNameModal,
    setShowNameModal,
    playerName,
    setPlayerName,
    isSaving,
    saveLimitMessage,
    saveAttemptsLeft,
    handleSaveName,
    handleCancelModal,
    fetchHighScores,
    saveCoinsAuto,
  };
};
