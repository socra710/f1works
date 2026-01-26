import React from 'react';
import styles from '../CustomerContact.module.css';

const CustomerContactFilter = ({
  filter,
  setFilter,
  contactList,
  managerFilter,
  setManagerFilter,
  managerList,
}) => {
  const totalCount = contactList.length;
  const warningCount = contactList.filter(
    (c) => c.status === 'WARNING' || c.daysSinceContact >= 30,
  ).length;
  const normalCount = totalCount - warningCount;

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterButtons}>
        <button
          className={`${styles.filterButton} ${
            filter === 'all' ? styles.active : ''
          }`}
          onClick={() => setFilter('all')}
        >
          전체 ({totalCount})
        </button>
        <button
          className={`${styles.filterButton} ${
            filter === 'normal' ? styles.active : ''
          }`}
          onClick={() => setFilter('normal')}
        >
          정상 ({normalCount})
        </button>
        <button
          className={`${styles.filterButton} ${styles.warning} ${
            filter === 'warning' ? styles.active : ''
          }`}
          onClick={() => setFilter('warning')}
        >
          ⚠️ 관리 필요 ({warningCount})
        </button>
      </div>

      {managerList && managerList.length > 0 && (
        <div className={styles.managerFilterContainer}>
          <label htmlFor="managerFilter" className={styles.managerFilterLabel}>
            👤 담당자
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="managerFilter"
              className={styles.managerFilterSelect}
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
            >
              <option value="all">전체 담당자</option>
              {managerList.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
            <span className={styles.selectIcon}>▼</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerContactFilter;
