import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './ExpenseManagement.css';
import { ClipLoader } from 'react-spinners';

export default function ExpenseManagement() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [expenseList, setExpenseList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, SUBMITTED, APPROVED, REJECTED
  const initializedRef = useRef(false);

  // 권한 확인 및 초기화
  useEffect(() => {
    // React Strict Mode에서 초기 useEffect가 두 번 실행되는 것을 방지
    if (initializedRef.current) return;
    initializedRef.current = true;
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
      navigator.userAgent
    );
    setTimeout(() => {
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (!sessionUser) {
        alert('로그인이 필요한 서비스입니다.');
        navigate('/works');
        return;
      }
      checkManagerPermission(sessionUser);
    }, 1000);
    // eslint-disable-next-line
  }, [navigate]);

  // 관리자 권한 확인
  const checkManagerPermission = async (userIdEncoded) => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';

      // TODO: 실제 권한 확인 API 호출 (임시로 통과)
      // const response = await fetch(...)
      // if (!response.data.isManager) { alert('권한이 없습니다.'); return; }

      // 기본 월 설정 (이전 달 - 경비는 지난달 기준)
      const now = new Date();
      now.setMonth(now.getMonth() - 1); // 한 달 이전으로 설정
      const defaultMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      setSelectedMonth(defaultMonth);

      // 목록 조회
      await fetchExpenseList(factoryCode, defaultMonth);

      setIsLoading(false);
    } catch (error) {
      console.error('초기화 오류:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  // 경비 청구 목록 조회
  const fetchExpenseList = async (factoryCode, month) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      formData.append('month', month);

      const response = await fetch(`${API_BASE_URL}/jvWorksGetExpenseList`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error('목록 조회 실패:', response.status, response.statusText);
        const errText = await response.text();
        console.error('오류 응답 본문:', errText);
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          const rawText = await response.text();
          console.warn('JSON 파싱 실패, 원시 텍스트:', rawText);
          data = null;
        }
      } else {
        const rawText = await response.text();
        console.warn('JSON 아님, 원시 텍스트 응답:', rawText);
        data = null;
      }

      const list = data && Array.isArray(data.list) ? data.list : [];
      setExpenseList(list);
    } catch (error) {
      console.error('목록 조회 오류:', error);
      alert('목록을 불러오는 중 오류가 발생했습니다.');
      setExpenseList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 월 변경 핸들러
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    const factoryCode =
      window.sessionStorage.getItem('factoryCode') || '000001';
    fetchExpenseList(factoryCode, newMonth);
  };

  // 상태별 필터링
  const filteredList = expenseList.filter((item) => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  // 상세 보기
  const handleViewDetail = (expenseId) => {
    navigate(`/works/expense/${expenseId}?mode=manager`);
  };

  // 상태 배지 색상
  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: { text: '임시저장', className: 'badge-draft' },
      SUBMITTED: { text: '제출', className: 'badge-submitted' },
      COMPLETED: { text: '승인', className: 'badge-approved' },
      REJECTED: { text: '반려', className: 'badge-rejected' },
    };
    const badge = badges[status] || {
      text: status,
      className: 'badge-default',
    };
    return (
      <span className={`status-badge ${badge.className}`}>{badge.text}</span>
    );
  };

  // 금액 포맷
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount || 0);
  };

  // 날짜 포맷 (yyyy-MM-dd HH:mm:ss)
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    // 이미 "yyyy-MM-dd HH:mm:ss" 형식이면 그대로 반환
    if (dateTimeStr.length === 19 && dateTimeStr.includes(' ')) {
      return dateTimeStr;
    }
    // 다른 형식이면 변환 시도
    try {
      const date = new Date(dateTimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return dateTimeStr;
    }
  };

  if (isLoading) {
    return (
      <div className="expense-management-wrapper">
        <Helmet>
          <title>경비 청구 관리 - F1Soft Works</title>
        </Helmet>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <ClipLoader color="#f88c6b" loading={isLoading} size={120} />
        </div>
      </div>
    );
  }

  return (
    <div className="expense-management-wrapper">
      <Helmet>
        <title>경비 청구 관리 - F1Soft Works</title>
      </Helmet>
      <div className="expense-management-container">
        <header className="management-header">
          <h1>경비 청구 관리</h1>
          <button className="btn-back" onClick={() => navigate('/works')}>
            뒤로가기
          </button>
        </header>

        <div className="filter-section">
          <div className="month-selector">
            <label>조회 월:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              max={`${new Date().getFullYear()}-${String(
                new Date().getMonth() + 1
              ).padStart(2, '0')}`}
            />
          </div>

          <div className="status-filter">
            <label>상태:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">전체</option>
              <option value="SUBMITTED">제출</option>
              <option value="APPROVED">승인</option>
              <option value="REJECTED">반려</option>
            </select>
          </div>

          <div className="summary-info">
            <span>총 {filteredList.length}건</span>
          </div>
        </div>

        <div className="expense-list-table">
          {filteredList.length === 0 ? (
            <div className="empty-state">
              <p>조회된 경비 청구 내역이 없습니다.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '200px' }}>제출일</th>
                  <th>사원명</th>
                  <th>사원번호</th>
                  {/* <th>총 청구액</th> */}
                  <th>총 지급액</th>
                  <th>상태</th>
                  <th>관리팀 확인</th>
                  <th style={{ width: '300px' }}>비고</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDateTime(item.submitDate)}</td>
                    <td>{item.userName}</td>
                    <td>{item.userId}</td>
                    {/* <td className="amount">
                          {formatAmount(item.totalAmount)}원
                        </td> */}
                    <td className="amount">{formatAmount(item.totalPay)}원</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      {item.managerChecked ? (
                        <span className="check-icon">✓</span>
                      ) : (
                        <span className="uncheck-icon">-</span>
                      )}
                    </td>
                    <td className="memo-cell">{item.memo || '-'}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => handleViewDetail(item.expenseId)}
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
