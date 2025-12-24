import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../common/Toast';
import styles from './Runner.module.css';

// 컴포넌트
// import BackgroundEffects from './components/BackgroundEffects';
import PlayerCharacter from './components/PlayerCharacter';
import ParallaxLayers from './components/ParallaxLayers';
import GameObstacles from './components/GameObstacles';
import ParticleEffects from './components/ParticleEffects';
import ScoreBoard from './components/ScoreBoard';
import GameModal from './components/GameModal';
import CharacterShop from './components/CharacterShop';
import PurchaseHistory from './components/PurchaseHistory';

// 훅
import { useCommonElements } from './hooks/useCommonElements';
import { useScoreManagement } from './hooks/useScoreManagement';

// 유틸리티
import { playJumpSound } from './utils/audioUtils';
import { getSeasonEffects, randomDifferentIndex } from './utils/seasonUtils';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';

// 캐릭터 이미지
// import f1EmojiImage from './image/f1soft.png';
import f1RunImage from './image/f1-run.png';
const GRAVITY = process.env.NODE_ENV === 'production' ? 0.6 : 0.3; // 개발 환경에서도 동일하게 조정
const BASE_JUMP_STRENGTH = -20;
const JUMP_STRENGTH =
  process.env.NODE_ENV === 'production'
    ? BASE_JUMP_STRENGTH / 1.5
    : BASE_JUMP_STRENGTH / 1.5; // 개발 환경에서도 동일하게 조정
const BASE_GAME_SPEED = 5; // 원래 값
const SPEED_INCREASE_PER_LEVEL = 0.5;
const SPEED_INCREASE_INTERVAL = 50; // 속도 증가 간격 (점수)
const SPEED_INCREASE_SMOOTHNESS = 0.08; // 매 프레임마다 증가하는 양 (자연스럽게)
const PLAYER_SIZE = 50;
const GROUND_HEIGHT = 50;
const BOBBING_AMPLITUDE = 3;
const BOBBING_FREQUENCY = 4;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const MAX_PARTICLES = 30;
// const MAX_GHOSTS = 4;
// const MAX_MOTION_BLURS = 8;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

// 장애물 종류
const OBSTACLE_TYPES = [
  { id: 'boom', emoji: '💣', height: 50, width: 30 },
  { id: 'cactus', emoji: '🌵', height: 80, width: 35 },
  { id: 'tree', emoji: '🌲', height: 90, width: 35 },
  { id: 'fire', emoji: '🔥', height: 55, width: 30 },
  { id: 'cone', emoji: '🚧', height: 45, width: 35 },
  { id: 'barrel', emoji: '🛢️', height: 60, width: 30 },
  { id: 'bush', emoji: '🌿', height: 50, width: 30 },
  { id: 'rock', emoji: '🪨', height: 40, width: 28 },
  { id: 'bomb', emoji: '💥', height: 45, width: 32 },
  { id: 'wall', emoji: '🧱', height: 70, width: 40 },
  { id: 'spikes', emoji: '🦔', height: 35, width: 30 },
  { id: 'log', emoji: '🪵', height: 55, width: 45 },
];

// 캐릭터 목록
const CHARACTERS = [
  // { id: 'f1', name: 'F1', emoji: 'f1-emoji', image: f1EmojiImage },
  { id: 'dog', name: '🐶', emoji: '🐶' },
  // { id: 'cat', name: '🐱', emoji: '🐱' },
  // { id: 'fox', name: '🦊', emoji: '🦊' },
  // { id: 'bear', name: '🐻', emoji: '🐻' },
  // { id: 'pig', name: '🐷', emoji: '🐷' },
  // { id: 'santa', name: '🎅', emoji: '🎅' },
  // { id: 'lion', name: '🦁', emoji: '🦁' },
  // { id: 'rabbit', name: '🐰', emoji: '🐰' },
  // { id: 'devil', name: '👿', emoji: '👿' },
  // { id: 'ghost', name: '👻', emoji: '👻' },
  // { id: 'alien', name: '👽', emoji: '👽' },
  // { id: 'robot', name: '🤖', emoji: '🤖' },
  // { id: 'panda', name: '🐼', emoji: '🐼' },
  // { id: 'panda', name: '💀', emoji: '💀' },
];

const Runner = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const mobileCheckDone = useRef(false);

  useEffect(() => {
    if (mobileCheckDone.current) return;
    mobileCheckDone.current = true;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobile) {
      showToast('모바일에서는 플레이 할 수 없습니다.', 'error');
      navigate('/works');
    }
  }, [navigate, showToast]);

  const [gameState, setGameState] = useState('menu'); // menu, playing, gameOver, shop
  const [availableCharacters, setAvailableCharacters] = useState(CHARACTERS); // 사용 가능한 캐릭터 목록
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [birds, setBirds] = useState([]);
  const [ghosts, setGhosts] = useState([]); // 러너 잔상
  const [particles, setParticles] = useState([]); // 먼지 파티클
  const [motionBlurs, setMotionBlurs] = useState([]); // 모션 블러 라인
  const [jumpDusts, setJumpDusts] = useState([]); // 점프 착지 이펙트
  const [coins, setCoins] = useState([]); // 코인 목록
  const [jumpCount, setJumpCount] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(BASE_GAME_SPEED);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [coinCount, setCoinCount] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0); // 현재 게임에서 획득한 코인
  const [hasLoadedServerCoins, setHasLoadedServerCoins] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const containerRef = useRef(null);

  // 플레이 중: 컨텐츠가 화면 높이에 맞게 들어가는 경우에만 페이지 스크롤 비활성화
  useEffect(() => {
    const body = document.body;
    if (!body) return;

    const updateScrollLock = () => {
      if (gameState !== 'playing') {
        body.classList.remove('no-scroll');
        return;
      }
      const el = containerRef.current;
      if (!el) {
        body.classList.remove('no-scroll');
        return;
      }
      const fits = el.scrollHeight <= window.innerHeight;
      if (fits) {
        body.classList.add('no-scroll');
      } else {
        body.classList.remove('no-scroll');
      }
    };

    updateScrollLock();
    window.addEventListener('resize', updateScrollLock);
    return () => {
      window.removeEventListener('resize', updateScrollLock);
      body.classList.remove('no-scroll');
    };
  }, [gameState, panelCollapsed]);

  // 파워업 아이템 관련 상태
  const [powerUps, setPowerUps] = useState([]); // 게임 화면에 존재하는 파워업들
  const [activePowerUp, setActivePowerUp] = useState(null); // {type, endTime}
  const [shieldActive, setShieldActive] = useState(false); // 실드 활성화 여부

  // userId 생성: 테트리스와 동일하게 sessionStorage 'extensionLogin'을 우선 사용
  const [userId, setUserId] = useState('');

  // 구매한 캐릭터 로드
  useEffect(() => {
    if (!userId) return;

    const loadPurchasedCharacters = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/jvWorksGetUserPurchases?userId=${encodeURIComponent(
            userId
          )}`
        );
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && json.items && json.items.length > 0) {
          // CHARACTER 카테고리만 필터링
          const purchasedChars = json.items
            .filter(
              (item) => item.itemCode && item.itemCode.startsWith('CHAR_')
            )
            .map((item) => ({
              id: item.itemCode.toLowerCase(),
              name: item.emoji,
              emoji: item.emoji,
            }));

          // 기본 캐릭터 + 구매한 캐릭터 병합 (중복 제거)
          const combined = [...CHARACTERS];
          purchasedChars.forEach((pChar) => {
            if (!combined.find((c) => c.id === pChar.id)) {
              combined.push(pChar);
            }
          });
          setAvailableCharacters(combined);
        }
      } catch (error) {
        console.error('구매한 캐릭터 로드 실패:', error);
      }
    };

    loadPurchasedCharacters();
  }, [userId]);

  const gameLoopRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const obstacleIntervalRef = useRef(null);
  const birdIntervalRef = useRef(null);
  const playerVelocityRef = useRef(0);
  const playerYRef = useRef(0);
  // 러닝 바운스 계산용
  const bobTimeRef = useRef(0);
  const bobOffsetRef = useRef(0);
  const lastTsRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : 0
  );
  // 지면 여부 (state 지연 없이 즉시 판단용)
  const isOnGroundRef = useRef(true);
  // 파티클 스폰 간격 관리
  const particleCooldownRef = useRef(0);
  // 클릭 이펙트 쿨다운 관리
  const clickCooldownRef = useRef(0);
  // 게임 속도 ref (게임 루프에서 최신 값을 사용하기 위함)
  const gameSpeedRef = useRef(BASE_GAME_SPEED);
  // 시즌 이펙트 ref (부엉이/독수리 표시용)
  const seasonEffectsRef = useRef({ isNight: false });
  // 지형(카메라) 시야 연출용 오프셋
  const terrainPhaseRef = useRef(0);
  const terrainOffsetRef = useRef(0);
  // 밤 페이드 오버레이 강도
  const nightFadeRef = useRef(0);
  // 안개 강도/블러 동적 제어
  const fogTopOpacityRef = useRef(0);
  const fogGroundOpacityRef = useRef(0);
  const fogTopBlurRef = useRef(0);
  const fogGroundBlurRef = useRef(0);
  // 패럴랙스 X 위치
  const parallaxFarXRef = useRef(0);
  const parallaxNearXRef = useRef(0);

  // 파워업 효과 타이밍 추적 (게임 시간 기반)
  // const powerUpEndTimeRef = useRef(0); // 현재 파워업 효과의 끝시간 (ms)
  const magnetActiveDurationRef = useRef(0); // 자석 남은 시간
  const slowMoActiveDurationRef = useRef(0); // 슬로모션 남은 시간
  const tripleJumpCountRef = useRef(0); // 트리플 점프 남은 횟수 (0이 아니면 활성)
  // 슬로모션(속도고정)용: 발동 시점의 속도 저장
  const slowFreezeSpeedRef = useRef(null);
  // 실드 피격 후 잠시 무적 시간
  const invincibleUntilRef = useRef(0);

  // 훅으로 공통 엘리먼트 가져오기
  const commonElements = useCommonElements();

  // 점수 관리 훅
  const {
    highScores,
    isLoadingScores,
    showNameModal,
    setShowNameModal,
    playerName,
    setPlayerName,
    // isSaving,
    handleSaveName,
    handleCancelModal,
    saveScoreAuto,
  } = useScoreManagement();

  useEffect(() => {
    let cancelled = false;
    const initUserId = async () => {
      try {
        const encoded = await waitForExtensionLogin({
          minWait: 0,
          maxWait: 2000,
        });
        if (cancelled) return;
        if (encoded) {
          const decoded = decodeUserId(encoded);
          setUserId(decoded);
          localStorage.setItem('runnerUserId', decoded);
          return;
        }

        let id = localStorage.getItem('runnerUserId');
        if (!id) {
          id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('runnerUserId', id);
        }
        setUserId(id);

        let name = localStorage.getItem('runnerPlayerName');
        if (!name) {
          name = `Runner${Math.floor(Math.random() * 10000)}`;
          localStorage.setItem('runnerPlayerName', name);
          setPlayerName(name);
        }
      } catch (e) {
        // 실패 시 로컬로만 초기화
        if (cancelled) return;
        let id = localStorage.getItem('runnerUserId');
        if (!id) {
          id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('runnerUserId', id);
        }
        setUserId(id);
        let name = localStorage.getItem('runnerPlayerName');
        if (!name) {
          name = `Runner${Math.floor(Math.random() * 10000)}`;
          localStorage.setItem('runnerPlayerName', name);
          setPlayerName(name);
        }
      }
    };
    initUserId();
    return () => {
      cancelled = true;
    };
  }, [userId, setPlayerName]);

  const syncCoinBank = useCallback(
    async (uid, totalCoins, highScoreValue, nameForServer = '') => {
      if (!uid || totalCoins == null || Number.isNaN(totalCoins)) return;
      try {
        await fetch(`${API_BASE_URL}/jvWorksSetRunnerCoins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: uid,
            coins: Math.max(0, Math.floor(totalCoins)),
            highScore: Math.max(0, Math.floor(highScoreValue || 0)),
            name: (nameForServer || '').slice(0, 20),
          }),
        });
      } catch (error) {
        console.error('코인 동기화 실패:', error);
      }
    },
    []
  );

  const fetchServerCoins = useCallback(
    async (uid) => {
      if (!uid || hasLoadedServerCoins) return;

      const localCoinsRaw = localStorage.getItem('runnerCoins');
      const localCoins = localCoinsRaw ? parseInt(localCoinsRaw, 10) : 0;
      const localName = localStorage.getItem('runnerPlayerName') || '';

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

        if (res.ok) {
          const json = await res.json();
          if (json && (json.success === true || json.success === 'true')) {
            const exists = json.exists === true || json.exists === 'true';
            const serverCoins = Number(json.coins);
            const serverHighScore = Number(json.highScore);
            const serverName = json.name || '';

            if (exists) {
              const resolved = Number.isFinite(serverCoins) ? serverCoins : 0;
              setCoinCount(resolved);
              localStorage.setItem('runnerCoins', resolved.toString());

              // 서버 최고점수 세팅
              const resolvedHighScore = Number.isFinite(serverHighScore)
                ? serverHighScore
                : 0;
              setHighScore(resolvedHighScore);
              localStorage.setItem(
                'runnerHighScore',
                resolvedHighScore.toString()
              );

              // 서버에서 닉네임도 가져와서 세팅
              if (serverName && serverName.trim()) {
                setPlayerName(serverName.trim());
                localStorage.setItem('runnerPlayerName', serverName.trim());
              }
            } else {
              const resolved = Number.isFinite(localCoins) ? localCoins : 0;
              setCoinCount(resolved);
              localStorage.setItem('runnerCoins', resolved.toString());

              // 로컬 닉네임 사용
              if (localName && localName.trim()) {
                setPlayerName(localName.trim());
              }

              if (resolved > 0) {
                const nameForServer =
                  (localName && localName.trim()) || 'Runner';
                const localHighScoreRaw =
                  localStorage.getItem('runnerHighScore');
                const localHighScore = localHighScoreRaw
                  ? parseInt(localHighScoreRaw, 10)
                  : 0;
                await syncCoinBank(
                  uid,
                  resolved,
                  localHighScore,
                  nameForServer
                );
              }
            }

            setHasLoadedServerCoins(true);
            return;
          }
        }
      } catch (error) {
        console.error('서버 코인 조회 실패:', error);
      }

      setHasLoadedServerCoins(true);
      if (Number.isFinite(localCoins)) {
        setCoinCount(localCoins);
      }
      if (localName && localName.trim()) {
        setPlayerName(localName.trim());
      }
    },
    [hasLoadedServerCoins, setPlayerName, syncCoinBank]
  );

  useEffect(() => {
    if (!userId) return;
    fetchServerCoins(userId);
  }, [userId, fetchServerCoins]);

  // 시즌별 배경 이펙트 조합 (낮/밤 + 최대 2개 이펙트)
  const seasonEffects = useMemo(() => {
    return getSeasonEffects(seasonIndex, SEASONS);
  }, [seasonIndex]);

  // 시즌 전환 시 전체 배경도 살짝 달라지도록 테마 색상 지정
  const runnerBackground = useMemo(() => {
    const palettes = {
      spring: {
        day: 'linear-gradient(135deg, #ffe7f0 0%, #b5f5ec 45%, #d3ffce 100%)',
        night: 'linear-gradient(135deg, #0f1c3a 0%, #1f3d63 55%, #214230 100%)',
      },
      summer: {
        day: 'linear-gradient(135deg, #4ac1ff 0%, #ffd66b 50%, #7dd56f 100%)',
        night: 'linear-gradient(135deg, #0b1f33 0%, #12354f 55%, #1e5a35 100%)',
      },
      autumn: {
        day: 'linear-gradient(135deg, #ffb38a 0%, #ff8c42 50%, #d86b35 100%)',
        night: 'linear-gradient(135deg, #2b0f0f 0%, #3c1f16 55%, #2f261c 100%)',
      },
      winter: {
        day: 'linear-gradient(135deg, #d7e8ff 0%, #b8c6ff 48%, #edf4ff 100%)',
        night: 'linear-gradient(135deg, #0d1c2e 0%, #1d3047 55%, #cedaf0 100%)',
      },
    };

    const palette = palettes[seasonEffects.season] || palettes.spring;
    return palette[seasonEffects.isNight ? 'night' : 'day'];
  }, [seasonEffects.isNight, seasonEffects.season]);

  // 배경 대비에 맞춰 읽기 쉬운 전경(글자) 색상 지정
  const runnerTextColor = useMemo(() => {
    // 밤에는 밝은 텍스트, 낮에는 짙은 텍스트로 대비 확보
    return seasonEffects.isNight ? '#eef6ff' : '#102a43';
  }, [seasonEffects.isNight]);

  // 약한(보조) 텍스트 색상 변수
  const runnerMutedColor = useMemo(() => {
    return seasonEffects.isNight
      ? 'rgba(238, 246, 255, 0.7)'
      : 'rgba(16, 42, 67, 0.7)';
  }, [seasonEffects.isNight]);

  // 포인트(강조) 텍스트 색상: 밤엔 밝은 골드, 낮엔 대비되는 다크 골드
  const runnerAccentColor = useMemo(() => {
    return seasonEffects.isNight ? '#ffd700' : '#b07a00';
  }, [seasonEffects.isNight]);

  // 로컬 스토리지에서 최고 점수 불러오기
  useEffect(() => {
    const savedHighScore = localStorage.getItem('runnerHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }

    const savedCoins = localStorage.getItem('runnerCoins');
    if (savedCoins) {
      setCoinCount(parseInt(savedCoins, 10));
    }
  }, []);

  // 게임 종료 시 모달 표시
  useEffect(() => {
    if (gameState === 'gameOver' && score > 0) {
      setShowNameModal(true);
    }
  }, [gameState, score, setShowNameModal]);

  // 게임 종료 시 코인 잔고 동기화
  useEffect(() => {
    if (gameState !== 'gameOver') return;
    if (!userId) return;
    const nameForServer =
      (playerName && playerName.trim()) ||
      `Runner${Math.floor(Math.random() * 10000)}`;
    syncCoinBank(userId, coinCount, highScore, nameForServer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, userId, coinCount, highScore, syncCoinBank]);

  // 점수에 따라 속도를 부드럽게 증가 (슬로우=속도 고정 적용)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const speedIncreaseInterval = setInterval(() => {
      setGameSpeed((prevSpeed) => {
        // 50점마다 0.5씩 증가하는 목표 속도 계산
        const targetSpeed =
          BASE_GAME_SPEED +
          (score / SPEED_INCREASE_INTERVAL) * SPEED_INCREASE_PER_LEVEL;
        const maxSpeed = BASE_GAME_SPEED + 30; // 최대 속도 제한 (최대 30배속)
        const cappedTargetSpeed = Math.min(targetSpeed, maxSpeed);

        // 부드러운 전환: 목표 속도에 천천히 접근
        let newSpeed =
          prevSpeed +
          (cappedTargetSpeed - prevSpeed) * SPEED_INCREASE_SMOOTHNESS;

        // 슬로우(속도 고정): 발동 순간의 속도로 잠시 고정
        if (slowMoActiveDurationRef.current > 0) {
          if (slowFreezeSpeedRef.current == null) {
            slowFreezeSpeedRef.current = prevSpeed;
          }
          newSpeed = slowFreezeSpeedRef.current;
        }

        return newSpeed;
      });
    }, 50); // 50ms마다 속도 업데이트

    return () => clearInterval(speedIncreaseInterval);
  }, [gameState, score]);

  // gameSpeed 변화를 ref에 동기화
  useEffect(() => {
    gameSpeedRef.current = gameSpeed;
  }, [gameSpeed]);

  // Kakao 광고 스크립트 로드 (중복 로드 무방)
  useEffect(() => {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/kas/static/ba.min.js';
      script.async = true;
      document.body.appendChild(script);
    }, 500);
  }, []);

  // 페이지 가시성 변경 감지 (탭 전환, 브라우저 최소화 등)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (gameState !== 'playing') return;

      if (document.hidden) {
        // 페이지가 숨겨짐 → 게임 오버
        setGameState('gameOver');
        if (score > highScore) {
          setIsNewRecord(true);
          setHighScore(score);
          localStorage.setItem('runnerHighScore', score.toString());
        }
        const currentName = playerName || 'Runner';
        saveScoreAuto(currentName, score, sessionCoins, userId);
        setShowNameModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    gameState,
    score,
    highScore,
    playerName,
    sessionCoins,
    userId,
    saveScoreAuto,
    setShowNameModal,
  ]);

  // 게임 시작 시 광고 렌더링 시도 (스크립트가 먼저 로드된 경우 대비)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const tryRender = () => {
      if (window.adfit) {
        try {
          const adEls = document.querySelectorAll('.kakao_ad_area');
          adEls.forEach((el) => {
            try {
              window.adfit.render(el);
            } catch (e) {
              // ignore per-element render errors
            }
          });
        } catch (e) {
          // ignore
        }
      } else {
        setTimeout(tryRender, 200);
      }
    };
    tryRender();
  }, [gameState]);

  // seasonEffects 변화를 ref에 동기화 (부엉이/독수리 표시용)
  useEffect(() => {
    seasonEffectsRef.current = seasonEffects;
    // 밤/낮 변경 시 페이드 목표치 업데이트 (좀 더 강하게)
    nightFadeRef.current = seasonEffects.isNight ? 0.75 : 0; // 0~0.8 권장
  }, [seasonEffects]);

  // 캐릭터 선택
  const selectCharacter = (character) => {
    setSelectedCharacter(character);
  };

  // 게임 시작
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setSessionCoins(0); // 게임 시작 시 현재 게임 코인 초기화
    setPlayerY(0);
    playerVelocityRef.current = 0;
    setObstacles([]);
    setBirds([]);
    setGhosts([]);
    setParticles([]);
    setMotionBlurs([]);
    setJumpDusts([]);
    setCoins([]);
    setPowerUps([]); // 파워업 초기화
    setActivePowerUp(null); // 활성 파워업 초기화
    setShieldActive(false); // 실드 초기화
    magnetActiveDurationRef.current = 0;
    slowMoActiveDurationRef.current = 0;
    tripleJumpCountRef.current = 0;
    setJumpCount(0);
    setGameSpeed(BASE_GAME_SPEED);
    setSeasonIndex(Math.floor(Math.random() * SEASONS.length));
    isOnGroundRef.current = true;
    lastTsRef.current =
      typeof performance !== 'undefined' ? performance.now() : 0;
    setIsNewRecord(false);
  };

  // 점프 (더블 점프 + 트리플 점프 파워업 가능)
  const jump = useCallback(() => {
    // 트리플 점프 활성이면 최대 3회, 아니면 2회
    const maxJumps = tripleJumpCountRef.current > 0 ? 3 : 2;

    if (gameState === 'playing' && jumpCount < maxJumps) {
      const willUseTriple = tripleJumpCountRef.current > 0 && jumpCount === 2;
      playerVelocityRef.current = Math.abs(JUMP_STRENGTH); // 위로 점프
      setJumpCount((prev) => prev + 1);
      // 세 번째 점프 사용 시(트리플 소모)
      if (willUseTriple) {
        tripleJumpCountRef.current = 0;
      }
      playJumpSound(); // 점프 효과음 재생

      // 점프 시 모션 블러 생성 (랜덤 위치)
      const blurCount = 3 + Math.floor(Math.random() * 2);
      const newBlurs = [];
      // 게임 화면의 랜덤 위치에 이펙트 생성
      const randomLeft = 50 + Math.random() * 700; // 50px ~ 750px
      const randomTop = 50 + Math.random() * 300; // 50px ~ 350px
      for (let i = 0; i < blurCount; i++) {
        newBlurs.push({
          id: Date.now() + Math.random(),
          left: randomLeft + (Math.random() - 0.5) * 40,
          top: randomTop + (Math.random() - 0.5) * 40,
          delay: i * 0.05,
        });
      }
      // 최대 20개로 제한
      setMotionBlurs((prev) => [...prev, ...newBlurs].slice(-20));

      // 점프 시작 시 먼지 생성 (착지 이펙트) - 게임 화면 랜덤 위치
      if (jumpCount === 0) {
        const dustCount = 4 + Math.floor(Math.random() * 3);
        const newDusts = [];
        // 게임 화면의 랜덤 위치에 이펙트 생성
        const randomDustLeft = 100 + Math.random() * 600; // 100px ~ 700px
        const randomDustTop = 100 + Math.random() * 250; // 100px ~ 350px
        for (let i = 0; i < dustCount; i++) {
          const angle = (i / dustCount) * Math.PI * 2 - Math.PI / 2;
          const power = 60 + Math.random() * 40;
          newDusts.push({
            id: Date.now() + Math.random(),
            left: randomDustLeft,
            top: randomDustTop,
            burstX: Math.cos(angle) * power,
            burstY: Math.sin(angle) * power,
            size: 5 + Math.random() * 4,
            delay: 0,
          });
        }
        // 최대 50개로 제한
        setJumpDusts((prev) => [...prev, ...newDusts].slice(-50));
      }
    }
  }, [gameState, jumpCount]);

  // 마우스 클릭 시 이펙트 생성
  const createClickEffect = useCallback((clientX, clientY) => {
    // 쿨다운 체크 (0.1초마다 한 번씩만 생성 가능)
    const now = performance.now();
    if (now - clickCooldownRef.current < 100) {
      return;
    }
    clickCooldownRef.current = now;

    const gameContainer = document.querySelector(`.${styles['runner-game']}`);
    if (!gameContainer) return;

    const rect = gameContainer.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    // 게임 컨테이너 내부 클릭만 처리
    if (
      offsetX < 0 ||
      offsetY < 0 ||
      offsetX > rect.width ||
      offsetY > rect.height
    ) {
      return;
    }

    // 클릭 위치에 먼지 이펙트 생성 (개수 줄임)
    const dustCount = 4 + Math.floor(Math.random() * 2); // 6~9 -> 4~5
    const newDusts = [];
    for (let i = 0; i < dustCount; i++) {
      const angle = (i / dustCount) * Math.PI * 2;
      const power = 60 + Math.random() * 40; // 80~140 -> 60~100
      newDusts.push({
        id: Date.now() + Math.random(),
        left: offsetX,
        top: offsetY,
        burstX: Math.cos(angle) * power,
        burstY: Math.sin(angle) * power,
        size: 4 + Math.random() * 3, // 6~11 -> 4~7
        delay: 0,
      });
    }
    // 최대 50개로 제한
    setJumpDusts((prev) => [...prev, ...newDusts].slice(-50));

    // 클릭 위치에 모션 블러도 생성 (개수 줄임)
    const blurCount = 2 + Math.floor(Math.random() * 2); // 4~5 -> 2~3
    const newBlurs = [];
    for (let i = 0; i < blurCount; i++) {
      newBlurs.push({
        id: Date.now() + Math.random(),
        left: offsetX + (Math.random() - 0.5) * 30,
        top: offsetY + (Math.random() - 0.5) * 30,
        delay: i * 0.05,
      });
    }
    // 최대 20개로 제한
    setMotionBlurs((prev) => [...prev, ...newBlurs].slice(-20));
  }, []);

  // 키보드 이벤트 및 마우스 클릭 이벤트
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'playing') {
          jump();
        }
      }
    };

    const handleMouseClick = (e) => {
      createClickEffect(e.clientX, e.clientY);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleMouseClick);
    };
  }, [gameState, jump, createClickEffect]);

  // 게임 루프
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
      if (obstacleIntervalRef.current) {
        clearTimeout(obstacleIntervalRef.current);
      }
      if (birdIntervalRef.current) {
        clearTimeout(birdIntervalRef.current);
      }
      return;
    }

    // 점수 증가
    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => {
        const newScore = prev + 1;
        // 200점마다 시즌 변경 (중복 방지)
        if (newScore % 200 === 0) {
          setSeasonIndex((prevIdx) =>
            randomDifferentIndex(prevIdx, SEASONS.length)
          );
        }
        return newScore;
      });
    }, 100);

    // 장애물 생성 (랜덤 간격)
    const spawnObstacle = () => {
      // 점수에 따라 어려운 장애물 출현 확률 증가 (더 빠르게 증가)
      let randomType;
      const rand = Math.random();
      const difficultyFactor = Math.min(score / 300, 1.0); // 300점에서 100%, 150점에서 50%

      if (rand < difficultyFactor) {
        // 높은 난이도: 뒤의 어려운 장애물들 선택
        const hardObstacles = OBSTACLE_TYPES.slice(7); // 인덱스 7부터 끝까지
        randomType =
          hardObstacles[Math.floor(Math.random() * hardObstacles.length)];
      } else {
        // 일반 난이도: 모든 장애물 중 선택
        randomType =
          OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      }

      // 장애물 크기 변형 확률 조정
      // 점수(난이도)에 따라 극단값(작게/크게) 비율을 서서히 늘림
      const extremeWeight = 0.15 + 0.35 * difficultyFactor; // 15% → 최대 50%
      const moderateWeight = 0.25 + 0.15 * difficultyFactor; // 25% → 최대 40%
      const commonWeight = Math.max(0, 1 - extremeWeight - moderateWeight);
      const rSize = Math.random();
      let sizeVariation;
      if (rSize < commonWeight) {
        // 보통: 거의 기본 크기 (0.95 ~ 1.05)
        sizeVariation = 0.95 + Math.random() * 0.1;
      } else if (rSize < commonWeight + moderateWeight) {
        // 중간: 약간 변형 (0.85 ~ 1.15)
        sizeVariation = 0.85 + Math.random() * 0.3;
      } else {
        // 극단: 크게 변형 (0.70 ~ 1.30)
        sizeVariation = 0.7 + Math.random() * 0.6;
      }

      const newObstacle = {
        id: Date.now(),
        x: 800,
        type: randomType,
        height: Math.floor(randomType.height * sizeVariation),
        width: Math.floor(randomType.width * sizeVariation),
      };
      setObstacles((prev) => [...prev, newObstacle]);

      // 장애물 위 코인 스폰 (랜덤): 25% 확률로 1~3개 생성
      const shouldSpawnCoins = Math.random() < 0.25;
      if (shouldSpawnCoins) {
        const coinsToSpawn = [];
        const baseHeight = newObstacle.height; // 지면 기준 높이

        // 1~3개 중 랜덤 개수 (가중치: 1개 70%, 2개 30%, 3개 20%)
        const rand = Math.random();
        const count = rand < 0.7 ? 1 : rand < 1.0 ? 2 : 3;

        // 큰 코인 생성 확률 (5%) - 각 코인마다 독립적으로 체크하되 한 번에 1개만
        const isSingleBig = Math.random() < 0.05;
        const isDoubleBig = isSingleBig ? false : Math.random() < 0.05;
        const isTripleBig =
          isSingleBig || isDoubleBig ? false : Math.random() < 0.05;

        // 코인 위치 프리셋
        const singleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 10 + Math.random() * 60,
          y: baseHeight + (60 + Math.random() * 30), // 싱글 점프 높이
          size: isSingleBig ? 34 : 26,
          type: 'single',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: isSingleBig ? '💎' : '💰',
          value: isSingleBig ? 5 : 1,
        };
        const doubleCoin = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 60 + Math.random() * 80,
          y: baseHeight + (140 + Math.random() * 40), // 더블 점프 높이
          size: isDoubleBig ? 34 : 26,
          type: 'double',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: isDoubleBig ? '💎' : '💰',
          value: isDoubleBig ? 5 : 1,
        };
        const tripleCoin = {
          id: Date.now() + Math.random() * 2,
          x: newObstacle.x + 140 + Math.random() * 80,
          y: baseHeight + (100 + Math.random() * 50), // 중간 높이
          size: isTripleBig ? 34 : 26,
          type: 'triple',
          speed: 1.2,
          obstacleId: newObstacle.id,
          emoji: isTripleBig ? '💎' : '💰',
          value: isTripleBig ? 5 : 1,
        };

        if (count === 1) {
          // 하나만 생성: 싱글/더블/트리플 중 랜덤
          const choice = Math.random();
          coinsToSpawn.push(
            choice < 0.4 ? singleCoin : choice < 0.7 ? doubleCoin : tripleCoin
          );
        } else if (count === 2) {
          // 두 개 생성
          coinsToSpawn.push(singleCoin, doubleCoin);
        } else {
          // 세 개 모두 생성
          coinsToSpawn.push(singleCoin, doubleCoin, tripleCoin);
        }

        setCoins((prev) => [...prev, ...coinsToSpawn]);
      }

      // 파워업 아이템 스폰: 장애물 우측에 1개만 생성
      const shouldSpawnPowerUp = Math.random() < 0.05; // 5% 확률
      if (shouldSpawnPowerUp) {
        const baseHeight = newObstacle.height;
        const powerUpTypes = ['magnet', 'shield', 'slowmo', 'triplejump'];
        const powerUpEmojis = {
          magnet: '🧲',
          shield: '🛡️',
          slowmo: '⏱️',
          triplejump: '⬆️',
        };
        // 싱글/더블 점프 높이 중 랜덤으로 생성 (우측에 보이도록)
        const isDouble = Math.random() < 0.5;
        const spawnY = isDouble
          ? baseHeight + (140 + Math.random() * 40) // 더블 점프 높이
          : baseHeight + (60 + Math.random() * 30); // 싱글 점프 높이
        const newPowerUp = {
          id: Date.now() + Math.random(),
          x: newObstacle.x + 60 + Math.random() * 80, // 우측 x=860~940
          y: spawnY,
          type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
          size: 32,
          speed: 1.2,
        };
        newPowerUp.emoji = powerUpEmojis[newPowerUp.type];

        setPowerUps((prev) => [...prev, newPowerUp]);
      }

      // 속도에 비례하여 간격 조정 (난이도 밸런스 유지)
      // 속도가 빨라지면 간격도 짧아지되, 약간의 난이도 증가
      const speedRatio = gameSpeedRef.current / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85); // 속도 2배 → 간격 1.8배
      const baseInterval = 800 + Math.random() * 800; // 0.8초 ~ 1.6초
      const nextInterval = baseInterval * adjustedRatio;
      obstacleIntervalRef.current = setTimeout(spawnObstacle, nextInterval);
    };

    // 첫 장애물 생성
    obstacleIntervalRef.current = setTimeout(spawnObstacle, 1200);

    // 날아다니는 새 생성 (랜덤 간격)
    const spawnBird = () => {
      const newBird = {
        id: Date.now(),
        x: 800,
        y: 80 + Math.random() * 150, // 80~230px 높이에서 랜덤
        emoji: seasonEffectsRef.current.isNight ? '🦉' : '🦅', // 밤 시즌에는 부엉이, 낮 시즌에는 독수리
        size: 40,
        speed: 1.0 + Math.random() * 0.6, // 1.0 ~ 1.6 랜덤 스피드
      };
      setBirds((prev) => [...prev, newBird]);

      // 속도에 비례하여 새 생성 간격도 조정
      const speedRatio = gameSpeedRef.current / BASE_GAME_SPEED;
      const adjustedRatio = Math.pow(speedRatio, 0.85);
      const baseInterval = 2500 + Math.random() * 1500; // 2.5초 ~ 4초
      const nextInterval = baseInterval * adjustedRatio;
      birdIntervalRef.current = setTimeout(spawnBird, nextInterval);
    };

    // 첫 새 생성
    birdIntervalRef.current = setTimeout(spawnBird, 4000);

    // 물리 엔진 및 충돌 감지
    const gameLoop = () => {
      // 시간 경과 계산 (초)
      const now = typeof performance !== 'undefined' ? performance.now() : 0;
      const dt =
        now && lastTsRef.current ? (now - lastTsRef.current) / 1000 : 1 / 60;
      lastTsRef.current = now || lastTsRef.current;

      // 플레이어 위치 업데이트 (dt 기반 물리)
      setPlayerY((prevY) => {
        // 중력 적용 (아래로 떨어지도록)
        playerVelocityRef.current -= GRAVITY * dt * 60;
        const newY = prevY + playerVelocityRef.current * dt * 60;

        // 바닥에 닿았을 때
        if (newY <= 0) {
          playerVelocityRef.current = 0;

          // 착지 시 먼지 이펙트 생성
          if (!isOnGroundRef.current && prevY > 10) {
            const dustCount = 5 + Math.floor(Math.random() * 3);
            const newDusts = [];
            for (let i = 0; i < dustCount; i++) {
              const angle = (i / dustCount) * Math.PI * 2 - Math.PI / 2;
              const power = 50 + Math.random() * 50;
              newDusts.push({
                id: Date.now() + Math.random(),
                left: 100 - 5,
                top: GROUND_HEIGHT,
                burstX: Math.cos(angle) * power,
                burstY: Math.sin(angle) * power,
                size: 4 + Math.random() * 5,
                delay: 0,
              });
            }
            setJumpDusts((prev) => [...prev, ...newDusts]);
          }

          setJumpCount(0); // 바닥에 닿으면 점프 카운트 리셋
          isOnGroundRef.current = true;
          playerYRef.current = 0;
          return 0;
        }
        isOnGroundRef.current = false;
        playerYRef.current = newY;
        return newY;
      });

      // 러닝 바운스 오프셋 계산: 바닥에서 달릴 때만 적용
      if (gameState === 'playing' && isOnGroundRef.current) {
        // 시간 진행은 고정 dt 누적, 바운스 주파수만 속도에 비례
        bobTimeRef.current += dt;
        const effectiveFrequency =
          BOBBING_FREQUENCY * Math.max(1, gameSpeedRef.current);
        bobOffsetRef.current =
          Math.sin(bobTimeRef.current * effectiveFrequency) * BOBBING_AMPLITUDE;
      } else {
        bobOffsetRef.current = 0;
      }

      // 지형(카메라) 오프셋: 속도에 비례한 부드러운 웨이브
      const terrainFreq = 0.4 + Math.min(1.2, gameSpeedRef.current * 0.05);
      const terrainAmp = 12; // 8~18 권장
      terrainPhaseRef.current += dt * terrainFreq;
      terrainOffsetRef.current = Math.sin(terrainPhaseRef.current) * terrainAmp;

      // 패럴랙스: 속도에 비례해 좌우 이동 (좌측으로 흐름)
      const pxSpeedFar =
        12 * Math.max(1, gameSpeedRef.current) * dt * 60 * 0.15;
      const pxSpeedNear =
        12 * Math.max(1, gameSpeedRef.current) * dt * 60 * 0.35;
      parallaxFarXRef.current -= pxSpeedFar;
      parallaxNearXRef.current -= pxSpeedNear;

      // 밤/안개 강도 동적 계산 (속도 따라 가시성 보정)
      const speed = Math.max(1, gameSpeedRef.current);
      const speedFactor = Math.min(1, (speed - 1) / 4); // 1..5배속 → 0..1
      const isCloudy =
        seasonEffectsRef.current.base === 'clouds' ||
        seasonEffectsRef.current.extra === 'clouds';

      // 밤 알파: 기본보다 약간 가변 (고속일수록 살짝 완화)
      const nightTarget = seasonEffectsRef.current.isNight
        ? Math.min(0.82, Math.max(0.65, 0.72 + 0.1 * (1 - speedFactor)))
        : 0;
      nightFadeRef.current +=
        (nightTarget - nightFadeRef.current) * Math.min(1, dt * 3);

      // 안개 강도/블러: 구름 시즌일 때만 적용, 고속일수록 약간 약화 (극강 날씨 시 강화)
      const fogBaseTop = isCloudy ? 0.38 : 0;
      const fogBaseGround = isCloudy ? 0.46 : 0;
      const intensityMultiplier =
        seasonEffectsRef.current.intensity === 'extreme'
          ? 1.8
          : seasonEffectsRef.current.intensity === 'heavy'
          ? 1.4
          : 1;
      const fogTop =
        fogBaseTop * (1 - 0.25 * speedFactor) * intensityMultiplier;
      const fogGround =
        fogBaseGround * (1 - 0.25 * speedFactor) * intensityMultiplier;
      fogTopOpacityRef.current +=
        (fogTop - fogTopOpacityRef.current) * Math.min(1, dt * 3);
      fogGroundOpacityRef.current +=
        (fogGround - fogGroundOpacityRef.current) * Math.min(1, dt * 3);
      const fogTopBlur = isCloudy
        ? (2.8 - 1.0 * speedFactor) * intensityMultiplier
        : 0;
      const fogGroundBlur = isCloudy
        ? (3.6 - 1.2 * speedFactor) * intensityMultiplier
        : 0;
      fogTopBlurRef.current +=
        (fogTopBlur - fogTopBlurRef.current) * Math.min(1, dt * 3);
      fogGroundBlurRef.current +=
        (fogGroundBlur - fogGroundBlurRef.current) * Math.min(1, dt * 3);

      // 러너 잔상 업데이트: 최근 위치 5개 유지
      if (gameState === 'playing') {
        const playerBottomNow =
          GROUND_HEIGHT +
          playerYRef.current +
          (isOnGroundRef.current ? bobOffsetRef.current : 0);
        setGhosts((prev) => {
          const next = [{ bottom: playerBottomNow, leftOffset: 0 }].concat(
            prev
          );
          return next.slice(0, 5);
        });
      } else {
        setGhosts([]);
      }

      // 먼지 파티클 스폰 및 이동 업데이트
      particleCooldownRef.current = Math.max(
        0,
        particleCooldownRef.current - dt
      );
      const spawnInterval = Math.max(
        0.03,
        0.08 / Math.max(1, gameSpeedRef.current)
      );
      const shouldSpawn =
        gameState === 'playing' &&
        isOnGroundRef.current &&
        particleCooldownRef.current <= 0;
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x - p.vx * dt,
            y: p.y + p.vy * dt,
            life: p.life - dt,
            opacity: Math.max(0, p.opacity - dt * 2),
          }))
          .filter((p) => p.life > 0 && p.x > -p.size);

        if (shouldSpawn && updated.length < MAX_PARTICLES) {
          particleCooldownRef.current = spawnInterval;
          const baseX = 100 + 20;
          const baseY = GROUND_HEIGHT + 8;
          const size = 6 + Math.random() * 4;
          const newParticle = {
            id: Date.now() + Math.random(),
            x: baseX,
            y: baseY,
            vx: 150 + 50 * Math.random() * Math.max(1, gameSpeedRef.current),
            vy: -20 - 20 * Math.random(),
            size,
            life: 0.5 + Math.random() * 0.3,
            opacity: 0.8,
          };
          updated.push(newParticle);
        }
        return updated.slice(-MAX_PARTICLES);
      });

      // 모션 블러 업데이트 및 필터링 (최대 20개로 제한)
      setMotionBlurs((prev) =>
        prev.filter((blur) => (blur.delay -= dt) > -0.4).slice(-20)
      );

      // 점프 먼지 이펙트 업데이트 및 필터링 (최대 50개로 제한)
      setJumpDusts((prev) => {
        return prev
          .map((dust) => ({
            ...dust,
            age: (dust.age || 0) + dt,
          }))
          .filter((dust) => dust.age < 0.6)
          .slice(-50);
      });

      // 장애물 이동 및 충돌 감지
      setObstacles((prevObstacles) => {
        const newObstacles = prevObstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - gameSpeedRef.current * dt * 60,
          }))
          .filter((obstacle) => obstacle.x > -obstacle.width);

        return newObstacles;
      });

      // 새 이동
      setBirds((prevBirds) => {
        const newBirds = prevBirds
          .map((bird) => ({
            ...bird,
            x: bird.x - gameSpeedRef.current * (bird.speed || 1.2) * dt * 60, // 개별 랜덤 스피드 적용
          }))
          .filter((bird) => bird.x > -bird.size);

        return newBirds;
      });

      // 코인 이동 및 화면 밖 제거 (자석 파워업 활성 시 자동 수집)
      setCoins((prevCoins) => {
        const playerLeft = 100;
        const playerRight = playerLeft + PLAYER_SIZE;
        const playerCenterY = playerY + PLAYER_SIZE / 2;

        const moved = prevCoins
          .map((coin) => {
            let coinX =
              coin.x - gameSpeedRef.current * (coin.speed || 1.2) * dt * 60;
            let coinY = coin.y;

            // 자석 파워업 활성 시 플레이어를 향해 끌어당김
            if (magnetActiveDurationRef.current > 0) {
              const MAGNET_RANGE = 150;
              const MAGNET_SPEED = 200; // px/s
              const dx = playerRight - 20 - coinX; // 플레이어 중앙
              const dy = playerCenterY - coinY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < MAGNET_RANGE) {
                // 범위 내이면 플레이어를 향해 끌어당김
                const moveDistance = MAGNET_SPEED * dt;
                if (distance > 0) {
                  coinX += (dx / distance) * moveDistance;
                  coinY += (dy / distance) * moveDistance;
                }
              }
            }

            return {
              ...coin,
              x: coinX,
              y: coinY,
            };
          })
          .filter((coin) => coin.x > -coin.size);
        return moved;
      });

      // 파워업 이동 및 화면 밖 제거
      setPowerUps((prevPowerUps) => {
        const moved = prevPowerUps
          .map((powerUp) => ({
            ...powerUp,
            x:
              powerUp.x -
              gameSpeedRef.current * (powerUp.speed || 0.8) * dt * 60,
          }))
          .filter((powerUp) => powerUp.x > -powerUp.size);

        return moved;
      });

      // 파워업 효과 지속시간 업데이트
      // 자석 효과 시간 감소
      if (magnetActiveDurationRef.current > 0) {
        magnetActiveDurationRef.current -= dt * 1000;
      }

      // 슬로모션(속도 고정) 효과 시간 감소 + 해제 시 고정 해제
      if (slowMoActiveDurationRef.current > 0) {
        slowMoActiveDurationRef.current -= dt * 1000;
        if (slowMoActiveDurationRef.current <= 0) {
          slowMoActiveDurationRef.current = 0;
          slowFreezeSpeedRef.current = null;
        }
      }

      // 트리플 점프 활성 중이면 점프 카운트 유지
      // (jumpCount 상태는 별도로 관리됨)

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
      if (obstacleIntervalRef.current) {
        clearTimeout(obstacleIntervalRef.current);
      }
      if (birdIntervalRef.current) {
        clearTimeout(birdIntervalRef.current);
      }
    };
  }, [gameState]);

  // 충돌 감지 (별도 useEffect)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkCollision = () => {
      const nowTs = typeof performance !== 'undefined' ? performance.now() : 0;
      const isInvincible = invincibleUntilRef.current > nowTs;
      const playerLeft = 100;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerBottom = playerY;
      const playerTop = playerBottom + PLAYER_SIZE;

      for (let obstacle of obstacles) {
        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleTop = obstacle.height;

        if (
          playerRight > obstacleLeft + 10 &&
          playerLeft < obstacleRight - 10 &&
          playerBottom < obstacleTop - 10
        ) {
          // 충돌 발생 - 실드 확인
          if (shieldActive) {
            // 실드로 보호됨: 실드 해제 + 잠깐 무적 + 충돌 장애물 제거
            setShieldActive(false);
            invincibleUntilRef.current = nowTs + 600; // 0.6초 무적

            // 쉴드 깨짐 이펙트: 쉴드 색깔과 동일한 파란색 파티클 폭발
            const shieldBreakParticles = [];
            const particleCount = 12; // 입자 개수
            for (let i = 0; i < particleCount; i++) {
              const angle = (i / particleCount) * Math.PI * 2;
              const speed = 200 + Math.random() * 150;
              shieldBreakParticles.push({
                id: Date.now() + Math.random(),
                x: 100 + PLAYER_SIZE / 2,
                y: GROUND_HEIGHT + playerYRef.current + PLAYER_SIZE / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8 + Math.random() * 4,
                life: 0.6 + Math.random() * 0.2,
                opacity: 1,
                color: 'rgba(100, 200, 255, 0.8)',
              });
            }
            setParticles((prev) => [...prev, ...shieldBreakParticles]);

            setObstacles((prev) => prev.filter((o) => o.id !== obstacle.id));
            return; // 게임 오버 안 함
          }

          // 무적 상태면 무시
          if (isInvincible) {
            continue;
          }

          // 충돌 발생
          setGameState('gameOver');
          if (score > highScore) {
            setIsNewRecord(true);
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          // 자동으로 서버에 점수 저장
          const currentName = playerName || 'Runner';
          saveScoreAuto(currentName, score, sessionCoins, userId);
          // 모달 표시
          setShowNameModal(true);
          return;
        }
      }

      // 새와 충돌 감지
      for (let bird of birds) {
        const birdLeft = bird.x;
        const birdRight = bird.x + bird.size;
        const birdBottom = bird.y;
        const birdTop = bird.y + bird.size;

        if (
          playerRight > birdLeft + 10 &&
          playerLeft < birdRight - 10 &&
          playerTop > birdBottom + 10 &&
          playerBottom < birdTop - 10
        ) {
          // 새와 충돌 발생 - 실드 확인
          if (shieldActive) {
            // 실드로 보호됨: 실드 해제 + 잠깐 무적 + 충돌 새 제거
            setShieldActive(false);
            invincibleUntilRef.current = nowTs + 600; // 0.6초 무적

            // 쉴드 깨짐 이펙트: 쉴드 색깔과 동일한 파란색 파티클 폭발
            const shieldBreakParticles = [];
            const particleCount = 12;
            for (let i = 0; i < particleCount; i++) {
              const angle = (i / particleCount) * Math.PI * 2;
              const speed = 200 + Math.random() * 150;
              shieldBreakParticles.push({
                id: Date.now() + Math.random(),
                x: 100 + PLAYER_SIZE / 2,
                y: GROUND_HEIGHT + playerYRef.current + PLAYER_SIZE / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8 + Math.random() * 4,
                life: 0.6 + Math.random() * 0.2,
                opacity: 1,
                color: 'rgba(100, 200, 255, 0.8)',
              });
            }
            setParticles((prev) => [...prev, ...shieldBreakParticles]);

            setBirds((prev) => prev.filter((b) => b.id !== bird.id));
            return; // 게임 오버 안 함
          }

          // 무적 상태면 무시
          if (isInvincible) {
            continue;
          }

          // 새와 충돌 발생
          setGameState('gameOver');
          if (score > highScore) {
            setIsNewRecord(true);
            setHighScore(score);
            localStorage.setItem('runnerHighScore', score.toString());
          }
          // 자동으로 서버에 점수 저장
          const currentName = playerName || 'Runner';
          saveScoreAuto(currentName, score, sessionCoins, userId);
          // 모달 표시
          setShowNameModal(true);
          return;
        }
      }

      // 코인 획득 감지
      let collected = false;
      let collectedValue = 0;
      const remaining = [];
      for (let coin of coins) {
        const coinLeft = coin.x;
        const coinRight = coin.x + coin.size;
        const coinBottom = coin.y;
        const coinTop = coin.y + coin.size;

        const hit =
          playerRight > coinLeft + 6 &&
          playerLeft < coinRight - 6 &&
          playerTop > coinBottom + 6 &&
          playerBottom < coinTop - 6;

        if (hit) {
          collected = true;
          collectedValue += coin.value || 1; // 코인 값 누적
        } else {
          remaining.push(coin);
        }
      }
      if (collected) {
        setCoins(remaining);
        setCoinCount((prev) => {
          const next = prev + collectedValue;
          localStorage.setItem('runnerCoins', next.toString());
          return next;
        });
        setSessionCoins((prev) => prev + collectedValue);
      }

      // 파워업 획득 감지 (코인과 동일한 로직)
      let powerUpCollected = false;
      const remainingPowerUps = [];
      for (let powerUp of powerUps) {
        const powerUpLeft = powerUp.x;
        const powerUpRight = powerUp.x + powerUp.size;
        const powerUpBottom = powerUp.y;
        const powerUpTop = powerUp.y + powerUp.size;

        const hit =
          playerRight > powerUpLeft + 3 &&
          playerLeft < powerUpRight - 3 &&
          playerTop > powerUpBottom + 3 &&
          playerBottom < powerUpTop - 3;

        if (hit) {
          powerUpCollected = true;
          // 파워업 효과 활성화
          switch (powerUp.type) {
            case 'magnet':
              magnetActiveDurationRef.current = 20000; // 20초
              break;
            case 'shield':
              setShieldActive(true);
              break;
            case 'slowmo':
              slowMoActiveDurationRef.current = 15000; // 15초
              // 발동 시점의 속도로 고정
              slowFreezeSpeedRef.current = gameSpeedRef.current;
              break;
            case 'triplejump':
              tripleJumpCountRef.current = 1; // 추가 1회 점프
              break;
            default:
              break;
          }
          setActivePowerUp({ type: powerUp.type });
        } else {
          remainingPowerUps.push(powerUp);
        }
      }
      if (powerUpCollected) {
        setPowerUps(remainingPowerUps);
        // 파워업 획득 이펙트: 황색 먼지 생성
        const dustCount = 8 + Math.floor(Math.random() * 4);
        const newDusts = [];
        for (let i = 0; i < dustCount; i++) {
          const angle = (i / dustCount) * Math.PI * 2;
          const power = 80 + Math.random() * 40;
          newDusts.push({
            id: Date.now() + Math.random(),
            left: 100 + Math.random() * 200,
            top:
              GROUND_HEIGHT +
              playerY +
              terrainOffsetRef.current +
              PLAYER_SIZE / 2,
            burstX: Math.cos(angle) * power,
            burstY: Math.sin(angle) * power,
            size: 6 + Math.random() * 4,
            delay: 0,
          });
        }
        setJumpDusts((prev) => [...prev, ...newDusts].slice(-50));
      }
    };

    checkCollision();
  }, [
    obstacles,
    birds,
    coins,
    playerY,
    gameState,
    score,
    highScore,
    playerName,
    sessionCoins,
    userId,
    saveScoreAuto,
    setShowNameModal,
    shieldActive,
  ]);

  return (
    <>
      <Helmet>
        <title>러너 게임</title>
        <meta property="og:title" content="러너 게임" />
        <meta
          property="og:description"
          content="캐릭터를 선택하고 장애물을 점프로 피하는 러너 게임입니다."
        />
        <meta
          property="og:url"
          content="https://codefeat.netlify.app/games/runner"
        />
      </Helmet>

      <div
        ref={containerRef}
        className={styles['runner-game']}
        style={{
          background: runnerBackground,
          // CSS 변수로 전달해 전체 텍스트가 상속받도록 처리
          '--runner-fg': runnerTextColor,
          '--runner-muted': runnerMutedColor,
          '--runner-accent': runnerAccentColor,
          transition: 'background 0.8s ease, color 0.3s ease',
        }}
      >
        <div className={styles['runner-header']}>
          <div className={styles['runner-toolbar']}>
            <div className={styles['brand']}>🏃 러너 게임</div>
            <div className={styles['toolbar-spacer']} />
            <button
              type="button"
              className={`${styles['stat-pill']} ${styles['pill-name']}`}
              onClick={() => {
                setEditingName(true);
                setShowNameModal(true);
              }}
              aria-label="닉네임 변경"
            >
              👤 {playerName || 'Runner'}
            </button>
            <div className={`${styles['stat-pill']} ${styles['pill-score']}`}>
              🏅 {score}
            </div>
            <div className={`${styles['stat-pill']} ${styles['pill-speed']}`}>
              ⚡ {gameSpeed.toFixed(1)}x
            </div>
            <div className={`${styles['stat-pill']} ${styles['pill-high']}`}>
              🥇 {highScore}
            </div>
            <button
              className={`${styles['stat-pill']} ${styles['pill-coins']} ${styles['clickable']}`}
              onClick={() => setShowPurchaseHistory(true)}
              title="구매 이력 보기"
            >
              💰 {coinCount}
            </button>
          </div>
        </div>

        {gameState === 'menu' && (
          <>
            <div className={styles['runner-menu']}>
              <h2 className={styles.subtitle}>캐릭터를 선택하세요</h2>
              <div className={styles['character-selection']}>
                {availableCharacters.map((character) => (
                  <button
                    key={character.id}
                    className={`${styles['character-btn']} ${
                      selectedCharacter.id === character.id
                        ? styles.selected
                        : ''
                    }`}
                    onClick={() => selectCharacter(character)}
                  >
                    <span className={styles['character-emoji']}>
                      {character.image ? (
                        <img
                          src={character.image}
                          alt={character.name}
                          style={{
                            width: '4rem',
                            objectFit: 'cover',
                            boxSizing: 'border-box',
                            // marginTop: '-1.3rem',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: '3rem',
                            objectFit: 'cover',
                            boxSizing: 'border-box',
                          }}
                        >
                          {character.emoji}
                        </div>
                      )}
                    </span>
                    <span
                      className={styles['character-name']}
                      // style={character.image ? { marginTop: '-3rem' } : {}}
                    >
                      {character.name}
                    </span>
                  </button>
                ))}
              </div>
              <button className={styles['start-btn']} onClick={startGame}>
                게임 시작
              </button>
              <button
                className={styles['shop-btn']}
                onClick={() => setGameState('shop')}
              >
                🏪 상점
              </button>
            </div>

            <div className={styles.instructions}>
              <h3
                style={{
                  margin: '0 0 15px 0',
                  fontSize: '1.3rem',
                  textAlign: 'center',
                  color: 'var(--runner-accent)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                }}
              >
                📖 게임 설명
              </h3>
              <p>
                💡 <strong>조작</strong>: 스페이스바, 방향키 ↑ 또는 터치/마우스
                클릭으로 점프하세요. <br />
                더블 점프도 가능합니다!
              </p>
            </div>
            <div className={styles.instructions} style={{ marginTop: '20px' }}>
              <ScoreBoard
                highScores={highScores}
                isLoadingScores={isLoadingScores}
              />
            </div>
          </>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className={styles['game-container']}>
            <div
              className={`${
                styles['game-canvas']
              } ${`season-${seasonEffects.season}`} ${
                seasonEffects.isNight ? 'night' : 'day'
              }`}
              onClick={() => gameState === 'playing' && jump()}
              onTouchStart={() => gameState === 'playing' && jump()}
              style={{
                // 밤에는 디서츄레이션/명도↓/대비↑를 nightFade에 연동 + 안개 블러를 화면 전체에 적용 + 시즌별 톤 필터
                filter: (() => {
                  // 밤 필터 (가을 밤에는 단풍이 보이도록 밝기 조정)
                  let nightFilter = 'none';
                  if (seasonEffects.isNight) {
                    const isAutumnNight = seasonEffects.season === 'autumn';
                    // 가을 밤에는 단풍이 보이도록 더 밝고 채도 유지
                    const brightnessFactor = isAutumnNight ? 0.06 : 0.18;
                    const contrastFactor = isAutumnNight ? 0.05 : 0.12;
                    const baseBrightness = isAutumnNight ? 0.94 : 0.86;
                    const baseSaturate = isAutumnNight ? 0.98 : 0.88;
                    nightFilter = `saturate(${baseSaturate}) brightness(${(
                      baseBrightness -
                      nightFadeRef.current * brightnessFactor
                    ).toFixed(3)}) contrast(${(
                      1.05 +
                      nightFadeRef.current * contrastFactor
                    ).toFixed(3)})`;
                  }

                  // 시즌별 톤 필터 (극강 날씨 시 강화)
                  let seasonTone = '';
                  const isIntenseWeather =
                    seasonEffects.intensity === 'heavy' ||
                    seasonEffects.intensity === 'extreme';
                  if (seasonEffects.season === 'spring') {
                    seasonTone = isIntenseWeather
                      ? `hue-rotate(-5deg) saturate(1.15)`
                      : `saturate(1.05)`;
                  } else if (seasonEffects.season === 'summer') {
                    seasonTone = isIntenseWeather
                      ? `hue-rotate(8deg) saturate(1.25) brightness(1.08)`
                      : `saturate(1.1) brightness(1.02)`;
                  } else if (seasonEffects.season === 'autumn') {
                    seasonTone = isIntenseWeather
                      ? `hue-rotate(15deg) saturate(1.3) brightness(1.05)`
                      : `hue-rotate(8deg) saturate(1.15)`;
                  } else if (seasonEffects.season === 'winter') {
                    seasonTone = isIntenseWeather
                      ? `hue-rotate(-12deg) saturate(0.95) brightness(0.98)`
                      : `hue-rotate(-8deg) saturate(0.92)`;
                  }

                  // 평균 안개 블러 (구름 시즌에서만 의미 있게 적용)
                  const isFoggy =
                    seasonEffects.base === 'clouds' ||
                    seasonEffects.extra === 'clouds';
                  const fogBlur = isFoggy
                    ? parseFloat(
                        (
                          (fogTopBlurRef.current + fogGroundBlurRef.current) /
                          2
                        ).toFixed(2)
                      )
                    : 0;

                  // 모든 필터를 결합
                  const filters = [
                    nightFilter,
                    seasonTone,
                    fogBlur > 0 ? `blur(${fogBlur}px)` : '',
                  ].filter((f) => f);
                  return filters.join(' ').trim();
                })(),
                transition: 'filter 0.4s ease',
              }}
            >
              {/* 파워업/버프 오버레이: 게임 화면 좌상단 표시 */}
              {gameState === 'playing' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    display: 'flex',
                    gap: 6,
                    zIndex: 5,
                  }}
                >
                  {shieldActive && (
                    <div
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'rgba(100, 200, 255, 0.8)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#002233',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    >
                      🛡️ Shield
                    </div>
                  )}
                  {magnetActiveDurationRef.current > 0 && (
                    <div
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'rgba(200, 100, 200, 0.8)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#2b0a2b',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    >
                      🧲 {(magnetActiveDurationRef.current / 1000).toFixed(1)}s
                    </div>
                  )}
                  {slowMoActiveDurationRef.current > 0 && (
                    <div
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'rgba(200, 200, 100, 0.8)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#332b00',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    >
                      ⏱️ {(slowMoActiveDurationRef.current / 1000).toFixed(1)}s
                    </div>
                  )}
                  {tripleJumpCountRef.current > 0 && (
                    <div
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'rgba(100, 200, 100, 0.8)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#0d2b0d',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                      }}
                    >
                      ⬆️ x1
                    </div>
                  )}
                </div>
              )}
              {/* 패럴랙스 능선 레이어 (원경/근경) — 전역 비활성화 */}
              {/* 타원형 실루엣이 시각적 방해가 되어 비활성화. 향후 불릿 타입 배경으로 대체 가능 */}
              {false && (
                <ParallaxLayers
                  farX={parallaxFarXRef.current}
                  nearX={parallaxNearXRef.current}
                  isNight={seasonEffects.isNight}
                  season={seasonEffects.season}
                />
              )}
              {/* 기본 이펙트 렌더링 */}
              {seasonEffects.base === 'sun' && (
                <div className="sky-object sun">☀️</div>
              )}
              {seasonEffects.base === 'moon' && (
                <div className="sky-object moon">🌙</div>
              )}
              {seasonEffects.base === 'clouds' && (
                <div className="clouds-layer">
                  {commonElements.clouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        top: cloud.top,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                      }}
                    >
                      {cloud.emoji}
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.base === 'leaves' && (
                <div className="season-layer autumn">
                  {commonElements.leaves.map((item) => (
                    <span
                      key={item.id}
                      className="leaf"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--leaf-x': item.left,
                      }}
                    >
                      🍁
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.base === 'snow' && (
                <div className="season-layer winter">
                  {commonElements.snow.map((item) => (
                    <span
                      key={item.id}
                      className="snowflake"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--snow-x': item.left,
                      }}
                    >
                      ❄️
                    </span>
                  ))}
                </div>
              )}

              {/* 추가 이펙트 렌더링 */}
              {seasonEffects.extra === 'petals' && (
                <div className="season-layer spring">
                  {commonElements.petals.map((item) => (
                    <span
                      key={item.id}
                      className="petal"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--petal-x': item.left,
                      }}
                    >
                      🌸
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'stars' && (
                <div className="effects-layer">
                  {commonElements.stars.map((star) => (
                    <span
                      key={star.id}
                      className="star twinkle"
                      style={{
                        left: star.left,
                        top: star.top,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        opacity: star.opacity,
                        animationDelay: star.delay,
                        animationDuration: star.twinkleDuration,
                        filter: `blur(${star.blur}px)`,
                        boxShadow: `0 0 ${Math.max(
                          1.5,
                          star.size * 1.6
                        )}px rgba(255,255,255,${Math.min(
                          1,
                          star.opacity + 0.35
                        )})`,
                      }}
                    />
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'rain' && (
                <div className="season-layer summer">
                  {commonElements.rain.map((item) => (
                    <span
                      key={item.id}
                      className="raindrop"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        '--rain-x': item.left,
                      }}
                    />
                  ))}
                </div>
              )}
              {/* 비 스트릭 오버레이: 빠른 대각선 빗줄기 (강도는 속도에 연동) */}
              {seasonEffects.extra === 'rain' && (
                <div
                  className="rain-streaks"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                      'repeating-linear-gradient(120deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.0) 3px, rgba(255,255,255,0.0) 12px)',
                    opacity: (() => {
                      // 극강 날씨일 때 비 스트릭 강도 증가
                      const baseOpacity = Math.min(
                        0.45,
                        0.25 + Math.max(0, (gameSpeedRef.current - 1) * 0.06)
                      );
                      const intensityMultiplier =
                        seasonEffects.intensity === 'extreme'
                          ? 2.5
                          : seasonEffects.intensity === 'heavy'
                          ? 1.6
                          : 1;
                      return Math.min(0.95, baseOpacity * intensityMultiplier);
                    })(),
                    mixBlendMode: 'screen',
                  }}
                />
              )}
              {seasonEffects.extra === 'clouds' && (
                <div className="clouds-layer">
                  {commonElements.clouds.map((cloud) => (
                    <span
                      key={cloud.id}
                      className="cloud"
                      style={{
                        left: cloud.left,
                        top: cloud.top,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                      }}
                    >
                      {cloud.emoji}
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'leaves' && (
                <div className="season-layer autumn">
                  {commonElements.leaves.map((item) => (
                    <span
                      key={item.id}
                      className="leaf"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--leaf-x': item.left,
                      }}
                    >
                      🍁
                    </span>
                  ))}
                </div>
              )}
              {seasonEffects.extra === 'snow' && (
                <div className="season-layer winter">
                  {commonElements.snow.map((item) => (
                    <span
                      key={item.id}
                      className="snowflake"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        animationDuration: item.duration,
                        '--snow-x': item.left,
                      }}
                    >
                      ❄️
                    </span>
                  ))}
                </div>
              )}

              {/* 가시성 변화 오버레이 (안개/밤 페이드) */}
              {/* 구름 시즌일 때 은은한 안개 */}
              {(seasonEffects.base === 'clouds' ||
                seasonEffects.extra === 'clouds') && (
                <div
                  className="fog-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    // 균일한 얕은 화이트로 뿌연 느낌만 부여 (블러는 canvas filter로 처리)
                    background: 'rgba(255,255,255,0.08)',
                    // 상/하단 강도를 평균화한 단일 불투명도
                    opacity: Math.min(
                      0.55,
                      Math.max(
                        0.2,
                        (fogTopOpacityRef.current +
                          fogGroundOpacityRef.current) *
                          0.65
                      )
                    ),
                    transition: 'opacity 0.3s ease',
                  }}
                />
              )}
              {/* 밤 페이드 오버레이 */}
              {seasonEffects.isNight && (
                <>
                  {/* 전체 어둡게 페이드 */}
                  <div
                    className="night-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      background: `rgba(0,0,0,${nightFadeRef.current})`,
                      transition: 'background 0.6s ease',
                    }}
                  />
                  {/* 비네트: 가장자리 어둡게, 중앙 강조 */}
                  <div
                    className="vignette-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      background:
                        'radial-gradient(circle at 50% 60%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)',
                    }}
                  />
                </>
              )}

              {/* 특수 이펙트 렌더링 (단독 연출) */}
              {seasonEffects.special === 'lightning' && (
                <div className="effects-layer">
                  {commonElements.lightning.map((lightning) => (
                    <div
                      key={lightning.id}
                      className="lightning-flash"
                      style={{
                        animationDelay: lightning.delay,
                      }}
                    />
                  ))}
                </div>
              )}
              {seasonEffects.special === 'sleet' && (
                <div className="season-layer winter">
                  {commonElements.sleet.map((item) => (
                    <span
                      key={item.id}
                      className="sleet"
                      style={{
                        left: item.left,
                        animationDelay: item.delay,
                        '--sleet-x': item.left,
                      }}
                    >
                      🌨️
                    </span>
                  ))}
                </div>
              )}

              {/* 플레이어 */}
              <PlayerCharacter
                selectedCharacter={selectedCharacter}
                playerY={playerY}
                bobOffset={
                  gameState === 'playing' && isOnGroundRef.current
                    ? bobOffsetRef.current
                    : 0
                }
                gameState={gameState}
                isOnGround={isOnGroundRef.current}
                runImage={f1RunImage}
                ghosts={ghosts}
                jumpCount={jumpCount}
                terrainOffset={terrainOffsetRef.current}
                shieldActive={shieldActive}
              />

              {/* 장애물, 새, 코인, 파워업 */}
              <GameObstacles
                obstacles={obstacles}
                birds={birds}
                coins={coins}
                powerUps={powerUps}
                terrainOffset={terrainOffsetRef.current}
              />

              {/* 바닥 */}
              <div className={styles.ground}>
                <div
                  className={styles['ground-pattern']}
                  style={{
                    animationDuration: `${Math.max(
                      0.6,
                      2 / Math.max(1, gameSpeed)
                    )}s`,
                    transform: `translateY(${terrainOffsetRef.current}px)`,
                  }}
                />
              </div>

              {/* 먼지 파티클 */}
              <ParticleEffects particles={particles} />

              {/* 모션 블러 (속도선) */}
              {motionBlurs.map((blur) => (
                <div
                  key={blur.id}
                  className="motion-blur"
                  style={{
                    left: `${blur.left}px`,
                    top: `${blur.top}px`,
                    animationDelay: `${blur.delay}s`,
                  }}
                />
              ))}

              {/* 점프 착지 먼지 */}
              {jumpDusts.map((dust) => {
                const progress = Math.min(1, (dust.age || 0) / 0.6);
                const scale = 1 - progress * 0.7;
                const opacity = Math.max(0, 1 - progress);
                const offsetX = dust.burstX * progress;
                const offsetY = dust.burstY * progress;
                return (
                  <div
                    key={dust.id}
                    className="jump-dust"
                    style={{
                      left: `${dust.left}px`,
                      top: `${dust.top}px`,
                      width: `${dust.size}px`,
                      height: `${dust.size}px`,
                      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                      opacity: opacity,
                    }}
                  />
                );
              })}
            </div>
            {gameState === 'playing' && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 8,
                }}
              >
                <ins
                  className="kakao_ad_area"
                  data-ad-unit="DAN-IMNTXI7IePMvzVan"
                  data-ad-width="728"
                  data-ad-height="90"
                ></ins>
              </div>
            )}
            {gameState === 'playing' && (
              <div className={styles['bottom-panel']}>
                <div className={styles['bottom-header']}>
                  <div className={styles['bottom-title']}>
                    🎮 플레이 가이드 & 랭킹 요약
                  </div>
                  <button
                    type="button"
                    className={styles['bottom-toggle']}
                    onClick={() => setPanelCollapsed((v) => !v)}
                    aria-label={
                      panelCollapsed ? '하단 패널 펼치기' : '하단 패널 접기'
                    }
                  >
                    {panelCollapsed ? '▲ 펼치기' : '▼ 접기'}
                  </button>
                </div>
                {!panelCollapsed && (
                  <div className={styles['bottom-content']}>
                    <div className={styles['panel-section']}>
                      <h4 className={styles['panel-title']}>컨트롤</h4>
                      <ul className={styles['controls-list']}>
                        <li>스페이스바 / ↑ / 터치: 점프</li>
                        <li>공중에서 한 번 더: 더블 점프</li>
                        <li>장애물은 점프로 회피</li>
                      </ul>
                      <div className={styles['live-stats']}>
                        <span>속도: {gameSpeed.toFixed(1)}x</span>
                        <span>세션 코인: {sessionCoins}</span>
                        <span>총 코인: {coinCount}</span>
                      </div>
                    </div>
                    <div className={styles['panel-section']}>
                      <h4 className={styles['panel-title']}>상위 랭킹</h4>
                      {isLoadingScores ? (
                        <div className={styles['panel-loading']}>
                          불러오는 중...
                        </div>
                      ) : (
                        <ul className={styles['mini-score-list']}>
                          {(highScores || []).slice(0, 5).map((row, idx) => (
                            <li key={`${row.name}-${row.date || idx}`}>
                              <span className={styles['mini-rank']}>
                                #{idx + 1}
                              </span>
                              <span className={styles['mini-name']}>
                                {row.name}
                              </span>
                              <span className={styles['mini-score']}>
                                {row.score}
                              </span>
                            </li>
                          ))}
                          {(highScores || []).length === 0 && (
                            <div className={styles['panel-empty']}>
                              랭킹 데이터가 없습니다
                            </div>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {gameState === 'shop' && (
          <div className={styles['shop-wrapper']}>
            <CharacterShop
              userId={userId}
              coins={coinCount}
              onCoinsUpdate={(newBalance) => {
                setCoinCount(newBalance);
                localStorage.setItem('runnerCoins', newBalance.toString());
              }}
              onClose={() => setGameState('menu')}
              onPurchase={(purchasedItem) => {
                // 구매한 캐릭터가 CHARACTER 카테고리면 사용 가능한 캐릭터 목록에 추가
                if (
                  purchasedItem.itemCode &&
                  purchasedItem.itemCode.startsWith('CHAR_')
                ) {
                  const newChar = {
                    id: purchasedItem.itemCode.toLowerCase(),
                    name: purchasedItem.emoji,
                    emoji: purchasedItem.emoji,
                  };
                  setAvailableCharacters((prev) => {
                    if (prev.find((c) => c.id === newChar.id)) return prev;
                    return [...prev, newChar];
                  });
                }
              }}
            />
          </div>
        )}

        <GameModal
          showModal={showNameModal}
          score={score}
          coins={sessionCoins}
          isNewRecord={isNewRecord}
          playerName={playerName}
          userId={userId}
          title={editingName ? '닉네임 변경' : undefined}
          showStats={!editingName}
          onNameChange={(name, uid) => {
            handleSaveName(name, uid);
            if (gameState === 'gameOver') {
              setGameState('menu');
            }
            setEditingName(false);
          }}
          onClose={() => {
            handleCancelModal();
            if (gameState === 'gameOver') {
              setGameState('menu');
            }
            setEditingName(false);
          }}
        />

        {/* 구매 이력 모달 */}
        {showPurchaseHistory && (
          <PurchaseHistory
            userId={userId}
            onClose={() => setShowPurchaseHistory(false)}
          />
        )}
      </div>
    </>
  );
};

export default Runner;
