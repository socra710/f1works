import React, { useState, useEffect } from 'react';
import styles from './Hardware.module.css';
import { useToast } from '../../common/Toast';

const HardwareForm = ({ hardware, onClose, hardwareList = [] }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { showToast } = useToast();
  const [loginUserId, setLoginUserId] = useState('');
  const [formData, setFormData] = useState({
    hwId: '',
    category: '신규납품',
    receiptNo: '',
    hwName: '',
    quantity: 1,
    manager: '',
    collectionDate: '',
    collectionLocation: '',
    deliveryDate: '',
    deliveryLocation: '',
    asStatus: '전',
    hwSymptom: '',
    manufacturer: '',
    contactPerson: '',
    contactTel: '',
    address: '',
  });

  useEffect(() => {
    if (hardware) {
      setFormData({
        hwId: hardware.hwId || '',
        category: hardware.category || '신규납품',
        receiptNo: hardware.receiptNo || '',
        hwName: hardware.hwName || '',
        quantity: hardware.quantity || 1,
        manager: hardware.manager || '',
        collectionDate: hardware.collectionDate || '',
        collectionLocation: hardware.collectionLocation || '',
        deliveryDate: hardware.deliveryDate || '',
        deliveryLocation: hardware.deliveryLocation || '',
        asStatus: hardware.asStatus || '전',
        hwSymptom: hardware.hwSymptom || '',
        manufacturer: hardware.manufacturer || '',
        contactPerson: hardware.contactPerson || '',
        contactTel: hardware.contactTel || '',
        address: hardware.address || '',
      });
    }
  }, [hardware]);

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
  };

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

    const receiptNoToSave = formData.receiptNo.trim();
    if (receiptNoToSave) {
      const isDuplicate = hardwareList.some(
        (item) =>
          item.receiptNo?.trim() === receiptNoToSave &&
          String(item.hwId) !== String(formData.hwId || '')
      );

      if (isDuplicate) {
        showToast('이미 사용 중인 접수번호입니다.', 'error');
        return;
      }
    }

    const payload = {
      factoryCode: '000001',
      ...formData,
      receiptNo: receiptNoToSave,
      manager: managerToSave,
      userId: loginUserId || managerToSave,
      // 회수일/납품일은 미입력 시 빈 문자열로 전송 (DB에서 날짜 변환 오류 방지)
      collectionDate: formData.collectionDate || '',
      deliveryDate: formData.deliveryDate || '',
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
    <div className={styles.modalOverlay} onClick={() => onClose(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{hardware ? 'H/W 수정' : 'H/W 추가'}</h2>
          <button className={styles.btnClose} onClick={() => onClose(false)}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.hardwareForm}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>구분 *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
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
                placeholder="예: 25-001"
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
            <div className={styles.field}>
              <label>대수 *</label>
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

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>회수일</label>
              <input
                type="date"
                name="collectionDate"
                value={formData.collectionDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label>회수처</label>
              <input
                type="text"
                name="collectionLocation"
                value={formData.collectionLocation}
                onChange={handleChange}
                placeholder="회수 장소"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label>납품일</label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label>납품처</label>
              <input
                type="text"
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                placeholder="납품 장소"
              />
            </div>
          </div>

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
          </div>

          <div className={styles.formRow}>
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

            <div className={styles.field}>
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
        </form>
      </div>
    </div>
  );
};

export default HardwareForm;
