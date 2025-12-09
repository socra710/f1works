import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManagerMode, setIsManagerMode] = useState(
    searchParams.get('mode') === 'manager'
  );
  const [factoryCode] = useState('F001'); // 예시, 실제로는 로그인 정보에서 가져옴
  const [currentUser] = useState('ADMIN'); // 예시, 실제로는 로그인 정보에서 가져옴

  // 폼 상태
  const [formData, setFormData] = useState({
    department: '',
    itemName: '',
    amount: '',
    quantity: 1,
    unitPrice: '',
    memo: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 특별 항목 목록 조회
  useEffect(() => {
    loadSpecialItems();
  }, [month]);

  const loadSpecialItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/special-items?factoryCode=${factoryCode}&monthYm=${month}`
      );
      const data = await response.json();

      if (data.success) {
        setItems(data.data || []);
      } else {
        showToast(data.message || '특별 항목 조회에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('특별 항목 조회 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      department: '',
      itemName: '',
      amount: '',
      quantity: 1,
      unitPrice: '',
      memo: '',
    });
    setEditingId(null);
  };

  // 수정 시작
  const handleEdit = (item) => {
    setFormData({
      department: item.department,
      itemName: item.itemName,
      amount: item.amount,
      quantity: item.quantity,
      unitPrice: item.unitPrice || '',
      memo: item.memo || '',
    });
    setEditingId(item.specialItemId);
    setShowForm(true);
  };

  // 저장
  const handleSave = async () => {
    if (!formData.department || !formData.itemName || !formData.amount) {
      showToast('필수 항목을 입력하세요.', 'error');
      return;
    }

    const payload = {
      factoryCode,
      monthYm: month,
      ...formData,
      amount: parseFloat(formData.amount),
      quantity: parseInt(formData.quantity),
      unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
    };

    if (editingId) {
      payload.specialItemId = editingId;
      payload.updatedBy = currentUser;
    } else {
      payload.createdBy = currentUser;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE_URL}/api/special-items`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        showToast(data.message, 'success');
        resetForm();
        setShowForm(false);
        loadSpecialItems();
      } else {
        showToast(data.message || '저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  // 삭제
  const handleDelete = async (itemId) => {
    showDialog({
      title: '삭제 확인',
      message: '이 항목을 삭제하시겠습니까?',
      buttons: [
        {
          text: '삭제',
          onClick: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/special-items?specialItemId=${itemId}`,
                { method: 'DELETE' }
              );

              const data = await response.json();

              if (data.success) {
                showToast(data.message, 'success');
                loadSpecialItems();
              } else {
                showToast(data.message || '삭제에 실패했습니다.', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showToast('삭제 중 오류가 발생했습니다.', 'error');
            }
          },
        },
        { text: '취소' },
      ],
    });
  };

  // 부서별 집계
  const getGroupedByDepartment = () => {
    const grouped = {};
    items.forEach((item) => {
      if (!grouped[item.department]) {
        grouped[item.department] = [];
      }
      grouped[item.department].push(item);
    });
    return grouped;
  };

  // 총 합계
  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  if (!isManagerMode) {
    return (
      <div className="special-items-error">
        <h2>접근 권한이 없습니다</h2>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
        <button onClick={() => navigate('/works')}>돌아가기</button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>특별 항목 관리</title>
      </Helmet>

      <div className="special-items-container">
        <h1>특별 항목 관리</h1>

        <div className="special-items-controls">
          <div className="month-selector">
            <label>대상 월:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <button
            className="btn-add"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + 항목 추가
          </button>
        </div>

        {/* 폼 영역 */}
        {showForm && (
          <div className="special-items-form">
            <h3>{editingId ? '항목 수정' : '항목 추가'}</h3>
            <div className="form-group">
              <label>부서명 *</label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              >
                <option value="">선택</option>
                <option value="소담">소담</option>
                <option value="세종">세종</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="form-group">
              <label>항목명 *</label>
              <select
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
              >
                <option value="">선택</option>
                <option value="점심">점심</option>
                <option value="저녁">저녁</option>
                <option value="간식">간식</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>수량</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>단가 (원)</label>
                <input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>총액 (원) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>비고</label>
              <textarea
                value={formData.memo}
                onChange={(e) =>
                  setFormData({ ...formData, memo: e.target.value })
                }
                rows="2"
              />
            </div>

            <div className="form-buttons">
              <button className="btn-save" onClick={handleSave}>
                저장
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 목록 영역 */}
        {isLoading ? (
          <div className="loading-container">
            <ClipLoader size={50} color="#4CAF50" />
          </div>
        ) : items.length === 0 ? (
          <div className="no-data">
            <p>{month}월에 등록된 특별 항목이 없습니다.</p>
          </div>
        ) : (
          <div className="special-items-list">
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
                          <td>{item.unitPrice.toLocaleString()}</td>
                          <td className="amount">
                            {item.amount.toLocaleString()}
                          </td>
                          <td>{item.memo}</td>
                          <td className="actions">
                            <button
                              className="btn-edit"
                              onClick={() => handleEdit(item)}
                            >
                              수정
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDelete(item.specialItemId)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="department-subtotal">
                        <td colSpan="3">소계</td>
                        <td className="amount">
                          {deptItems
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
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
                  {getTotalAmount().toLocaleString()}원
                </span>
              </h3>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
