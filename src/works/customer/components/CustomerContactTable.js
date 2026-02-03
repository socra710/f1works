import React from 'react';
import styles from '../CustomerContact.module.css';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toISOString().split('T')[0];
};

const StatusBadge = ({ status, statusText, daysSinceContact }) => {
  const isWarning = status === 'WARNING' || daysSinceContact >= 30;
  const getStatusClass = () => {
    if (isWarning) {
      return styles.statusWarning;
    }
    return styles.statusNormal;
  };

  const displayText = isWarning ? '관리필요' : statusText || '정상';

  return (
    <span className={`${styles.statusBadge} ${getStatusClass()}`}>
      {displayText}
    </span>
  );
};

const CustomerContactTable = ({ contactList, onEdit, onDelete, loading }) => {
  if (loading) {
    const skeletonRows = Array.from({ length: 5 });

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.customerTable}>
          <thead>
            <tr>
              <th>NO</th>
              <th>고객사명</th>
              <th>담당자</th>
              <th>마지막 방문일</th>
              <th>마지막 통화일</th>
              <th>최종 컨택일</th>
              <th>경과일</th>
              <th>상태/액션</th>
              <th>비고</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((_, idx) => (
              <tr key={`skeleton-${idx}`}>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
                <td className={styles.customerName}>
                  <span className={styles.skeletonCell} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
                <td className={styles.emphasize}>
                  <span className={styles.skeletonCell} />
                </td>
                <td className={styles.emphasize}>
                  <span className={styles.skeletonCell} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
                <td className={styles.notes}>
                  <span className={styles.skeletonCell} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={styles.skeletonCell} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!contactList || contactList.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <p className={styles.emptyText}>등록된 고객이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.customerTable}>
        <thead>
          <tr>
            <th>NO</th>
            <th>고객사명</th>
            <th>담당자</th>
            <th>마지막 방문일</th>
            <th>마지막 통화일</th>
            <th>최종 컨택일</th>
            <th>경과일</th>
            <th>상태/액션</th>
            <th>비고</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {contactList.map((contact, index) => {
            const isWarning =
              contact.status === 'WARNING' || contact.daysSinceContact >= 30;
            const rowClass = isWarning ? styles.warningRow : '';

            return (
              <tr key={contact.contactId} className={rowClass}>
                <td>{index + 1}</td>
                <td className={styles.customerName}>{contact.customerName}</td>
                <td>{contact.managerName}</td>
                <td>{formatDate(contact.lastVisitDate)}</td>
                <td>{formatDate(contact.lastCallDate)}</td>
                <td className={styles.emphasize}>
                  {formatDate(contact.lastContactDate)}
                </td>
                <td className={styles.emphasize}>
                  {contact.daysSinceContact !== null &&
                  contact.daysSinceContact !== undefined
                    ? `${contact.daysSinceContact}일`
                    : '-'}
                </td>
                <td>
                  <StatusBadge
                    status={contact.status}
                    statusText={contact.statusText}
                    daysSinceContact={contact.daysSinceContact}
                  />
                </td>
                <td className={styles.notes} title={contact.notes || '-'}>
                  <div className={styles.notesText}>{contact.notes || '-'}</div>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.editButton}
                      onClick={() => onEdit(contact)}
                      aria-label="수정"
                    >
                      수정
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDelete(contact.contactId)}
                      aria-label="삭제"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerContactTable;
