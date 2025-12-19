# Tetris Game - 코드 구조

이 디렉토리에는 리팩토링된 테트리스 게임 코드가 포함되어 있습니다.
Runner 게임과 유사한 구조로 코드를 분리하여 유지보수성과 가독성을 높였습니다.

## 📁 폴더 구조

```
tetris/
├── components/          # UI 컴포넌트
│   ├── TetrisBoard.js          # 메인 게임 보드 (캔버스)
│   ├── NextPiecePreview.js     # 다음 블록 미리보기
│   ├── ScoreBoard.js           # 순위판 및 게임 설명
│   └── GameModal.js            # 점수 저장 모달
│
├── hooks/              # 커스텀 React 훅
│   ├── useTetrisGame.js        # 메인 게임 로직 훅
│   └── useScoreManagement.js   # 점수 관리 및 API 훅
│
├── utils/              # 유틸리티 함수
│   ├── constants.js            # 게임 상수 (크기, 속도 등)
│   ├── tetrisPieces.js         # 테트리스 블록 정의 (SRS 회전 시스템)
│   ├── gameLogic.js            # 게임 로직 (이동, 회전, 라인 제거)
│   ├── storageUtils.js         # LocalStorage 관리
│   ├── audioUtils.js           # 사운드 이펙트
│   └── effectsUtils.js         # 시각 효과 (파티클, 화면 흔들림 등)
│
├── Tetris.js           # 메인 컴포넌트
├── Tetris.css          # 스타일시트
└── Tetris_old.js       # 백업 파일 (리팩토링 전)
```

## 🎯 주요 기능

### Components

- **TetrisBoard**: 게임 보드를 캔버스에 렌더링
- **NextPiecePreview**: 다음에 나올 블록을 미리 표시
- **ScoreBoard**: 상위 8개 점수와 게임 설명 표시
- **GameModal**: 게임 종료 시 닉네임 입력 및 점수 저장

### Hooks

- **useTetrisGame**:

  - 게임 상태 관리 (시작, 종료, 일시정지)
  - 블록 이동 및 회전
  - 타이머 및 레벨 시스템
  - 키보드 입력 처리

- **useScoreManagement**:
  - 서버에서 순위 데이터 로드
  - 점수 저장 API 호출
  - 일일 저장 횟수 제한 관리

### Utils

- **constants.js**: 모든 게임 상수를 한 곳에서 관리
- **tetrisPieces.js**: 7가지 테트리스 블록과 SRS 회전 상태
- **gameLogic.js**: 핵심 게임 로직 (충돌 감지, 회전, 라인 제거)
- **storageUtils.js**: localStorage를 사용한 데이터 저장/로드
- **audioUtils.js**: 경고음 등 오디오 재생
- **effectsUtils.js**: 화면 흔들림, 피 효과 등 시각 효과

## 🔧 주요 개선 사항

1. **모듈화**: 1369줄의 단일 파일을 논리적 단위로 분리
2. **재사용성**: 유틸리티 함수들을 독립적으로 사용 가능
3. **테스트 용이성**: 각 함수를 개별적으로 테스트 가능
4. **유지보수성**: 기능별로 파일이 분리되어 수정 및 확장 용이
5. **일관성**: Runner 게임과 유사한 구조로 프로젝트 전체의 일관성 향상

## 🎮 게임 규칙

- **제한 시간**: 5분 (300초)
- **레벨 시스템**: 1분마다 레벨 상승, 블록 하강 속도 증가
- **회색 블록**: 시간이 지남에 따라 맨 아래 줄에 장애물 추가
- **점수**: 라인 제거 시 100점/라인
- **일일 저장 제한**: 하루 3회까지 서버에 점수 저장 가능

## 🚀 사용 방법

```jsx
import Tetris from './games/tetris/Tetris';

function App() {
  return <Tetris />;
}
```

## 📝 향후 개선 사항

- [ ] 테스트 코드 추가
- [ ] TypeScript 마이그레이션
- [ ] 추가 블록 효과 및 파워업
- [ ] 멀티플레이 모드
- [ ] 난이도 설정 옵션
