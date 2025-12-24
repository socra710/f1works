import React from 'react';
import styles from '../Hardware.module.css';
import { StatusBadge, CategoryBadge } from './HardwareBadges';

const formatDate = (value) => {
  if (!value) return '-';
  if (value === '0000-00-00' || value === '1900-01-01') return '-';
  return value;
};

const formatMoney = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(String(v).replace(/,/g, ''));
  if (isNaN(n)) return '-';
  return n.toLocaleString('ko-KR');
};

const TableHeader = ({ isNewView }) => (
  <thead>
    <tr className={styles.groupHeaderRow}>
      <th colSpan={isNewView ? 12 : 12} className={styles.groupHeaderMain}>
        기본 정보
      </th>
      {!isNewView && (
        <th colSpan="5" className={styles.groupHeaderAccent}>
          A/S 접수
        </th>
      )}
      <th rowSpan="2" className={styles.groupHeaderAction}>
        관리
      </th>
    </tr>
    <tr>
      <th>NO</th>
      <th>구분</th>
      <th>접수번호</th>
      <th>H/W 명</th>
      <th>수량</th>
      <th>단가</th>
      <th>공급가액</th>
      <th>세액</th>
      <th>담당자</th>
      <th>납품일</th>
      <th>납품처</th>
      {!isNewView && <th>회수일</th>}
      {!isNewView && <th>회수처</th>}
      {!isNewView && <th>A/S 상태</th>}
      {!isNewView && <th>H/W 증상</th>}
      {!isNewView && <th>제작사/담당자/연락처</th>}
      <th>출력</th>
    </tr>
  </thead>
);

const HardwareTable = ({
  filteredList,
  onEdit,
  onDelete,
  loading,
  filter,
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const isNewView = filter === 'new';
  if (loading) {
    const skeletonRows = Array.from({ length: 5 });
    const columnsCount = isNewView ? 13 : 18;

    return (
      <div className={styles.hardwareTableWrapper}>
        <table className={styles.hardwareTable}>
          <TableHeader isNewView={isNewView} />
          <tbody>
            {skeletonRows.map((_, idx) => (
              <tr key={`skeleton-${idx}`}>
                {Array.from({ length: columnsCount }).map((__, colIdx) => (
                  <td key={`skeleton-cell-${idx}-${colIdx}`}>
                    <span className={styles.skeletonCell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.hardwareTableWrapper}>
      <table className={styles.hardwareTable}>
        <TableHeader isNewView={isNewView} />
        <tbody>
          {filteredList.length === 0 ? (
            <tr>
              <td colSpan={isNewView ? 13 : 18} className={styles.noData}>
                등록된 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            filteredList.map((hw, index) => (
              <tr key={hw.hwId}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                <td style={{ textAlign: 'center' }}>
                  <CategoryBadge category={hw.category} />
                </td>
                <td style={{ textAlign: 'center' }}>{hw.receiptNo || '-'}</td>
                <td className={styles.hwName}>{hw.hwName}</td>
                <td style={{ textAlign: 'center' }}>{hw.quantity}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatMoney(hw.unitPrice)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatMoney(hw.supplyAmount)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {formatMoney(hw.taxAmount)}
                </td>
                <td style={{ textAlign: 'center' }}>{hw.manager}</td>
                <td style={{ textAlign: 'center' }}>
                  {formatDate(hw.deliveryDate)}
                </td>
                <td>{hw.deliveryLocation || '-'}</td>
                {!isNewView && (
                  <td style={{ textAlign: 'center' }}>
                    {formatDate(hw.collectionDate)}
                  </td>
                )}
                {!isNewView && <td>{hw.collectionLocation || '-'}</td>}
                {!isNewView && (
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={hw.asStatus} />
                  </td>
                )}
                {!isNewView && (
                  <td className={styles.symptom}>{hw.hwSymptom || '-'}</td>
                )}
                {!isNewView && (
                  <td className={styles.contact}>
                    {hw.manufacturer && (
                      <div>
                        <div>{hw.manufacturer}</div>
                        {hw.contactPerson && <div>{hw.contactPerson}</div>}
                        {hw.contactTel && <div>{hw.contactTel}</div>}
                      </div>
                    )}
                  </td>
                )}
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedIds instanceof Set
                        ? selectedIds.has(hw.hwId)
                        : selectedIds?.includes?.(hw.hwId)
                    }
                    onChange={(e) =>
                      onToggleSelect &&
                      onToggleSelect(hw.hwId, e.target.checked)
                    }
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button className={styles.btnEdit} onClick={() => onEdit(hw)}>
                    수정
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => onDelete(hw.hwId)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default HardwareTable;
