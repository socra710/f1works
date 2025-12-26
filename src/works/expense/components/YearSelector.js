import React from 'react';

/**
 * 연도 선택 드롭다운 컴포넌트
 * @param {string} year - 현재 선택된 연도
 * @param {Function} onYearChange - 연도 변경 핸들러
 * @param {boolean} disabled - 비활성화 여부
 */
export default function YearSelector({ year, onYearChange, disabled = false }) {
  // 사용 가능한 연도 목록 생성 (2020 ~ 현재년도)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y.toString());
    }
    return years;
  };

  return (
    <div className="year-selector">
      <select
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        disabled={disabled}
      >
        {getYearOptions().map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
    </div>
  );
}
