import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL, MAX_DAILY_SERVER_SAVES } from '../utils/constants';
import {
  getDailySaveInfo,
  setDailySaveInfo,
  getTodayString,
  savePlayerName,
  loadPlayerName,
} from '../utils/storageUtils';

export const useScoreManagement = () => {
  const [highScores, setHighScores] = useState([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveLimitMessage, setSaveLimitMessage] = useState('');
  const [saveAttemptsLeft, setSaveAttemptsLeft] = useState(999);

  // 순위 데이터 로드
  const fetchHighScores = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const url = `${API_BASE_URL}/jvWorksGetTetrisScores?limit=8`;
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
    setSaveAttemptsLeft(999);
    setSaveLimitMessage('');
  }, [showNameModal]);

  // 서버에 점수 저장
  const saveScoreToServer = useCallback(
    async (name, score, userId) => {
      setIsSaving(true);
      try {
        const url = `${API_BASE_URL}/jvWorksSetTetrisScore`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || '',
            score: score,
            date: new Date().toISOString(),
            userId: userId || '',
          }),
        });

        if (!response.ok) {
          throw new Error(`점수 저장 API 오류: ${response.status}`);
        }
        const data = await response.json();
        if (data && (data.success === true || data.success === 'true')) {
          savePlayerName(name);
          setSaveAttemptsLeft(999);
          await fetchHighScores();
        } else {
          console.error('점수 저장 실패:', data && data.message);
        }
      } catch (error) {
        console.error('API 호출 오류:', error);
      } finally {
        setIsSaving(false);
        setShowNameModal(false);
      }
    },
    [fetchHighScores]
  );

  const handleSaveName = useCallback(
    (name, score, userId) => {
      const trimmedName = name.trim() || '';
      setSaveLimitMessage('');
      setSaveAttemptsLeft(999);
      saveScoreToServer(trimmedName, score, userId);
    },
    [saveScoreToServer]
  );

  const handleCancelModal = useCallback(() => {
    setShowNameModal(false);
    setPlayerName('');
    setSaveLimitMessage('');
    setSaveAttemptsLeft(999);
  }, []);

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
  };
};
