import React from 'react';
import styles from '../Hardware.module.css';

const STATUS_MAP = {
  전: { text: '대기', class: 'statusWaiting' },
  대기: { text: '대기', class: 'statusWaiting' },
  진행중: { text: '진행중', class: 'statusProgress' },
  진행: { text: '진행중', class: 'statusProgress' },
  완: { text: '완료', class: 'statusComplete' },
  완료: { text: '완료', class: 'statusComplete' },
};

const CATEGORY_MAP = {
  신규납품: 'categoryNew',
  고장회수: 'categoryRepair',
};

export const StatusBadge = ({ status }) => {
  const key = (status || '').trim();
  const statusInfo = STATUS_MAP[key] || {
    text: status || '-',
    class: 'statusDefault',
  };
  return (
    <span className={`${styles.statusBadge} ${styles[statusInfo.class]}`}>
      {statusInfo.text}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  const key = (category || '').trim();
  return (
    <span
      className={`${styles.categoryBadge} ${
        styles[CATEGORY_MAP[key]] || styles.categoryDefault || ''
      }`}
    >
      {key || '-'}
    </span>
  );
};
