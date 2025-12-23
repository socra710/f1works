import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './SpecialItems.css';
import { useToast, useDialog } from '../../common/Toast';
import { waitForExtensionLogin } from '../../common/extensionLogin';

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
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [specialItemsList, setSpecialItemsList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    preset: 'LUNCH_SODAM',
    quantity: 1,
    amount: '',
    memo: '',
  });
  const authCheckRef = useRef(false);

  const renderSkeletonRows = (columnCount, rowCount = 6) => (
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

  // 상단 로딩바 표시
  useEffect(() => {
    const id = 'global-auth-topbar';
    if (!authChecked) {
      const container = document.createElement('div');
      container.id = id;
      Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '2147483647',
        background: '#fff',
      });
      container.innerHTML =
        '<div class="loading-bar" role="status" aria-label="인증 확인 중"><div class="loading-bar__indicator"></div></div>';
      document.body.appendChild(container);
      return () => {
        const el = document.getElementById(id);
        if (el) el.remove();
      };
    } else {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  }, [authChecked]);

  // 권한 확인 및 초기화
  useEffect(() => {
    if (authCheckRef.current) return;
    authCheckRef.current = true;

    (async () => {
      const sessionUser = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      if (!sessionUser) {
        showToast('로그인이 필요한 서비스입니다.', 'warning');
        navigate('/works');
        return;
      }
      checkManagerPermission(sessionUser);
      setAuthChecked(true);
    })();
    // eslint-disable-next-line
  }, [navigate, showToast]);

  // 관리자 권한 확인
  const checkManagerPermission = async (userIdEncoded) => {
    try {
      const factoryCode =
        window.sessionStorage.getItem('factoryCode') || '000001';

      // 저장된 월이 있으면 사용, 없으면 기본값(전월)으로 설정
      const savedMonth = localStorage.getItem('specialItems_selectedMonth');
      let defaultMonth = savedMonth;

      if (!defaultMonth) {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        defaultMonth = `${prev.getFullYear()}-${String(
          prev.getMonth() + 1
        ).padStart(2, '0')}`;
      }

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
      const response = await fetch(`${API_BASE_URL}/jvWorksGetSpecialItems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryCode, monthYm: month }),
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          showToast('해당 사용자는 접근할 수 없는 페이지입니다.', 'warning');
          navigate('/works');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const list =
        data && Array.isArray(data.list) ? data.list : data.data || [];
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
    // 검색 시 선택한 월을 localStorage에 저장
    localStorage.setItem('specialItems_selectedMonth', selectedMonth);
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

  // 항목 추가 (모달 열기)
  const handleAddItem = () => {
    setForm({ preset: 'LUNCH_SODAM', quantity: 1, amount: '', memo: '' });
    setShowModal(true);
  };

  // 항목 삭제
  const handleDeleteItem = (itemId, itemName) => {
    console.log('삭제 버튼 클릭:', itemId, itemName);
    showDialog({
      title: '삭제 확인',
      message: `'${itemName}' 항목을 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      type: 'confirm',
      onOk: async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/jvWorksSetSpecialItems`,
            {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ specialItemId: itemId }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data.success || data.success === true) {
            showToast('항목이 삭제되었습니다.', 'success');
            const factoryCode =
              window.sessionStorage.getItem('factoryCode') || '000001';
            fetchSpecialItemsList(factoryCode, selectedMonth);
          } else {
            showToast(data.message || '삭제에 실패했습니다.', 'error');
          }
        } catch (error) {
          console.error('삭제 오류:', error);
          showToast(
            `삭제 중 오류: ${error.message || '알 수 없는 오류'}`,
            'error'
          );
        }
      },
      onCancel: () => {
        console.log('삭제 취소');
      },
    });
  };

  // 인증 완료 전에는 흰 배경만 표시
  if (!authChecked) {
    return <div className="auth-wait-screen" />;
  }

  return (
    <div className="special-items-wrapper">
      <Helmet>
        <title>특별 항목 관리 - F1Soft Works</title>
      </Helmet>
      <div className="special-items-container">
        {isLoading && (
          <div className="loading-bar">
            <div className="loading-bar__indicator" />
          </div>
        )}
        <header className="management-header">
          <h1>특별 항목 관리</h1>
          <div className="header-buttons">
            <button className="btn-add" onClick={handleAddItem}>
              + 항목 추가
            </button>
            <button className="btn-search" onClick={handleSearch}>
              🔍 검색
            </button>
            <button
              className="btn-back"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/works/expense-summary');
                }
              }}
            >
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
          {isLoading ? (
            <>
              <div className="department-group">
                <div className="skeleton-title" />
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
                  <tbody>{renderSkeletonRows(6)}</tbody>
                </table>
              </div>
              <div className="total-summary skeleton-total">
                <div className="skeleton-cell" style={{ width: '220px' }} />
              </div>
            </>
          ) : specialItemsList.length === 0 ? (
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

        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>특별 항목 추가</h3>
              <div className="modal-field">
                <label>항목 선택</label>
                <select
                  value={form.preset}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, preset: e.target.value }))
                  }
                >
                  <option value="LUNCH_SODAM">점심(소담)</option>
                  <option value="DINNER_SODAM">저녁(소담)</option>
                  <option value="LUNCH_SEJONG">점심(세종)</option>
                  <option value="DINNER_SEJONG">저녁(세종)</option>
                </select>
              </div>
              <div className="modal-grid">
                <div className="modal-field">
                  <label>수량</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div className="modal-field">
                  <label>금액</label>
                  <input
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="modal-field">
                <label>비고 (선택)</label>
                <textarea
                  rows="2"
                  value={form.memo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, memo: e.target.value }))
                  }
                  placeholder="비고를 입력하세요"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const factoryCode =
                      window.sessionStorage.getItem('factoryCode') || '000001';
                    const userIdEncoded =
                      window.sessionStorage.getItem('extensionLogin') || '';
                    if (!form.amount) {
                      showToast('금액을 입력하세요.', 'warning');
                      return;
                    }

                    try {
                      const codeMap = {
                        LUNCH_SODAM: {
                          dept: '소담',
                          label: '점심(소담)',
                          code: 'LUNCH_SODAM',
                        },
                        DINNER_SODAM: {
                          dept: '소담',
                          label: '저녘(소담)',
                          code: 'DINNER_SODAM',
                        },
                        LUNCH_SEJONG: {
                          dept: '세종',
                          label: '점심(세종)',
                          code: 'LUNCH_SEJONG',
                        },
                        DINNER_SEJONG: {
                          dept: '세종',
                          label: '저녘(세종)',
                          code: 'DINNER_SEJONG',
                        },
                      };
                      const info = codeMap[form.preset] || {
                        dept: '',
                        label: form.preset,
                        code: form.preset,
                      };
                      const quantity = Number(form.quantity) || 1;
                      const amountNum = Number(form.amount);
                      const unitPrice = quantity
                        ? amountNum / quantity
                        : amountNum;

                      const payload = {
                        factoryCode,
                        monthYm: selectedMonth,
                        department: info.dept,
                        itemName: info.label,
                        itemCode: info.code,
                        amount: amountNum,
                        quantity,
                        unitPrice,
                        memo: form.memo,
                        createdBy: atob(userIdEncoded),
                      };

                      const response = await fetch(
                        `${API_BASE_URL}/jvWorksSetSpecialItems`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        }
                      );

                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                      }

                      const data = await response.json();
                      if (data.success) {
                        showToast('항목이 추가되었습니다.', 'success');
                        setShowModal(false);
                        fetchSpecialItemsList(factoryCode, selectedMonth);
                      } else {
                        showToast(
                          data.message || '등록에 실패했습니다.',
                          'error'
                        );
                      }
                    } catch (err) {
                      console.error('등록 오류:', err);
                      showToast('등록 중 오류가 발생했습니다.', 'error');
                    }
                  }}
                >
                  저장
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
