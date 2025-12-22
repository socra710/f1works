import React from 'react';
import styles from '../Hardware.module.css';

const HardwareFilter = ({ filter, setFilter, hardwareList }) => {
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
    </div>
  );
};

export default HardwareFilter;
