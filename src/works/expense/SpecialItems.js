import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './SpecialItems.css';
import { ClipLoader } from 'react-spinners';
import { useToast, useDialog } from '../../common/Toast';

/**
 * 특별 항목 관리 페이지
 * 점심(소담), 저녁(소담), 점심(세종), 저녁(세종) 등
 * 관리팀에서 직접 입력하는 항목들을 관리
 */
export default function SpecialItems() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { showDialog } = useDialog();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [specialItemsList, setSpecialItemsList] = useState([]);
  const initializedRef = useRef(false);

  // 권한 확인 및 초기화
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setTimeout(() => {
      const sessionUser = window.sessionStorage.getItem('extensionLogin');
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
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

      // 기본 월 설정 (현재 달)
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      setSelectedMonth(defaultMonth);

      // 목록 조회
      await fetchSpecialItemsList(factoryCode, defaultMonth);

      setIsLoading(false);
    } catch (error) {
      console.error('초기화 오류:', error);
      showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      setIsLoading(false);
    }
  };

  // 특별 항목 목록 조회
  const fetchSpecialItemsList = async (factoryCode, month) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('factoryCode', factoryCode);
      formData.append('monthYm', month);

      const response = await fetch(`${API_BASE_URL}/jvWorksGetSpecialItems`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          showToast('해당 사용자는 접근할 수 없는 페이지입니다.', 'warning');
          navigate('/works');
          return;
        }
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
      setSpecialItemsList(list);
    } catch (error) {
      console.error('목록 조회 오류:', error);
      showToast('목록을 불러오는 중 오류가 발생했습니다.', 'error');
      setSpecialItemsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 월 변경 핸들러
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
  };

  // 검색 버튼 핸들러
  const handleSearch = () => {
    const factoryCode =
      window.sessionStorage.getItem('factoryCode') || '000001';
    fetchSpecialItemsList(factoryCode, selectedMonth);
  };

  // 금액 포맷
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount || 0);
  };

  // 부서별 그룹화
  const getGroupedByDepartment = () => {
    const grouped = {};
    specialItemsList.forEach((item) => {
      if (!grouped[item.department]) {
        grouped[item.department] = [];
      }
      grouped[item.department].push(item);
    });
    return grouped;
  };

  // 총 합계
  const getTotalAmount = () => {
    return specialItemsList.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // 항목 추가
  const handleAddItem = () => {
    navigate(`/works/special-items/edit?month=${selectedMonth}`);
  };

  // 항목 상세보기
  const handleViewDetail = (specialItemId) => {
    navigate(
      `/works/special-items/edit/${specialItemId}?month=${selectedMonth}`
    );
  };

  // 항목 삭제
  const handleDeleteItem = (itemId, itemName) => {
    showDialog({
      title: '삭제 확인',
      message: `'${itemName}' 항목을 삭제하시겠습니까?`,
      buttons: [
        {
          text: '삭제',
          onClick: async () => {
            try {
              const formData = new FormData();
              formData.append('specialItemId', itemId);

              const response = await fetch(
                `${API_BASE_URL}/jvWorksDeleteSpecialItem`,
                {
                  method: 'POST',
                  body: formData,
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  showToast('항목이 삭제되었습니다.', 'success');
                  const factoryCode =
                    window.sessionStorage.getItem('factoryCode') || '000001';
                  fetchSpecialItemsList(factoryCode, selectedMonth);
                } else {
                  showToast(data.message || '삭제에 실패했습니다.', 'error');
                }
              }
            } catch (error) {
              console.error('삭제 오류:', error);
              showToast('삭제 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  if (isLoading) {
    return (
      <div className="special-items-wrapper">
        <Helmet>
          <title>특별 항목 관리 - F1Soft Works</title>
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
    <div className="special-items-wrapper">
      <Helmet>
        <title>특별 항목 관리 - F1Soft Works</title>
      </Helmet>
      <div className="special-items-container">
        <header className="management-header">
          <h1>특별 항목 관리</h1>
          <div className="header-buttons">
            <button className="btn-add" onClick={handleAddItem}>
              + 항목 추가
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
            <label>대상 월:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              max={`${new Date().getFullYear()}-${String(
                new Date().getMonth() + 1
              ).padStart(2, '0')}`}
            />
          </div>

          <div className="summary-info">
            <span>총 {specialItemsList.length}건</span>
          </div>
        </div>

        <div className="special-items-list">
          {specialItemsList.length === 0 ? (
            <div className="empty-state">
              <p>등록된 특별 항목이 없습니다.</p>
            </div>
          ) : (
            <>
              {Object.entries(getGroupedByDepartment()).map(
                ([department, deptItems]) => (
                  <div key={department} className="department-group">
                    <h3>{department}</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>항목명</th>
                          <th>수량</th>
                          <th>단가</th>
                          <th>총액</th>
                          <th>비고</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptItems.map((item) => (
                          <tr key={item.specialItemId}>
                            <td>{item.itemName}</td>
                            <td>{item.quantity}</td>
                            <td className="amount">
                              {formatAmount(item.unitPrice || 0)}원
                            </td>
                            <td className="amount">
                              {formatAmount(item.amount || 0)}원
                            </td>
                            <td>{item.memo || '-'}</td>
                            <td className="actions">
                              <button
                                className="btn-edit"
                                onClick={() =>
                                  handleViewDetail(item.specialItemId)
                                }
                              >
                                수정
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() =>
                                  handleDeleteItem(
                                    item.specialItemId,
                                    item.itemName
                                  )
                                }
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="department-subtotal">
                          <td colSpan="3">소계</td>
                          <td className="amount">
                            {formatAmount(
                              deptItems.reduce(
                                (sum, item) => sum + (item.amount || 0),
                                0
                              )
                            )}
                            원
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )
              )}

              <div className="total-summary">
                <h3>
                  총합계:{' '}
                  <span className="total-amount">
                    {formatAmount(getTotalAmount())}원
                  </span>
                </h3>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
