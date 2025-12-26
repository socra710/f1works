import React from 'react';
import { getInitials } from '../utils';
import styles from '../AdminPage.module.css';

export default function GlobalAdminForm({
  globalSearchTerm,
  onChangeSearchTerm,
  onSearch,
  onAdd,
  selectedUsers,
  onClearSelected,
  searchResults,
  onToggleUser,
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
        <button onClick={onSearch}>검색</button>
        <button onClick={onAdd}>등록</button>
      </div>

      {selectedUsers?.length > 0 && (
        <div className={styles.selectedList}>
          {selectedUsers.map((u) => (
            <div key={u.userId} className={styles.selected}>
              <span className={`${styles.avatar} ${styles.small}`}>
                {getInitials(u.userName)}
              </span>
              <span className={styles.selectedText}>
                {u.userName} ({u.userId})
              </span>
              <button
                className={styles.chipClear}
                onClick={() => onToggleUser(u)}
                aria-label="선택 해제"
              >
                ×
              </button>
            </div>
          ))}
          <button
            className={styles.chipClear}
            onClick={onClearSelected}
            aria-label="전체 해제"
          >
            전체 해제
          </button>
        </div>
      )}

      {searchResults?.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((item) => {
            const selected = selectedUsers?.some(
              (u) => u.userId === item.userId
            );
            return (
              <button
                key={item.userId}
                className={styles.searchChip}
                aria-pressed={selected}
                onClick={() =>
                  onToggleUser({ userId: item.userId, userName: item.userName })
                }
              >
                {selected ? '✓ ' : ''}
                {item.userName} ({item.userId})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
