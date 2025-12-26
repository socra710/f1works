import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 헤더 액션 버튼들 컴포넌트
 * @param {boolean} isSharedLink - 공유 링크 여부
 * @param {string} year - 현재 연도
 * @param {Function} onCreateLink - 링크 생성 핸들러
 */
export default function HeaderActions({ isSharedLink, year, onCreateLink }) {
  const navigate = useNavigate();

  return (
    <div className="header-right">
      {!isSharedLink && (
        <>
          <button
            className="btn-fuel-settings"
            onClick={() => navigate('/works/special-items')}
          >
            특별 항목 관리
          </button>
        </>
      )}
      <button
        className="btn-back"
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/works');
          }
        }}
      >
        뒤로가기
      </button>
    </div>
  );
}
