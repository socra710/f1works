import React, { useEffect, useState } from 'react';
import styles from '../Hardware.module.css';
import { useToast } from '../../../common/Toast';

const CustomerSearchModal = ({ onClose, onSelect }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const search = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/jvWorksSearchCustomer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ keyword: keyword || '' }),
      });
      const json = await response.json();
      if (json.success) {
        setResults(json.data || []);
      } else {
        showToast(json.message || '조회에 실패했습니다.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('서버 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} ${styles['modalContent--narrow']}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>거래처 찾기</h2>
          <button className={styles.btnClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div
          className={`${styles.hardwareForm} ${styles['hardwareForm--compact']}`}
        >
          <div className={styles.formRow}>
            <div className={styles.field}>
              {/* <label>검색어</label> */}
              <div className={styles.inputWithIcon}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="거래처명 입력 후 Enter 또는 조회"
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={search}
                >
                  검색
                </button>
              </div>
            </div>
          </div>

          <div
            className={`${styles.hardwareTableWrapper} ${styles['hardwareTableWrapper--compact']}`}
          >
            <table className={styles.hardwareTable}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>No</th>
                  <th>거래처명</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className={styles.noData}>
                      조회 중...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={2} className={styles.noData}>
                      결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  results.map((row, idx) => (
                    <tr key={`${row.CUSTOMER_NAME}-${idx}`}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.btnEdit}
                          onClick={() => onSelect(row.CUSTOMER_NAME)}
                        >
                          {row.CUSTOMER_NAME}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSearchModal;
