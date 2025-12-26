import React from 'react';
import { getInitials } from '../utils';
import styles from '../AdminPage.module.css';

export default function GlobalAdminForm({
  globalSearchTerm,
  onChangeSearchTerm,
  onSearch,
  onAdd,
  selectedUser,
  onClearSelected,
  searchResults,
  onSelectUser,
}) {
  return (
    <div className={styles.form}>
      <label className={styles.label}>사번 / 이름 검색</label>
      <div className={styles.inline}>
        <input
          className={styles.input}
          value={globalSearchTerm}
          onChange={(e) => onChangeSearchTerm(e.target.value)}
          placeholder="사번 또는 이름을 입력하세요"
        />
        <button onClick={onSearch}>검색</button>
        <button onClick={onAdd}>등록</button>
      </div>

      {selectedUser && (
        <div className={styles.selected}>
          <span className={`${styles.avatar} ${styles.small}`}>
            {getInitials(selectedUser.userName)}
          </span>
          <span className={styles.selectedText}>
            {selectedUser.userName} ({selectedUser.userId})
          </span>
          <button
            className={styles.chipClear}
            onClick={onClearSelected}
            aria-label="선택 해제"
          >
            ×
          </button>
        </div>
      )}

      {searchResults?.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((item) => (
            <button
              key={item.userId}
              className={styles.searchChip}
              onClick={() =>
                onSelectUser({ userId: item.userId, userName: item.userName })
              }
            >
              {item.userName} ({item.userId})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
