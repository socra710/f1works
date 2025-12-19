import React from 'react';
import styles from '../RunnerExtras.module.css';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getRankLabel = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
};

const ScoreBoard = ({ highScores, isLoadingScores }) => {
  return (
    <aside className={styles['runner-scoreboard']}>
      <h3>🏆 명예의 전당</h3>
      {isLoadingScores ? (
        <p className={styles.loading}>순위 불러오는 중...</p>
      ) : highScores.length > 0 ? (
        <ol className={styles['score-list']}>
          {highScores.map((score, index) => (
            <li key={index} className={`rank-${index + 1}`}>
              <span className={styles.rank}>{getRankLabel(index + 1)}</span>
              <span className={styles.name}>{score.name}</span>
              <span className={styles.score}>{score.score}점</span>
              <span className={styles.coins}>💰{score.coins}</span>
              <span className={styles.date}>{formatDate(score.date)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.empty}>아직 기록이 없습니다</p>
      )}
    </aside>
  );
};

export default ScoreBoard;
