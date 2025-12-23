import React, { useState, useEffect } from 'react';
import styles from './CharacterShop.module.css';
import { useToast } from '../../../common/Toast';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/com/api';

/**
 * 캐릭터 상점 컴포넌트
 * 사용자가 코인으로 캐릭터를 구매할 수 있는 UI
 */
const CharacterShop = ({
  userId,
  coins,
  onCoinsUpdate,
  onClose,
  onPurchase,
}) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  const { showToast } = useToast();

  // 상점 아이템 및 카테고리 로드
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/jvWorksGetShopItems`);
        if (!res.ok) throw new Error('상점 데이터 로드 실패');

        const json = await res.json();
        console.log('API 응답:', json); // 디버그: 응답 데이터 확인
        if (json.success) {
          const cats = json.categories || [];
          setCategories(cats);
          setItems(json.items || []);
          if (cats.length > 0) {
            const firstEnabled =
              cats.find((c) => c !== 'POWERUP' && c !== 'SKIN') || cats[0];
            setSelectedCategory(firstEnabled);
          }
        }
      } catch (error) {
        console.error('상점 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, []);

  // 사용자 구매 목록 로드
  useEffect(() => {
    if (!userId) return;

    const fetchPurchases = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/jvWorksGetUserPurchases?userId=${encodeURIComponent(
            userId
          )}`
        );
        if (!res.ok) throw new Error('구매 목록 로드 실패');

        const json = await res.json();
        if (json.success && json.items) {
          const purchasedIds = json.items.map((item) => item.itemId);
          setPurchasedItems(purchasedIds);
        }
      } catch (error) {
        console.error('구매 목록 로드 실패:', error);
      }
    };

    fetchPurchases();
  }, [userId]);

  // 별도 인기 섹션 제거: 서버에서 popular 플래그로 전달받아 카드에 뱃지로 표시

  // 선택된 카테고리의 아이템 필터링 (대소문자/공백 안전)
  const categoryItems = selectedCategory
    ? items.filter((item) => {
        const a = (item && item.category ? String(item.category) : '')
          .toUpperCase()
          .trim();
        const b = (selectedCategory ? String(selectedCategory) : '')
          .toUpperCase()
          .trim();
        return a === b;
      })
    : items;

  // 구매 처리
  const handlePurchaseItem = async (item) => {
    if (!userId) {
      showToast('로그인이 필요합니다', 'warning');
      return;
    }

    if (coins < item.price) {
      showToast(
        `코인이 부족합니다. 필요: ${item.price}, 보유: ${coins}`,
        'warning'
      );
      return;
    }

    if (purchasedItems.includes(item.id)) {
      showToast('이미 구매한 아이템입니다', 'info');
      return;
    }

    setPurchasing(true);

    try {
      const res = await fetch(`${API_BASE_URL}/jvWorksPurchaseItem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          itemId: item.id,
          currentCoins: coins,
        }),
      });

      if (!res.ok) throw new Error('구매 요청 실패');

      const json = await res.json();
      if (json.success) {
        // 구매 성공
        const newBalance = json.newBalance || coins - item.price;
        onCoinsUpdate(newBalance);
        setPurchasedItems([...purchasedItems, item.id]);
        showToast(json.message || '구매가 완료되었습니다!', 'success');
        setSelectedItemForDetails(null);

        // 구매한 아이템 정보를 부모 컴포넌트에 전달
        if (onPurchase) {
          onPurchase({
            itemCode: item.itemCode,
            emoji: item.emoji,
            displayName: item.displayName,
            category: item.category,
          });
        }
      } else {
        showToast(json.message || '구매에 실패했습니다', 'error');
      }
    } catch (error) {
      console.error('구매 처리 실패:', error);
      showToast('구매 처리 중 오류가 발생했습니다', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  // 모달 프레임을 유지한 채 내부에서 로딩 스피너를 렌더링

  const handleOverlayClick = (e) => {
    // 오버레이를 직접 클릭했을 때만 닫기 (모달 내부 클릭은 제외)
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className={styles['shop-modal-overlay']} onClick={handleOverlayClick}>
      <div
        className={styles['shop-modal']}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles['modal-header']}>
          <h1>🏪 상점</h1>
          <div className={styles['header-actions']}>
            <div className={styles['coin-badge']}>💰 {coins}</div>
            {onClose && (
              <button
                type="button"
                className={styles['close-modal-btn']}
                onClick={onClose}
                aria-label="닫기"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 탭 - 더 명확하게 구분 */}
        <div className={styles['tabs-container']}>
          {categories.map((category) => {
            const isDisabled = category === 'POWERUP' || category === 'SKIN';
            return (
              <button
                key={category}
                className={`${styles['tab']} ${
                  selectedCategory === category ? styles['tab-active'] : ''
                } ${isDisabled ? styles['tab-disabled'] : ''}`}
                onClick={() => !isDisabled && setSelectedCategory(category)}
                disabled={isDisabled}
              >
                <span className={styles['tab-icon']}>
                  {getCategoryIcon(category)}
                </span>
                <span className={styles['tab-label']}>
                  {getCategoryLabel(category)}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles['modal-content']}>
          {/* 아이템 그리드 */}
          {loading ? (
            <div className={styles['loading']}>
              <div className={styles['spinner']} />
              <div className={styles['loading-text']}>상점 불러오는 중...</div>
            </div>
          ) : categoryItems.length === 0 ? (
            <div className={styles['empty']}>
              이 카테고리에 아이템이 없습니다
            </div>
          ) : (
            <div className={styles['items-grid']}>
              {categoryItems.map((item) => {
                const isPurchased = purchasedItems.includes(item.id);
                const canAfford = coins >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`${styles['item-card']} ${
                      isPurchased ? styles['purchased'] : ''
                    }`}
                    onClick={() =>
                      !isPurchased && setSelectedItemForDetails(item)
                    }
                  >
                    {item.popular && (
                      <div className={styles['badge-popular']}>🔥 인기</div>
                    )}
                    <div className={styles['item-emoji']}>{item.emoji}</div>
                    <div className={styles['item-name']}>
                      {item.displayName}
                    </div>
                    <div className={styles['item-price']}>
                      {isPurchased ? (
                        <span className={styles['purchased-label']}>
                          ✓ 보유중
                        </span>
                      ) : (
                        <>
                          <span className={styles['coin-icon']}>💰</span>
                          <span className={styles['price-value']}>
                            {item.price}
                          </span>
                        </>
                      )}
                    </div>
                    {!isPurchased && (
                      <button
                        className={`${styles['buy-button']} ${
                          !canAfford ? styles['disabled'] : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseItem(item);
                        }}
                        disabled={!canAfford || purchasing}
                      >
                        {!canAfford ? '부족' : '구매'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 상세 정보 모달 */}
        {selectedItemForDetails && (
          <div className={styles['item-details-overlay']}>
            <div className={styles['item-details-modal']}>
              <button
                className={styles['close-button']}
                onClick={() => setSelectedItemForDetails(null)}
              >
                ×
              </button>
              <div className={styles['modal-emoji']}>
                {selectedItemForDetails.emoji}
              </div>
              <h2>{selectedItemForDetails.displayName}</h2>
              <p className={styles['description']}>
                {selectedItemForDetails.description}
              </p>
              <div className={styles['price-info']}>
                💰 {selectedItemForDetails.price} 코인
              </div>
              <button
                className={`${styles['buy-button-modal']} ${
                  coins < selectedItemForDetails.price ? styles['disabled'] : ''
                }`}
                onClick={() => handlePurchaseItem(selectedItemForDetails)}
                disabled={coins < selectedItemForDetails.price || purchasing}
              >
                {purchasing ? '처리 중...' : '구매하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 카테고리 아이콘 반환
 */
function getCategoryIcon(category) {
  const icons = {
    CHARACTER: '🐾',
    MONSTER: '👿',
    FANTASY: '✨',
    SKIN: '🎨',
    POWERUP: '⚡',
  };
  const key = (category ? String(category) : '').toUpperCase();
  return icons[key] || '📦';
}

/**
 * 카테고리 라벨 매핑
 */
function getCategoryLabel(category) {
  const labels = {
    CHARACTER: '캐릭터',
    MONSTER: '괴물',
    FANTASY: '환상',
    SKIN: '스킨',
    POWERUP: '파워업',
  };
  const key = (category ? String(category) : '').toUpperCase();
  return labels[key] || category;
}

export default CharacterShop;
