import React, { useState, useEffect } from 'react';
import styles from './CustomerContact.module.css';
import { useToast } from '../../common/Toast';
import CustomerSearchModal from '../asset/components/CustomerSearchModal';
import {
  waitForExtensionLogin,
  decodeUserId,
} from '../../common/extensionLogin';

const CustomerContactForm = ({ contact, onClose, contactList = [] }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { showToast } = useToast();
  const [loginUserId, setLoginUserId] = useState('');

  const [formData, setFormData] = useState({
    contactId: '',
    customerName: '',
    managerName: '',
    lastVisitDate: '',
    lastCallDate: '',
    notes: '',
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const rawUser = await waitForExtensionLogin({
        minWait: 500,
        maxWait: 2000,
      });
      const userId = decodeUserId(rawUser);
      setLoginUserId(userId);
    };
    init();
  }, []);

  useEffect(() => {
    if (contact) {
      const formatDateForInput = (value) => {
        if (!value || value === '') return '';

        // 이미 YYYY-MM-DD 형식이면 그대로 반환
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return value;
        }

        // Date 객체로 변환 시도
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date value:', value);
          return '';
        }

        return date.toISOString().split('T')[0];
      };

      setFormData({
        contactId: contact.contactId || '',
        customerName: contact.customerName || '',
        managerName: contact.managerName || '',
        lastVisitDate: formatDateForInput(contact.lastVisitDate),
        lastCallDate: formatDateForInput(contact.lastCallDate),
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      showToast('고객사명을 입력해주세요.', 'warning');
      return;
    }
    if (!formData.managerName.trim()) {
      showToast('담당자를 입력해주세요.', 'warning');
      return;
    }

    try {
      const payload = {
        ...formData,
        userId: loginUserId,
        factoryCode: '000001',
      };

      const response = await fetch(
        `${API_BASE_URL}/jvWorksSetCustomerContact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (result.success) {
        showToast('저장되었습니다.', 'success');
        onClose(true);
      } else {
        showToast(result.message || '저장에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('서버 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{contact ? '고객 정보 수정' : '고객 정보 등록'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="customerName">
                고객사명 <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWithIcon}>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="고객사 선택 또는 직접 입력"
                  required
                />
                <button
                  type="button"
                  className={styles.searchButton}
                  onClick={() => setShowCustomerModal(true)}
                  aria-label="고객사 찾기"
                >
                  🔍
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="managerName">
                담당자 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="managerName"
                name="managerName"
                value={formData.managerName}
                onChange={handleChange}
                placeholder="담당자명을 입력하세요"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastVisitDate">마지막 방문일</label>
              <input
                type="date"
                id="lastVisitDate"
                name="lastVisitDate"
                value={formData.lastVisitDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastCallDate">마지막 통화일</label>
              <input
                type="date"
                id="lastCallDate"
                name="lastCallDate"
                value={formData.lastCallDate}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="notes">비고</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="비고사항을 입력하세요"
                rows="4"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              저장
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </form>

        {showCustomerModal && (
          <CustomerSearchModal
            onClose={() => setShowCustomerModal(false)}
            onSelect={(customer) => {
              setFormData((prev) => ({
                ...prev,
                customerName: customer?.name || '',
              }));
              setShowCustomerModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerContactForm;
