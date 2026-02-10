import React, { useState, useEffect } from 'react';
import styles from './Hardware.module.css';
import { useToast } from '../../common/Toast';
import CustomerSearchModal from './components/CustomerSearchModal';

const HardwareForm = ({ hardware, onClose, hardwareList = [] }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { showToast } = useToast();
  const [loginUserId, setLoginUserId] = useState('');
  const fmtMoney = (v) => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(String(v).replace(/,/g, ''));
    if (isNaN(n)) return '';
    return n.toLocaleString('ko-KR');
  };
  const [formData, setFormData] = useState({
    hwId: '',
    category: '신규납품',
    receiptNo: '',
    hwName: '',
    specification: '',
    quantity: 1,
    manager: '',
    collectionDate: '',
    collectionLocation: '',
    deliveryDate: '',
    deliveryLocation: '',
    customerCode: '',
    customerAddress: '',
    customerTel: '',
    customerFax: '',
    customerBizNo: '',
    asStatus: '전',
    hwSymptom: '',
    manufacturer: '',
    contactPerson: '',
    contactTel: '',
    address: '',
    unitPrice: '',
    supplyAmount: '',
    taxAmount: '',
  });
  const [customerModalTarget, setCustomerModalTarget] = useState(null);

  useEffect(() => {
    if (hardware) {
      const qty = Number(hardware.quantity || 0);
      // 콤마가 포함된 문자열도 안전하게 숫자로 변환
      const unitRaw = hardware.unitPrice;
      const unit =
        unitRaw == null || unitRaw === ''
          ? null
          : Number(String(unitRaw).replace(/[^\d]/g, ''));

      // 공급가액은 백엔드가 문자열/숫자 모두 가능하므로 정규화
      const supplyRaw = hardware.supplyAmount;
      const parsedSupply =
        supplyRaw == null || supplyRaw === ''
          ? null
          : Number(String(supplyRaw).replace(/[^\d]/g, ''));
      const derivedSupply =
        unit != null && !isNaN(unit) ? Math.round(qty * unit) : null;
      let supplyNum = parsedSupply;
      if (supplyNum == null || isNaN(supplyNum)) {
        supplyNum = derivedSupply != null ? derivedSupply : 0;
      }

      // 세액도 동일하게 정규화
      const taxRaw = hardware.taxAmount;
      const parsedTax =
        taxRaw == null || taxRaw === ''
          ? null
          : Number(String(taxRaw).replace(/[^\d]/g, ''));
      const derivedTax = Math.round(Number(supplyNum || 0) * 0.1);
      let taxNum = parsedTax;
      if (taxNum == null || isNaN(taxNum)) {
        taxNum = derivedTax;
      }

      setFormData({
        hwId: hardware.hwId || '',
        category: hardware.category || '신규납품',
        receiptNo: hardware.receiptNo || '',
        hwName: hardware.hwName || '',
        specification: hardware.specification || '',
        quantity: qty || 1,
        manager: hardware.manager || '',
        collectionDate: hardware.collectionDate || '',
        collectionLocation: hardware.collectionLocation || '',
        deliveryDate: hardware.deliveryDate || '',
        deliveryLocation: hardware.deliveryLocation || '',
        customerCode: hardware.customerCode || '',
        customerAddress: hardware.customerAddress || '',
        customerTel: hardware.customerTel || '',
        customerFax: hardware.customerFax || '',
        customerBizNo: hardware.customerBizNo || '',
        asStatus: hardware.asStatus || '전',
        hwSymptom: hardware.hwSymptom || '',
        manufacturer: hardware.manufacturer || '',
        contactPerson: hardware.contactPerson || '',
        contactTel: hardware.contactTel || '',
        address: hardware.address || '',
        unitPrice: unit == null || isNaN(unit) ? '' : fmtMoney(unit),
        supplyAmount: fmtMoney(supplyNum),
        taxAmount: fmtMoney(taxNum),
      });

      // 편집 모드 초기 로드: 기본값 세팅 후 자동 계산이 다시 돌 수 있도록 플래그 해제
      setSupplyEdited(false);
      setTaxEdited(false);
    }
  }, [hardware]);

  const [supplyEdited, setSupplyEdited] = useState(false);
  const [taxEdited, setTaxEdited] = useState(false);

  useEffect(() => {
    const resolveLoginUserId = () => {
      const extLogin =
        window.sessionStorage.getItem('extensionLogin') ||
        window.localStorage.getItem('extensionLogin') ||
        '';

      let decoded = extLogin;
      if (extLogin) {
        try {
          decoded = atob(extLogin);
        } catch (e) {
          decoded = extLogin;
        }
      }

      const fallback =
        window.sessionStorage.getItem('userId') ||
        window.localStorage.getItem('userId') ||
        '';

      return (decoded && decoded.trim()) || (fallback && fallback.trim()) || '';
    };

    const userId = resolveLoginUserId();
    setLoginUserId(userId);

    // if (userId) {
    //   setFormData((prev) =>
    //     prev.manager && prev.manager.trim()
    //       ? prev
    //       : { ...prev, manager: userId }
    //   );
    // }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'supplyAmount') {
      setSupplyEdited(true);
      setTaxEdited(false);
    }
    if (name === 'taxAmount') setTaxEdited(true);
    if (name === 'quantity') {
      setSupplyEdited(false);
      setTaxEdited(false);
    }
  };

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    const clean = (value || '').replace(/[^\d]/g, '');
    setFormData((prev) => ({ ...prev, [name]: clean }));
    if (name === 'supplyAmount') {
      setSupplyEdited(true);
      setTaxEdited(false);
    }
    if (name === 'taxAmount') setTaxEdited(true);
    if (name === 'unitPrice') {
      setSupplyEdited(false);
      setTaxEdited(false);
    }
  };

  const handleMoneyBlur = (e) => {
    const { name } = e.target;
    setFormData((prev) => ({ ...prev, [name]: fmtMoney(prev[name]) }));
  };

  const handleMoneyFocus = (e) => {
    const { name } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: String(prev[name] || '').replace(/,/g, ''),
    }));
  };

  useEffect(() => {
    const qty = Number(formData.quantity || 0);
    const unit = Number(
      String(formData.unitPrice || '')
        .toString()
        .replace(/[^\d]/g, ''),
    );
    if (!supplyEdited) {
      const supply = isNaN(qty * unit) ? '' : Math.round(qty * unit);
      setFormData((prev) => ({ ...prev, supplyAmount: fmtMoney(supply) }));
    }
    if (!taxEdited) {
      const supplyNumeric = Number(
        String(formData.supplyAmount || qty * unit)
          .toString()
          .replace(/[^\d]/g, ''),
      );
      const tax = isNaN(supplyNumeric * 0.1)
        ? ''
        : Math.round(supplyNumeric * 0.1);
      setFormData((prev) => ({ ...prev, taxAmount: fmtMoney(tax) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.quantity, formData.unitPrice, formData.supplyAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const managerToSave = formData.manager?.trim() || loginUserId;

    // 필수 항목 체크
    if (!formData.hwName.trim()) {
      showToast('H/W 명을 입력해주세요.', 'error');
      return;
    }
    if (!managerToSave) {
      showToast('담당자를 입력해주세요.', 'error');
      return;
    }

    // 신규납품일 경우 납품처와 납품일 필수
    if (formData.category === '신규납품') {
      if (!formData.deliveryLocation?.trim()) {
        showToast('신규납품은 납품처를 입력해주세요.', 'error');
        return;
      }
      if (!formData.deliveryDate?.trim()) {
        showToast('신규납품은 납품일을 입력해주세요.', 'error');
        return;
      }
    }

    // 고장회수일 경우 회수처와 회수일 필수
    if (formData.category === '고장회수') {
      if (!formData.collectionLocation?.trim()) {
        showToast('고장회수는 회수처를 입력해주세요.', 'error');
        return;
      }
      if (!formData.collectionDate?.trim()) {
        showToast('고장회수는 회수일을 입력해주세요.', 'error');
        return;
      }
    }

    const receiptNoToSave = hardware ? formData.receiptNo || '' : '';

    const payload = {
      factoryCode: '000001',
      ...formData,
      receiptNo: receiptNoToSave,
      manager: managerToSave,
      userId: loginUserId || managerToSave,
      specification: formData.specification || '',
      customerCode: formData.customerCode || '',
      customerAddress: formData.customerAddress || '',
      customerTel: formData.customerTel || '',
      customerFax: formData.customerFax || '',
      customerBizNo: formData.customerBizNo || '',
      // 회수일/납품일은 미입력 시 빈 문자열로 전송 (DB에서 날짜 변환 오류 방지)
      collectionDate: formData.collectionDate || '',
      deliveryDate: formData.deliveryDate || '',
      unitPrice: String(formData.unitPrice || '').replace(/,/g, '') || 0,
      supplyAmount: String(formData.supplyAmount || '').replace(/,/g, '') || 0,
      taxAmount: String(formData.taxAmount || '').replace(/,/g, '') || 0,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/jvWorksSetHardware`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        showToast('저장되었습니다.', 'success');
        onClose(true); // refresh
      } else {
        showToast(result.message || '저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      showToast('서버 오류가 발생했습니다.', 'error');
      console.error(error);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{hardware ? 'H/W 수정' : 'H/W 추가'}</h2>
          <button className={styles.btnClose} onClick={() => onClose(false)}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.hardwareForm}>
          {/** 신규납품 여부 */}
          {(() => {
            return null;
          })()}

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>구분 *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={!!hardware}
              >
                <option value="신규납품">신규납품</option>
                <option value="고장회수">고장회수</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>접수번호</label>
              <input
                type="text"
                name="receiptNo"
                value={formData.receiptNo}
                onChange={handleChange}
                placeholder="예: 25-001(자동채번)"
                readOnly
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={`${styles.field} ${styles['field--full']}`}>
              <label>H/W 명 *</label>
              <input
                type="text"
                name="hwName"
                value={formData.hwName}
                onChange={handleChange}
                placeholder="하드웨어 명칭"
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={`${styles.field} ${styles['field--full']}`}>
              <label>규격</label>
              <input
                type="text"
                name="specification"
                value={formData.specification}
                onChange={handleChange}
                placeholder="규격 입력"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>수량 *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className={styles.field}>
              <label>담당자 *</label>
              <input
                type="text"
                name="manager"
                value={formData.manager}
                onChange={handleChange}
                placeholder="담당자명"
                required
              />
            </div>
          </div>

          {formData.category === '신규납품' && (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>납품일 *</label>
                <input
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>납품처 *</label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="text"
                    name="deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={handleChange}
                    placeholder="거래처 선택"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    className={styles.btnIcon}
                    aria-label="납품처 찾기"
                    onClick={() => setCustomerModalTarget('deliveryLocation')}
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          )}

          {formData.category !== '신규납품' && (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>회수일 *</label>
                <input
                  type="date"
                  name="collectionDate"
                  value={formData.collectionDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>회수처 *</label>
                <div className={styles.inputWithIcon}>
                  <input
                    type="text"
                    name="collectionLocation"
                    value={formData.collectionLocation}
                    onChange={handleChange}
                    placeholder="거래처 선택"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    className={styles.btnIcon}
                    aria-label="회수처 찾기"
                    onClick={() => setCustomerModalTarget('collectionLocation')}
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>단가</label>
              <input
                type="text"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleMoneyChange}
                onBlur={handleMoneyBlur}
                onFocus={handleMoneyFocus}
                inputMode="numeric"
                placeholder="단가"
              />
            </div>
            <div className={styles.field}>
              <label>공급가액</label>
              <input
                type="text"
                name="supplyAmount"
                value={formData.supplyAmount}
                onChange={handleMoneyChange}
                onBlur={handleMoneyBlur}
                onFocus={handleMoneyFocus}
                inputMode="numeric"
                placeholder="자동 계산"
              />
            </div>
            <div className={styles.field}>
              <label>세액</label>
              <input
                type="text"
                name="taxAmount"
                value={formData.taxAmount}
                onChange={handleMoneyChange}
                onBlur={handleMoneyBlur}
                onFocus={handleMoneyFocus}
                inputMode="numeric"
                placeholder="자동 계산(10%)"
              />
            </div>
          </div>

          {formData.category !== '신규납품' && (
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>A/S 상태 *</label>
                <select
                  name="asStatus"
                  value={formData.asStatus}
                  onChange={handleChange}
                >
                  <option value="전">대기</option>
                  <option value="진행중">진행중</option>
                  <option value="완">완료</option>
                </select>
              </div>
            </div>
          )}

          {formData.category !== '신규납품' && (
            <div className={styles.formRow}>
              <div className={`${styles.field} ${styles['field--full']}`}>
                <label>H/W 증상</label>
                <textarea
                  name="hwSymptom"
                  value={formData.hwSymptom}
                  onChange={handleChange}
                  placeholder="증상 설명"
                  rows="3"
                />
              </div>
            </div>
          )}

          {formData.category !== '신규납품' && (
            <>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label>제작사</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="제조사명"
                  />
                </div>

                <div className={styles.field}>
                  <label>담당자</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="제조사 담당자"
                  />
                </div>

                <div className={styles.field}>
                  <label>연락처</label>
                  <input
                    type="tel"
                    name="contactTel"
                    value={formData.contactTel}
                    onChange={handleChange}
                    placeholder="전화번호"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.field} ${styles['field--full']}`}>
                  <label>주소</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="제조사 주소"
                  />
                </div>
              </div>
            </>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSubmit}>
              저장
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => onClose(false)}
            >
              취소
            </button>
          </div>

          {customerModalTarget && (
            <CustomerSearchModal
              onClose={() => setCustomerModalTarget(null)}
              onSelect={(customer) => {
                setFormData((prev) => ({
                  ...prev,
                  [customerModalTarget]: customer?.name || '',
                  customerCode: customer?.code || '',
                  customerAddress: customer?.address || '',
                  customerTel: customer?.tel || '',
                  customerFax: customer?.fax || '',
                  customerBizNo: customer?.bizNo || '',
                }));
                setCustomerModalTarget(null);
              }}
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default HardwareForm;
