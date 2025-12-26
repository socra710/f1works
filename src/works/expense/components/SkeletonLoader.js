import React from 'react';

/**
 * 스켈레톤 로딩 컴포넌트
 * @param {number} columnCount - 컬럼 개수
 * @param {number} rowCount - 행 개수 (기본값: 6)
 */
export default function SkeletonLoader({ columnCount, rowCount = 6 }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <tr key={`skeleton-${columnCount}-${rowIdx}`} className="skeleton-row">
          {Array.from({ length: columnCount }).map((__, cellIdx) => (
            <td
              key={`skeleton-cell-${columnCount}-${rowIdx}-${cellIdx}`}
              style={{ padding: '12px 8px' }}
            >
              <div
                className="skeleton-cell"
                style={{
                  height: '20px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  animation: 'skeletonShimmer 1.5s infinite',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
