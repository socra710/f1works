import React from 'react';
import styles from '../Hardware.module.css';

const HardwareFilter = ({
  filter,
  setFilter,
  hardwareList,
  onPrintSelected,
  selectedCount = 0,
}) => {
  return (
    <div className={styles.hardwareFilter}>
      <button
        className={`${styles.filterButton} ${
          filter === 'all' ? styles.filterActive : ''
        }`}
        onClick={() => setFilter('all')}
      >
        전체 ({hardwareList.length})
      </button>
      <button
        className={`${styles.filterButton} ${
          filter === 'new' ? styles.filterActive : ''
        }`}
        onClick={() => setFilter('new')}
      >
        신규납품 ({hardwareList.filter((h) => h.category === '신규납품').length}
        )
      </button>
      <button
        className={`${styles.filterButton} ${
          filter === 'repair' ? styles.filterActive : ''
        }`}
        onClick={() => setFilter('repair')}
      >
        고장회수 ({hardwareList.filter((h) => h.category === '고장회수').length}
        )
      </button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
        <button
          className={`${styles.filterButton} ${
            selectedCount ? styles.filterActive : ''
          }`}
          onClick={onPrintSelected}
          disabled={!selectedCount}
          title={selectedCount ? `${selectedCount}건 출력` : '선택 항목 없음'}
        >
          출력 {selectedCount ? `(${selectedCount})` : ''}
        </button>
      </div>
    </div>
  );
};

export default HardwareFilter;
