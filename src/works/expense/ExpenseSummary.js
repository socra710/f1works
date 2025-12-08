import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ExpenseSummary.css';
import { ClipLoader } from 'react-spinners';
import { useToast, useDialog } from '../../common/Toast';

/**
 * 경비 청구 집계 페이지
 * 월별로 마감된 경비 데이터만 표시
 * 관리자만 접근 가능
 */
export default function ExpenseSummary() {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { showDialog } = useDialog();

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
  });
  const [closingData, setClosingData] = useState([]);
  const [specialItems, setSpecialItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManagerMode, setIsManagerMode] = useState(
    searchParams.get('mode') === 'manager'
  );
  const [factoryCode] = useState('F001'); // 예시, 실제로는 로그인 정보에서 가져옴
  const [currentUser] = useState('ADMIN'); // 예시, 실제로는 로그인 정보에서 가져옴

  // 마감 데이터 및 특별항목 조회
  useEffect(() => {
    loadSummaryData();
  }, [month]);

  const loadSummaryData = async () => {
    setIsLoading(true);
    try {
      // 마감 데이터 조회
      const closingResponse = await fetch(
        `${API_BASE_URL}/api/expense-closing?factoryCode=${factoryCode}&monthYm=${month}`
      );
      const closingDataJson = await closingResponse.json();

      if (closingDataJson.success) {
        setClosingData(closingDataJson.data || []);
      } else {
        showToast(
          closingDataJson.message || '마감 데이터 조회에 실패했습니다.',
          'error'
        );
      }

      // 특별항목 조회
      const specialItemsResponse = await fetch(
        `${API_BASE_URL}/api/special-items?factoryCode=${factoryCode}&monthYm=${month}`
      );
      const specialItemsJson = await specialItemsResponse.json();

      if (specialItemsJson.success) {
        setSpecialItems(specialItemsJson.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('데이터 조회 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 마감 처리
  const handleCloseExpense = async (closingId) => {
    showDialog({
      title: '마감 처리 확인',
      message: '선택한 경비를 마감 처리하시겠습니까?',
      buttons: [
        {
          text: '마감',
          onClick: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/expense-closing`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    closingId,
                    closedBy: currentUser,
                  }),
                }
              );

              const data = await response.json();

              if (data.success) {
                showToast(data.message, 'success');
                loadSummaryData();
              } else {
                showToast(data.message || '마감에 실패했습니다.', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showToast('마감 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  // 마감 재개
  const handleReopenClosing = async (closingId) => {
    showDialog({
      title: '마감 재개 확인',
      message: '선택한 경비의 마감을 재개하시겠습니까?',
      buttons: [
        {
          text: '재개',
          onClick: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/expense-closing`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    closingId,
                    reopenedBy: currentUser,
                  }),
                }
              );

              const data = await response.json();

              if (data.success) {
                showToast(data.message, 'success');
                loadSummaryData();
              } else {
                showToast(data.message || '재개에 실패했습니다.', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showToast('재개 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  // 부서별 합계 계산
  const getDepartmentSummary = () => {
    const summary = {};
    closingData.forEach((item) => {
      if (!summary[item.department]) {
        summary[item.department] = {
          totalExpense: 0,
          fuelExpense: 0,
          specialItemExpense: 0,
          totalAmount: 0,
          count: 0,
        };
      }
      summary[item.department].totalExpense += item.totalExpense;
      summary[item.department].fuelExpense += item.fuelExpense;
      summary[item.department].specialItemExpense += item.specialItemExpense;
      summary[item.department].totalAmount += item.totalAmount;
      summary[item.department].count += 1;
    });
    return summary;
  };

  // 전체 합계
  const getGrandTotal = () => {
    return {
      totalExpense: closingData.reduce(
        (sum, item) => sum + item.totalExpense,
        0
      ),
      fuelExpense: closingData.reduce((sum, item) => sum + item.fuelExpense, 0),
      specialItemExpense: closingData.reduce(
        (sum, item) => sum + item.specialItemExpense,
        0
      ),
      totalAmount: closingData.reduce((sum, item) => sum + item.totalAmount, 0),
    };
  };

  // 특별항목 부서별 합계
  const getSpecialItemsByDepartment = () => {
    const grouped = {};
    specialItems.forEach((item) => {
      if (!grouped[item.department]) {
        grouped[item.department] = 0;
      }
      grouped[item.department] += item.amount;
    });
    return grouped;
  };

  if (!isManagerMode) {
    return (
      <div className="summary-error">
        <h2>접근 권한이 없습니다</h2>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
        <button onClick={() => navigate('/works')}>돌아가기</button>
      </div>
    );
  }

  const deptSummary = getDepartmentSummary();
  const grandTotal = getGrandTotal();
  const specialItemsDept = getSpecialItemsByDepartment();

  return (
    <>
      <Helmet>
        <title>경비 청구 집계</title>
      </Helmet>

      <div className="summary-container">
        <h1>경비 청구 집계</h1>

        <div className="summary-controls">
          <div className="month-selector">
            <label>조회 월:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <button
            className="btn-special-items"
            onClick={() => navigate('/works/special-items?mode=manager')}
          >
            특별 항목 관리
          </button>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <ClipLoader size={50} color="#4CAF50" />
          </div>
        ) : (
          <>
            {/* 특별항목 요약 */}
            {Object.keys(specialItemsDept).length > 0 && (
              <div className="special-items-summary">
                <h2>특별 항목 현황</h2>
                <div className="special-items-cards">
                  {Object.entries(specialItemsDept).map(([dept, amount]) => (
                    <div key={dept} className="special-item-card">
                      <div className="dept-name">{dept}</div>
                      <div className="amount">{amount.toLocaleString()}원</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 마감 데이터 */}
            {closingData.length === 0 ? (
              <div className="no-data">
                <p>{month}월에 마감된 경비가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 사용자별 상세 내역 */}
                <div className="closing-details">
                  <h2>사용자별 청구 내역</h2>
                  <table className="closing-table">
                    <thead>
                      <tr>
                        <th>사용자명</th>
                        <th>부서</th>
                        <th>일반경비</th>
                        <th>유류비</th>
                        <th>특별항목</th>
                        <th>합계</th>
                        <th>마감일시</th>
                        <th>상태</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closingData.map((item) => (
                        <tr
                          key={item.closingId}
                          className={`status-${item.closingStatus}`}
                        >
                          <td className="user-name">{item.userName}</td>
                          <td>{item.department}</td>
                          <td className="amount">
                            {item.totalExpense.toLocaleString()}
                          </td>
                          <td className="amount">
                            {item.fuelExpense.toLocaleString()}
                          </td>
                          <td className="amount">
                            {item.specialItemExpense.toLocaleString()}
                          </td>
                          <td className="amount total">
                            {item.totalAmount.toLocaleString()}
                          </td>
                          <td className="date">{item.closedAt}</td>
                          <td className={`status ${item.closingStatus}`}>
                            {item.closingStatus === 'CLOSED'
                              ? '마감'
                              : '재개됨'}
                          </td>
                          <td className="actions">
                            {item.closingStatus === 'CLOSED' ? (
                              <button
                                className="btn-reopen"
                                onClick={() =>
                                  handleReopenClosing(item.closingId)
                                }
                              >
                                재개
                              </button>
                            ) : (
                              <span className="reopened-badge">재개됨</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 부서별 집계 */}
                <div className="department-summary">
                  <h2>부서별 집계</h2>
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>부서</th>
                        <th>인원</th>
                        <th>일반경비</th>
                        <th>유류비</th>
                        <th>특별항목</th>
                        <th>합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(deptSummary).map(([dept, data]) => (
                        <tr key={dept}>
                          <td className="dept-name">{dept}</td>
                          <td className="count">{data.count}명</td>
                          <td className="amount">
                            {data.totalExpense.toLocaleString()}
                          </td>
                          <td className="amount">
                            {data.fuelExpense.toLocaleString()}
                          </td>
                          <td className="amount">
                            {(specialItemsDept[dept] || 0).toLocaleString()}
                          </td>
                          <td className="amount total">
                            {data.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 전체 합계 */}
                <div className="grand-total">
                  <h2>전체 합계</h2>
                  <div className="total-grid">
                    <div className="total-item">
                      <span>일반경비</span>
                      <strong>
                        {grandTotal.totalExpense.toLocaleString()}원
                      </strong>
                    </div>
                    <div className="total-item">
                      <span>유류비</span>
                      <strong>
                        {grandTotal.fuelExpense.toLocaleString()}원
                      </strong>
                    </div>
                    <div className="total-item">
                      <span>특별항목</span>
                      <strong>
                        {Object.values(specialItemsDept)
                          .reduce((sum, amount) => sum + amount, 0)
                          .toLocaleString()}
                        원
                      </strong>
                    </div>
                    <div className="total-item grand">
                      <span>전체 청구액</span>
                      <strong>
                        {(
                          grandTotal.totalAmount +
                          Object.values(specialItemsDept).reduce(
                            (sum, amount) => sum + amount,
                            0
                          )
                        ).toLocaleString()}
                        원
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
