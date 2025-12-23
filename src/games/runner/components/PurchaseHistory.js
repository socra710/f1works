import React, { useState, useEffect } from 'react';
import styles from './PurchaseHistory.module.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

/**
 * 구매 이력 모달 컴포넌트
 * 사용자의 상점 구매 기록을 표시
 */
const PurchaseHistory = ({ userId, onClose }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/jvWorksGetUserPurchases?userId=${encodeURIComponent(
            userId
          )}`
        );
        if (!res.ok) throw new Error('구매 이력 로드 실패');

        const json = await res.json();
        if (json.success && json.items) {
          setPurchases(json.items);
        }
      } catch (error) {
        console.error('구매 이력 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [userId]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles['history-overlay']} onClick={handleOverlayClick}>
      <div
        className={styles['history-modal']}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles['modal-header']}>
          <h2>💳 구매 이력</h2>
          <button className={styles['close-button']} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles['modal-content']}>
          {loading ? (
            <div className={styles['loading']}>
              <div className={styles['spinner']} />
              <div className={styles['loading-text']}>
                구매 이력 불러오는 중...
              </div>
            </div>
          ) : purchases.length === 0 ? (
            <div className={styles['empty']}>
              <div className={styles['empty-icon']}>🛒</div>
              <p>구매 이력이 없습니다</p>
            </div>
          ) : (
            <div className={styles['purchase-list']}>
              {purchases.map((purchase) => (
                <div key={purchase.id} className={styles['purchase-item']}>
                  <div className={styles['item-emoji']}>{purchase.emoji}</div>
                  <div className={styles['item-info']}>
                    <div className={styles['item-name']}>
                      {purchase.itemName}
                    </div>
                    <div className={styles['item-date']}>
                      {formatDate(purchase.purchaseDate)}
                    </div>
                  </div>
                  <div className={styles['item-price']}>
                    <span className={styles['coin-icon']}>💰</span>
                    <span className={styles['price-value']}>
                      -{purchase.coinSpent}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles['modal-footer']}>
          <div className={styles['total-info']}>
            <span>총 구매 횟수:</span>
            <span className={styles['total-count']}>{purchases.length}회</span>
          </div>
          <div className={styles['total-info']}>
            <span>총 사용 코인:</span>
            <span className={styles['total-spent']}>
              💰 {purchases.reduce((sum, p) => sum + p.coinSpent, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseHistory;
