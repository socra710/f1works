import React from 'react';

/**
 * 빈 상태 표시 컴포넌트
 * @param {string} year - 연도
 */
export default function EmptyState({ year }) {
  return (
    <div className="empty-state">
      <p>{year}년 경비 청구 데이터가 없습니다.</p>
    </div>
  );
}
