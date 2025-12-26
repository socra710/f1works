import React from 'react';
import styles from '../AdminPage.module.css';

export default function AdminHero({ onHomeClick }) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div>
          <h1 className={styles.heroTitle}>메뉴별 관리자</h1>
          <p className={styles.heroSubtitle}>
            업무 메뉴 단위로 관리자 등록/해지
          </p>
        </div>
        <button className={styles.heroButton} onClick={onHomeClick}>
          홈으로
        </button>
      </div>
    </section>
  );
}
