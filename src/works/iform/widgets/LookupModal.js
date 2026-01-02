import React, { useState, useEffect } from 'react';
import styles from './LookupModal.module.css';

export default function LookupModal({
  isOpen,
  onClose,
  onSelect,
  lookupConfig,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lookupConfig?.autoLoad) {
      handleSearch();
    }
  }, [isOpen, lookupConfig]);

  const handleSearch = async () => {
    if (!lookupConfig?.dataSource) {
      setResults(lookupConfig?.mockData || []);
      return;
    }

    // dataSource가 함수인지 확인
    if (typeof lookupConfig.dataSource !== 'function') {
      console.warn(
        'dataSource is not a function:',
        typeof lookupConfig.dataSource,
        lookupConfig.dataSource
      );
      setResults(lookupConfig?.mockData || []);
      return;
    }

    setLoading(true);
    try {
      const data = await lookupConfig.dataSource(searchTerm);
      setResults(data);
    } catch (error) {
      console.error('조회 실패:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  const columns = lookupConfig?.columns || [{ key: 'value', label: '값' }];
  const displayKey = lookupConfig?.displayKey || 'name';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{lookupConfig?.title || '조회'}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={
              lookupConfig?.searchPlaceholder || '검색어를 입력하세요'
            }
            className={styles.searchInput}
          />
          <button
            onClick={handleSearch}
            className={styles.searchButton}
            disabled={loading}
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>

        <div className={styles.resultContainer}>
          {results.length === 0 ? (
            <div className={styles.emptyState}>
              {loading ? '조회 중...' : '조회 결과가 없습니다.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={styles.th}>
                      {col.label}
                    </th>
                  ))}
                  <th className={styles.th}>선택</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => (
                  <tr key={idx} className={styles.tr}>
                    {columns.map((col) => (
                      <td key={col.key} className={styles.td}>
                        {item[col.key]}
                      </td>
                    ))}
                    <td className={styles.td}>
                      <button
                        className={styles.selectButton}
                        onClick={() => handleSelectItem(item)}
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
