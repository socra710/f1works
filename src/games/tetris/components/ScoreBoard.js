import React from 'react';
import { formatDate } from '../utils/storageUtils';

const ScoreBoard = ({ highScores, isLoadingScores }) => {
  const getRankLabel = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    return '';
  };

  return (
    <aside className="tetris-sidebar">
      <div className="sidebar-panel leaderboard">
        <div className="panel-title">순위</div>
        {isLoadingScores ? (
          <div className="skeleton-loader">
            {[...Array(7)].map((_, idx) => (
              <div key={idx} className="skeleton-score-row">
                <span className="skeleton-rank"></span>
                <span className="skeleton-name"></span>
                <span className="skeleton-pts"></span>
                <span className="skeleton-dt"></span>
              </div>
            ))}
          </div>
        ) : highScores.length === 0 ? (
          <div className="panel-empty">아직 기록이 없어요.</div>
        ) : (
          <ol className="scores-list">
            {highScores.map((s, idx) => (
              <li
                key={`${s.score}-${s.date}-${idx}`}
                className={`score-row ${getRankClass(idx + 1)}`.trim()}
              >
                <span className="rank">{getRankLabel(idx + 1)}</span>
                <span className="name" style={{ textAlign: 'left' }}>
                  {s.name}
                </span>
                <span className="pts">{s.score}</span>
                <span className="dt">{formatDate(s.date)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="sidebar-panel game-description">
        <div className="panel-title">게임 설명</div>
        <div className="panel-body">
          <p>
            시간은 5분으로 제한되며, 1분마다 블록 하강 속도가 빨라집니다. 또한,
            시간이 지남에 따라 맨 아래에 회색 블록이 추가되어 게임 난이도가
            상승합니다.
          </p>
          <p className="controls-inline">
            ←→ 이동 · ↑/Z 회전 · ↓ 빠르게 내리기 · SPACE 즉시 하강
          </p>
        </div>
      </div>
    </aside>
  );
};

export default ScoreBoard;
