import React from 'react';
import styles from '../CustomerContact.module.css';

const CustomerContactInfo = ({ contactList }) => {
  const totalCount = contactList.length;
  const warningCount = contactList.filter(
    (c) => c.status === 'WARNING' || c.daysSinceContact >= 30,
  ).length;
  const normalCount = totalCount - warningCount;

  return (
    <div className={styles.infoContainer}>
      <div className={styles.infoCard}>
        <div className={styles.infoLabel}>전체 고객</div>
        <div className={styles.infoValue}>{totalCount}</div>
      </div>
      <div className={styles.infoCard}>
        <div className={styles.infoLabel}>정상</div>
        <div className={`${styles.infoValue} ${styles.normal}`}>
          {normalCount}
        </div>
      </div>
      <div className={styles.infoCard}>
        <div className={styles.infoLabel}>관리 필요 (30일 이상)</div>
        <div className={`${styles.infoValue} ${styles.warning}`}>
          {warningCount}
        </div>
      </div>
    </div>
  );
};

export default CustomerContactInfo;
