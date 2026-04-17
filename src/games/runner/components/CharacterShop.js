import React, { useState, useEffect } from 'react';
import styles from './CharacterShop.module.css';
import { useToast, useDialog } from '../../../common/Toast';

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
  const { showDialog } = useDialog();

  // 상점 아이템 및 카테고리 로드
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/jvWorksGetShopItems`);
        if (!res.ok) throw new Error('상점 데이터 로드 실패');

        const json = await res.json();
        // console.log('API 응답:', json); // 디버그: 응답 데이터 확인
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
            userId,
          )}`,
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

  // 선택된 카테고리의 아이템 필터링 및 정렬 (한정 → 할인 → 인기 → 보유중 → 일반)
  const categoryItems = selectedCategory
    ? items
        .filter((item) => {
          const a = (item && item.category ? String(item.category) : '')
            .toUpperCase()
            .trim();
          const b = (selectedCategory ? String(selectedCategory) : '')
            .toUpperCase()
            .trim();
          return a === b;
        })
        .sort((a, b) => {
          // 1순위: 한정판 아이템 (LIMITED)
          const aIsLimited = a.eventType === 'LIMITED';
          const bIsLimited = b.eventType === 'LIMITED';

          if (aIsLimited && !bIsLimited) return -1;
          if (!aIsLimited && bIsLimited) return 1;

          // 2순위: 프로모션 (PRMO)
          const aIsPromo = a.eventType === 'PRMO';
          const bIsPromo = b.eventType === 'PRMO';

          if (aIsPromo && !bIsPromo) return -1;
          if (!aIsPromo && bIsPromo) return 1;

          // 3순위: 할인 중인 아이템 (DISCOUNT)
          const aHasDiscount =
            !aIsPromo &&
            a.eventType &&
            a.eventType !== 'NONE' &&
            a.eventDiscountRate > 0 &&
            a.discountedPrice < a.price;
          const bHasDiscount =
            !bIsPromo &&
            b.eventType &&
            b.eventType !== 'NONE' &&
            b.eventDiscountRate > 0 &&
            b.discountedPrice < b.price;

          if (aHasDiscount && !bHasDiscount) return -1;
          if (!aHasDiscount && bHasDiscount) return 1;

          // 4순위: 인기 아이템
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;

          // 5순위: 보유중 아이템 (뒤로)
          const aIsPurchased = purchasedItems.includes(a.id);
          const bIsPurchased = purchasedItems.includes(b.id);

          if (!aIsPurchased && bIsPurchased) return -1;
          if (aIsPurchased && !bIsPurchased) return 1;

          // 6순위: 원래 정렬 순서 (sortOrder)
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        })
    : items.sort((a, b) => {
        // 1순위: 한정판 아이템 (LIMITED)
        const aIsLimited = a.eventType === 'LIMITED';
        const bIsLimited = b.eventType === 'LIMITED';

        if (aIsLimited && !bIsLimited) return -1;
        if (!aIsLimited && bIsLimited) return 1;

        // 2순위: 프로모션 (PRMO)
        const aIsPromo = a.eventType === 'PRMO';
        const bIsPromo = b.eventType === 'PRMO';

        if (aIsPromo && !bIsPromo) return -1;
        if (!aIsPromo && bIsPromo) return 1;

        // 3순위: 할인 중인 아이템 (DISCOUNT)
        const aHasDiscount =
          !aIsPromo &&
          a.eventType &&
          a.eventType !== 'NONE' &&
          a.eventDiscountRate > 0 &&
          a.discountedPrice < a.price;
        const bHasDiscount =
          !bIsPromo &&
          b.eventType &&
          b.eventType !== 'NONE' &&
          b.eventDiscountRate > 0 &&
          b.discountedPrice < b.price;

        if (aHasDiscount && !bHasDiscount) return -1;
        if (!aHasDiscount && bHasDiscount) return 1;

        // 4순위: 인기 아이템
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;

        // 5순위: 보유중 아이템 (뒤로)
        const aIsPurchased = purchasedItems.includes(a.id);
        const bIsPurchased = purchasedItems.includes(b.id);

        if (!aIsPurchased && bIsPurchased) return -1;
        if (aIsPurchased && !bIsPurchased) return 1;

        // 6순위: 원래 정렬 순서 (sortOrder)
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

  // 보유중인 아이템 상세 리스트 (상단 요약 표시용)
  // eslint-disable-next-line no-unused-vars
  const purchasedItemDetails = items.filter((item) =>
    purchasedItems.includes(item.id),
  );

  // 구매 처리
  const handlePurchaseItem = async (item) => {
    if (!userId) {
      showToast('로그인이 필요합니다', 'warning');
      return;
    }

    // 할인가가 있으면 할인가를, 없으면 원가를 사용
    const finalPrice =
      item.discountedPrice !== undefined &&
      item.eventType &&
      item.eventType !== 'NONE'
        ? item.discountedPrice
        : item.price;

    if (coins < finalPrice) {
      showToast(
        `코인이 부족합니다. 필요: ${finalPrice}, 보유: ${coins}`,
        'warning',
      );
      return;
    }

    if (purchasedItems.includes(item.id)) {
      showToast('이미 구매한 아이템입니다', 'info');
      return;
    }

    showDialog({
      title: '구매 확인',
      message: `'${item.displayName}'을 ${finalPrice}코인으로 구매하시겠습니까?`,
      okText: '구매',
      cancelText: '취소',
      type: 'confirm',
      onOk: async () => {
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
            const newBalance = json.newBalance || coins - finalPrice;
            onCoinsUpdate(newBalance);
            setPurchasedItems([...purchasedItems, item.id]);
            showToast(json.message || '구매가 완료되었습니다!', 'success');
            setSelectedItemForDetails(null);
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
      },
    });
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

        {/* 보유 캐릭터 요약 */}
        {/* {purchasedItemDetails.length > 0 && (
          <div className={styles['owned-strip']}>
            <div className={styles['owned-strip-title']}>내가 보유 중인 캐릭터</div>
            <div className={styles['owned-strip-list']}>
              {purchasedItemDetails.map((item) => (
                <div key={item.id} className={styles['owned-chip']}>
                  <span className={styles['owned-chip-emoji']}>{item.emoji}</span>
                  <div className={styles['owned-chip-meta']}>
                    <span className={styles['owned-chip-name']}>
                      {item.displayName}
                    </span>
                    <span className={styles['owned-chip-category']}>
                      {getCategoryLabel(item.category)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* 카테고리 탭 - 더 명확하게 구분 */}
        <div className={styles['tabs-container']}>
          {categories.map((category) => {
            const isDisabled = category === 'SKIN';
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
                const hasDiscount =
                  item.eventType &&
                  item.eventType !== 'NONE' &&
                  item.discountedPrice !== undefined &&
                  item.discountedPrice < item.price;
                const isPromo = item.eventType === 'PRMO';
                const finalPrice = hasDiscount
                  ? item.discountedPrice
                  : item.price;
                const canAfford = coins >= finalPrice;
                const isLimited = item.eventType === 'LIMITED';
                const periodMeta = getDiscountPeriodMeta(item);
                const badgeClass = isLimited
                  ? styles['badge-limited-top']
                  : isPromo
                    ? styles['badge-promo']
                    : styles['badge-discount'];
                const badgeLabel =
                  item.eventLabel ||
                  (isLimited ? '한정' : isPromo ? '프로모션' : '할인');
                const priceToneClass = isLimited
                  ? styles['price-limited']
                  : isPromo
                    ? styles['price-promo']
                    : styles['price-discount'];
                const badgePeriod = periodMeta.text;

                return (
                  <div
                    key={item.id}
                    className={`${styles['item-card']} ${
                      isPurchased ? styles['purchased'] : ''
                    } ${isLimited ? styles['limited'] : ''} ${
                      isPromo
                        ? styles['on-promo']
                        : hasDiscount && !isLimited
                          ? styles['on-sale']
                          : ''
                    }`}
                    onClick={() =>
                      !isPurchased && setSelectedItemForDetails(item)
                    }
                  >
                    {/* 보유중이면 이벤트 뱃지 대신 좌측에 보유 뱃지 */}
                    {isPurchased ? (
                      <div className={styles['badge-owned-left']}>보유중</div>
                    ) : (
                      (hasDiscount || isLimited || isPromo) && (
                        <div className={badgeClass}>
                          <div>{badgeLabel}</div>
                          {badgePeriod && (
                            <div className={styles['badge-period-sub']}>
                              {badgePeriod}
                            </div>
                          )}
                        </div>
                      )
                    )}
                    {item.popular && !hasDiscount && (
                      <div className={styles['badge-popular']}>🔥 인기</div>
                    )}

                    <div className={styles['item-emoji']}>{item.emoji}</div>
                    <div className={styles['item-name']}>
                      {item.displayName}
                    </div>
                    <div className={styles['item-price']}>
                      {isPurchased ? (
                        <div className={styles['owned-status']}>
                          <span className={styles['owned-check']}>✓</span>
                          <span className={styles['owned-copy']}>
                            이미 보유 중
                          </span>
                        </div>
                      ) : hasDiscount ? (
                        <div
                          className={`${styles['price-with-discount']} ${priceToneClass}`}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              justifyContent: 'center',
                            }}
                          >
                            <span className={styles['original-price']}>
                              💰 {item.price}
                            </span>
                            {item.eventDiscountRate > 0 && (
                              <span className={styles['discount-badge']}>
                                {item.eventDiscountRate}%
                              </span>
                            )}
                          </div>
                          <span className={styles['discounted-price']}>
                            💰 {finalPrice}
                          </span>
                          {periodMeta.text && (
                            <div
                              className={`${styles['discount-period']} ${
                                periodMeta.isUrgent
                                  ? styles['discount-period-soon']
                                  : ''
                              }`}
                            >
                              <span className={styles['discount-period-icon']}>
                                {periodMeta.icon}
                              </span>
                              {periodMeta.text}
                            </div>
                          )}
                        </div>
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
              {(function () {
                const isLimited =
                  selectedItemForDetails.eventType === 'LIMITED';
                const isPromo = selectedItemForDetails.eventType === 'PRMO';
                const hasDiscount =
                  selectedItemForDetails.eventType &&
                  selectedItemForDetails.eventType !== 'NONE' &&
                  selectedItemForDetails.discountedPrice !== undefined &&
                  selectedItemForDetails.discountedPrice <
                    selectedItemForDetails.price;
                const meta = getDiscountPeriodMeta(selectedItemForDetails);
                if (!(hasDiscount || isLimited || isPromo)) return null;
                return (
                  <div
                    className={
                      isLimited
                        ? styles['badge-limited-top']
                        : isPromo
                          ? styles['badge-promo']
                          : styles['badge-discount']
                    }
                  >
                    <div>
                      {selectedItemForDetails.eventLabel ||
                        (isLimited ? '한정' : isPromo ? '프로모션' : '할인')}
                    </div>
                    {meta.text && (
                      <div className={styles['badge-period-sub']}>
                        {meta.text}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className={styles['price-info']}>
                {(function () {
                  const isLimited =
                    selectedItemForDetails.eventType === 'LIMITED';
                  const isPromo = selectedItemForDetails.eventType === 'PRMO';
                  const hasDiscount =
                    selectedItemForDetails.eventType &&
                    selectedItemForDetails.eventType !== 'NONE' &&
                    selectedItemForDetails.discountedPrice !== undefined &&
                    selectedItemForDetails.discountedPrice <
                      selectedItemForDetails.price;
                  const priceToneClass = isLimited
                    ? styles['price-limited']
                    : isPromo
                      ? styles['price-promo']
                      : styles['price-discount'];
                  if (hasDiscount) {
                    const meta = getDiscountPeriodMeta(selectedItemForDetails);
                    return (
                      <div
                        className={`${styles['price-with-discount']} ${priceToneClass}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            justifyContent: 'center',
                          }}
                        >
                          <span className={styles['modal-original-price']}>
                            💰 {selectedItemForDetails.price}
                          </span>
                          {selectedItemForDetails.eventDiscountRate > 0 && (
                            <span className={styles['discount-badge']}>
                              {selectedItemForDetails.eventDiscountRate}%
                            </span>
                          )}
                        </div>
                        <span className={styles['modal-discounted-price']}>
                          💰 {selectedItemForDetails.discountedPrice} 코인
                        </span>
                        {meta.text && (
                          <div
                            className={`${styles['discount-period']} ${
                              meta.isUrgent
                                ? styles['discount-period-soon']
                                : ''
                            }`}
                          >
                            <span className={styles['discount-period-icon']}>
                              {meta.icon}
                            </span>
                            {meta.text}
                          </div>
                        )}
                      </div>
                    );
                  }
                  // 비할인: 한정판이면 가격 색상도 한정 스타일 반영
                  return (
                    <div
                      className={
                        isLimited
                          ? styles['price-limited']
                          : isPromo
                            ? styles['price-promo']
                            : ''
                      }
                    >
                      💰 {selectedItemForDetails.price} 코인
                    </div>
                  );
                })()}
              </div>
              <button
                className={`${styles['buy-button-modal']} ${
                  coins <
                  (selectedItemForDetails.discountedPrice !== undefined &&
                  selectedItemForDetails.eventType &&
                  selectedItemForDetails.eventType !== 'NONE'
                    ? selectedItemForDetails.discountedPrice
                    : selectedItemForDetails.price)
                    ? styles['disabled']
                    : ''
                }`}
                onClick={() => handlePurchaseItem(selectedItemForDetails)}
                disabled={
                  coins <
                    (selectedItemForDetails.discountedPrice !== undefined &&
                    selectedItemForDetails.eventType &&
                    selectedItemForDetails.eventType !== 'NONE'
                      ? selectedItemForDetails.discountedPrice
                      : selectedItemForDetails.price) || purchasing
                }
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

/**
 * 할인 기간 포맷팅 및 추출 헬퍼 (다양한 필드/형식 지원)
 */
function normalizeDateString(str) {
  if (!str || typeof str !== 'string') return str;
  // 구분자 통일: YYYY.MM.DD, YYYY/MM/DD → YYYY-MM-DD
  const s = str.replace(/[./]/g, '-');
  // 시간 정보가 없으면 자정으로 고정
  return /\d{4}-\d{1,2}-\d{1,2}$/.test(s) ? `${s}T00:00:00` : s;
}

function formatAnyDate(input) {
  if (!input && input !== 0) return '';
  try {
    let dateObj;
    if (typeof input === 'number') {
      // 초 단위 타임스탬프 보정
      const ms = input < 1e12 ? input * 1000 : input;
      dateObj = new Date(ms);
    } else if (typeof input === 'string') {
      const normalized = normalizeDateString(input);
      dateObj = new Date(normalized);
    } else if (input instanceof Date) {
      dateObj = input;
    } else {
      return '';
    }
    if (Number.isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  } catch (_) {
    return '';
  }
}

// MM/DD 짧은 표시용
function formatShortMonthDay(input) {
  if (!input && input !== 0) return '';
  try {
    let dateObj;
    if (typeof input === 'number') {
      const ms = input < 1e12 ? input * 1000 : input;
      dateObj = new Date(ms);
    } else if (typeof input === 'string') {
      const normalized = normalizeDateString(input);
      dateObj = new Date(normalized);
    } else if (input instanceof Date) {
      dateObj = input;
    } else {
      return '';
    }
    if (Number.isNaN(dateObj.getTime())) return '';
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${m}/${d}`;
  } catch (_) {
    return '';
  }
}

function getDiscountPeriod(item) {
  if (!item) return '';
  // 다양한 키 지원 (서버 스키마 변화 대응)
  const start =
    item.eventStartDate ||
    item.eventStart ||
    item.eventStartAt ||
    item.eventDateFrom ||
    item.discountStartDate ||
    item.discountStart ||
    item.discountStartTs ||
    item.saleStart ||
    item.saleStartAt ||
    item.periodStart ||
    item.startDate ||
    item.start;
  const end =
    item.eventEndDate ||
    item.eventEnd ||
    item.eventEndAt ||
    item.eventDateTo ||
    item.discountEndDate ||
    item.discountEnd ||
    item.discountEndTs ||
    item.saleEnd ||
    item.saleEndAt ||
    item.periodEnd ||
    item.endDate ||
    item.until ||
    item.end;

  // 텍스트 필드가 있으면 그대로 사용 (예: "12/20 - 12/27")
  const text = item.eventPeriod || item.salePeriod || item.periodText;
  if (text && typeof text === 'string' && text.trim()) {
    return text.trim();
  }

  const startStr = formatAnyDate(start);
  const endStr = formatShortMonthDay(end);

  if (!startStr && endStr) return `~ ${endStr}까지`;
  if (startStr && endStr) return `~ ${endStr}까지`;
  if (startStr && !endStr) return `시작 ${formatShortMonthDay(start)}`;
  return '';
}

/**
 * 백엔드 미구현 시 임시 기간을 제공 (오늘부터 7일)
 */
// eslint-disable-next-line no-unused-vars
function getFallbackPeriod(days = 7) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const endStr = formatShortMonthDay(end);
  return endStr ? `~ ${endStr}까지` : '';
}

/**
 * 실제 기간이 없으면 임시 기간 반환 (할인 중인 아이템에 한함)
 */
// function getEffectiveDiscountPeriod(item) {
//   if (!item) return '';
//   const actual = getDiscountPeriod(item);
//   if (actual) return actual;
//   const hasDiscount =
//     item.eventType &&
//     item.eventType !== 'NONE' &&
//     item.discountedPrice !== undefined &&
//     item.discountedPrice < item.price;
//   return hasDiscount ? getFallbackPeriod(7) : '';
// }

// 내부용: Date 객체로 변환
function parseAnyDate(input) {
  try {
    if (!input && input !== 0) return null;
    if (typeof input === 'number') {
      const ms = input < 1e12 ? input * 1000 : input;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string') {
      const normalized = normalizeDateString(input);
      const d = new Date(normalized);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (input instanceof Date) {
      return Number.isNaN(input.getTime()) ? null : input;
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * 아이콘과 긴급도 포함한 기간 메타 생성
 */
function getDiscountPeriodMeta(item) {
  if (!item) return { text: '', icon: '📅', isUrgent: false };
  // 원본 기간 텍스트 우선
  const actualText = getDiscountPeriod(item);
  // eslint-disable-next-line no-unused-vars
  const isPromo = item.eventType === 'PRMO';

  // 시작/종료 원시값 수집
  const startRaw =
    item.eventStartDate ||
    item.eventStart ||
    item.eventStartAt ||
    item.eventDateFrom ||
    item.discountStartDate ||
    item.discountStart ||
    item.discountStartTs ||
    item.saleStart ||
    item.saleStartAt ||
    item.periodStart ||
    item.startDate ||
    item.start;
  const endRaw =
    item.eventEndDate ||
    item.eventEnd ||
    item.eventEndAt ||
    item.eventDateTo ||
    item.discountEndDate ||
    item.discountEnd ||
    item.discountEndTs ||
    item.saleEnd ||
    item.saleEndAt ||
    item.periodEnd ||
    item.endDate ||
    item.until ||
    item.end;

  let text = actualText;
  let icon = '📅';
  let isUrgent = false;

  // 데이터가 있을 때만 표시 (fallback 제거)
  if (!text) {
    text = '';
  }

  // 아이콘 결정: 종료일만 존재하면 ⏳, 양쪽 있으면 📅
  const startStr = formatAnyDate(startRaw);
  const endStr = formatAnyDate(endRaw);
  if (!startStr && endStr) icon = '⏳';
  else icon = '📅';

  // 긴급도: 종료일까지 남은 일수 계산
  const endDate = parseAnyDate(endRaw);
  if (endDate) {
    const diffMs = endDate.getTime() - Date.now();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    isUrgent = days > 0 && days <= 2;
  }

  return { text, icon, isUrgent };
}
