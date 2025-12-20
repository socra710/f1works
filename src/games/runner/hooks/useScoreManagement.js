import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

// 로컬 스토리지 유틸리티
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
  const saveScoreAuto = useCallback(async (name, score, coins, userId) => {
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
  }, [fetchHighScores]);

  // 닉네임 저장 핸들러
  const handleSaveName = async (name, userId) => {
    if (!name || name.trim().length === 0) {
      alert('닉네임을 입력해주세요!');
      return;
    }
    if (name.length > 20) {
      alert('닉네임은 20자 이하로 입력해주세요!');
      return;
    }

    savePlayerName(name.trim());
    setPlayerName(name.trim());
    
    // 닉네임을 서버에도 업데이트 (코인뱅크 동기화)
    try {
      await fetch(`${API_BASE_URL}/jvWorksSetRunnerCoins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || '',
          coins: 0, // 코인은 변경하지 않음
          highScore: 0, // 점수는 변경하지 않음
          name: name.trim(),
        }),
      });
      // 닉네임 저장 후 순위표 재조회
      await fetchHighScores();
    } catch (error) {
      console.error('닉네임 업데이트 실패:', error);
    }
    
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
