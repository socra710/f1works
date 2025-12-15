import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './ExpenseManagement.css';
import { ClipLoader } from 'react-spinners';
import { useToast } from '../../common/Toast';
import { getCorporateCards, saveCorporateCard } from './expenseAPI';

export default function ExpenseManagement() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const { showToast } = useToast();

  // const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [expenseList, setExpenseList] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, SUBMITTED, APPROVED, REJECTED
  const initializedRef = useRef(false);

  // 유류비 설정 모달
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelSettings, setFuelSettings] = useState({
    month: '',
    gasoline: 1663,
    diesel: 1536,
    lpg: 999,
    maintenanceRate: 1.2,
  });

  // 법인카드 설정 모달
  const [showCorporateCardModal, setShowCorporateCardModal] = useState(false);
  const [corporateCards, setCorporateCards] = useState([]);
  const [newCorporateCard, setNewCorporateCard] = useState({
    cardName: '',
    cardNumber: '',
    cardType: '신용카드',
    memo: '',
  });
  const [editingCardId, setEditingCardId] = useState(null);

  // 권한 확인 및 초기화
  useEffect(() => {
    // React Strict Mode에서 초기 useEffect가 두 번 실행되는 것을 방지
    if (initializedRef.current) return;
    initializedRef.current = true;
    // const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
    //   navigator.userAgent
    // );

    setTimeout(() => {
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }

      checkManagerPermission(sessionUser);
    }, 500);
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
      // setUserId(userIdEncoded);

      // 기본 월 설정 (이전 달 - 경비는 지난달 기준)
      // 이전 선택값이 있으면 복원, 없으면 기본 월(이전 달)
      const persistedMonth = sessionStorage.getItem('expenseMgmtMonth');
      let initialMonth = persistedMonth;
      if (!initialMonth) {
        const now = new Date();
        now.setMonth(now.getMonth() - 1); // 한 달 이전으로 설정
        initialMonth = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, '0')}`;
      }
      setSelectedMonth(initialMonth);
      sessionStorage.setItem('expenseMgmtMonth', initialMonth);

      // 목록 조회
      await fetchExpenseList(factoryCode, initialMonth, userIdEncoded);

      setIsLoading(false);
    } catch (error) {
      console.error('초기화 오류:', error);
      showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      setIsLoading(false);
    }
  };

  // 경비 청구 목록 조회
  const fetchExpenseList = async (factoryCode, month, userIdEncoded) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      formData.append('month', month);
      formData.append('userId', atob(userIdEncoded));

      const response = await fetch(`${API_BASE_URL}/jvWorksGetExpenseList`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          showToast('해당 사용자는 접근할 수 없는 페이지입니다.', 'warning');
          navigate('/works');
          return;
        }

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
      showToast('목록을 불러오는 중 오류가 발생했습니다.', 'error');
      setExpenseList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 월 변경 핸들러
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    try {
      sessionStorage.setItem('expenseMgmtMonth', newMonth);
    } catch (err) {
      console.warn('월 선택 저장 실패:', err);
    }
  };

  // 검색 버튼 핸들러
  const handleSearch = () => {
    const factoryCode =
      window.sessionStorage.getItem('factoryCode') || '000001';
    const userIdEncoded = window.sessionStorage.getItem('extensionLogin');
    if (userIdEncoded) {
      fetchExpenseList(factoryCode, selectedMonth, userIdEncoded);
    }
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

  // 유류비 설정 모달 열기
  const handleOpenFuelModal = () => {
    // 현재 선택된 월로 초기화
    setFuelSettings((prev) => ({
      ...prev,
      month: selectedMonth,
    }));
    // 해당 월의 설정 불러오기
    loadFuelSettings(selectedMonth);
    setShowFuelModal(true);
  };

  // 유류비 설정 불러오기
  const loadFuelSettings = async (month) => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      formData.append('month', month);

      const response = await fetch(`${API_BASE_URL}/jvWorksGetFuelSettings`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('유류비 설정 조회 응답:', data);
        if (data) {
          setFuelSettings({
            month: month,
            gasoline: data.gasoline || 0,
            diesel: data.diesel || 0,
            lpg: data.lpg || 0,
            maintenanceRate: data.maintenanceRate || 1.2,
          });
        }
      }
    } catch (error) {
      console.error('유류비 설정 불러오기 오류:', error);
    }
  };

  // 유류비 설정 저장
  const handleSaveFuelSettings = async () => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      formData.append('month', fuelSettings.month);
      formData.append('gasoline', fuelSettings.gasoline);
      formData.append('diesel', fuelSettings.diesel);
      formData.append('lpg', fuelSettings.lpg);
      formData.append('maintenanceRate', fuelSettings.maintenanceRate);

      const response = await fetch(`${API_BASE_URL}/jvWorksSetFuelSettings`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          showToast('유류비 설정이 저장되었습니다.', 'success');
          setShowFuelModal(false);
        } else {
          showToast(
            '저장 실패: ' + (data.message || '알 수 없는 오류'),
            'error'
          );
        }
      } else {
        const errorText = await response.text();
        console.error('HTTP 오류:', response.status, errorText);
        showToast('저장 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('유류비 설정 저장 오류:', error);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  // 법인카드 설정 모달 열기
  const handleOpenCorporateCardModal = () => {
    setEditingCardId(null);
    setNewCorporateCard({
      cardName: '',
      cardNumber: '',
      cardType: '신용카드',
      memo: '',
    });
    loadCorporateCards();
    setShowCorporateCardModal(true);
  };

  // 법인카드 목록 불러오기
  const loadCorporateCards = async () => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const cards = await getCorporateCards(factoryCode);
      setCorporateCards(Array.isArray(cards) ? cards : []);
    } catch (error) {
      console.error('법인카드 목록 불러오기 오류:', error);
      showToast('법인카드 목록을 불러올 수 없습니다.', 'error');
    }
  };

  // 법인카드 저장
  const handleSaveCorporateCard = async () => {
    if (!newCorporateCard.cardName.trim()) {
      showToast('카드명을 입력해주세요.', 'warning');
      return;
    }
    if (!newCorporateCard.cardNumber.trim()) {
      showToast('카드번호를 입력해주세요.', 'warning');
      return;
    }

    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';
      const cardData = {
        factoryCode,
        cardName: newCorporateCard.cardName,
        cardNumber: newCorporateCard.cardNumber,
        cardType: newCorporateCard.cardType,
        memo: newCorporateCard.memo,
      };

      if (editingCardId) {
        cardData.cardId = editingCardId;
      }

      const result = await saveCorporateCard(cardData);

      if (result.success) {
        showToast('카드가 저장되었습니다.', 'success');
        setEditingCardId(null);
        setNewCorporateCard({
          cardName: '',
          cardNumber: '',
          cardType: '신용카드',
          memo: '',
        });
        await loadCorporateCards();
      } else {
        showToast(
          '저장 실패: ' + (result.message || '알 수 없는 오류'),
          'error'
        );
      }
    } catch (error) {
      console.error('법인카드 저장 오류:', error);
      showToast('카드 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  // 법인카드 편집 시작
  const handleEditCorporateCard = (card) => {
    setEditingCardId(card.cardId);
    setNewCorporateCard({
      cardName: card.cardName,
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      memo: card.memo || '',
    });
  };

  // 법인카드 편집 취소
  const handleCancelEditCorporateCard = () => {
    setEditingCardId(null);
    setNewCorporateCard({
      cardName: '',
      cardNumber: '',
      cardType: '신용카드',
      memo: '',
    });
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
          <title>경비 청구 관리</title>
        </Helmet>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
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
          <div className="header-buttons">
            <button
              className="btn-primary"
              onClick={() => {
                const month = selectedMonth || '';
                const qs = month
                  ? `?mode=manager&month=${encodeURIComponent(month)}`
                  : `?mode=manager`;
                navigate(`/works/expense${qs}`);
              }}
            >
              경비 대리 신청
            </button>
            <button className="btn-fuel-settings" onClick={handleOpenFuelModal}>
              유류비 설정
            </button>
            <button
              className="btn-fuel-settings"
              onClick={handleOpenCorporateCardModal}
            >
              법인카드 설정
            </button>
            <button className="btn-search" onClick={handleSearch}>
              🔍 검색
            </button>
            <button className="btn-back" onClick={() => navigate('/works')}>
              뒤로가기
            </button>
          </div>
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
              <option value="COMPLETED">승인</option>
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

        {/* 유류비 설정 모달 */}
        {showFuelModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowFuelModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>유류비 설정</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowFuelModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>기준년월:</label>
                  <input
                    type="month"
                    value={fuelSettings.month}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setFuelSettings({
                        ...fuelSettings,
                        month: newMonth,
                      });
                      loadFuelSettings(newMonth);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>휘발유 (원/L):</label>
                  <input
                    type="number"
                    step="1"
                    value={fuelSettings.gasoline}
                    onChange={(e) =>
                      setFuelSettings({
                        ...fuelSettings,
                        gasoline: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>경유 (원/L):</label>
                  <input
                    type="number"
                    step="1"
                    value={fuelSettings.diesel}
                    onChange={(e) =>
                      setFuelSettings({
                        ...fuelSettings,
                        diesel: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>LPG (원/L):</label>
                  <input
                    type="number"
                    step="1"
                    value={fuelSettings.lpg}
                    onChange={(e) =>
                      setFuelSettings({
                        ...fuelSettings,
                        lpg: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>유지관리비율:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelSettings.maintenanceRate}
                    onChange={(e) =>
                      setFuelSettings({
                        ...fuelSettings,
                        maintenanceRate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-save" onClick={handleSaveFuelSettings}>
                  저장
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setShowFuelModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 법인카드 설정 모달 */}
        {showCorporateCardModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowCorporateCardModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>법인카드 설정</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowCorporateCardModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {/* 카드 추가/편집 폼 */}
                <div className="card-form-section">
                  <h3>{editingCardId ? '카드 수정' : '새 카드 추가'}</h3>
                  <div className="form-group">
                    <label>카드명:</label>
                    <input
                      type="text"
                      placeholder="예: 주용준이 카드"
                      value={newCorporateCard.cardName}
                      onChange={(e) =>
                        setNewCorporateCard({
                          ...newCorporateCard,
                          cardName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>카드번호:</label>
                    <input
                      type="text"
                      placeholder="예: 1234-5678-9012-3456"
                      value={newCorporateCard.cardNumber}
                      onChange={(e) =>
                        setNewCorporateCard({
                          ...newCorporateCard,
                          cardNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>카드종류:</label>
                    <select
                      value={newCorporateCard.cardType}
                      onChange={(e) =>
                        setNewCorporateCard({
                          ...newCorporateCard,
                          cardType: e.target.value,
                        })
                      }
                    >
                      <option>신용카드</option>
                      <option>체크카드</option>
                      <option>프리페이드</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>비고:</label>
                    <input
                      type="text"
                      placeholder="특이사항이 있으면 입력"
                      value={newCorporateCard.memo}
                      onChange={(e) =>
                        setNewCorporateCard({
                          ...newCorporateCard,
                          memo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-save"
                      onClick={handleSaveCorporateCard}
                    >
                      {editingCardId ? '수정' : '추가'}
                    </button>
                    {editingCardId && (
                      <button
                        className="btn-cancel"
                        onClick={handleCancelEditCorporateCard}
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>

                {/* 카드 목록 */}
                <div className="card-list-section">
                  <h3>등록된 카드</h3>
                  {corporateCards.length === 0 ? (
                    <div className="empty-list">등록된 카드가 없습니다.</div>
                  ) : (
                    <div className="card-list">
                      {corporateCards.map((card) => (
                        <div key={card.cardId} className="card-item">
                          <div className="card-info">
                            <div className="card-name">{card.cardName}</div>
                            <div className="card-number">{card.cardNumber}</div>
                            <div className="card-type">{card.cardType}</div>
                            {card.memo && (
                              <div className="card-memo">{card.memo}</div>
                            )}
                          </div>
                          <div className="card-actions">
                            <button
                              className="btn-edit"
                              onClick={() => handleEditCorporateCard(card)}
                            >
                              수정
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-close"
                  onClick={() => setShowCorporateCardModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
