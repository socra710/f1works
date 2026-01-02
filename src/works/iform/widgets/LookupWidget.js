import React, { useState, useEffect } from 'react';
import LookupModal from './LookupModal';
import styles from './LookupWidget.module.css';

export default function LookupWidget(props) {
  const { value, onChange, schema, uiSchema, readonly, disabled } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || '');

  // value 변경시 displayValue 업데이트
  useEffect(() => {
    setDisplayValue(value || '');
  }, [value]);

  const lookupConfig = uiSchema?.['ui:options']?.lookup || {};
  const onRelatedFieldsReady = props.formContext?.onRelatedFieldsReady;

  const handleSelect = (item) => {
    const valueKey = lookupConfig.valueKey || 'id';
    const selectedValue = item[valueKey] || item;

    // 1. lookup 값만 onChange로 전달 (RJSF가 이 필드 업데이트)
    onChange(selectedValue);
    setDisplayValue(selectedValue);

    // 2. 관련 필드는 콜백으로 formContext에 전달 (FormRenderer에서 처리)
    if (lookupConfig.relatedFields && onRelatedFieldsReady) {
      const relatedData = {};
      Object.entries(lookupConfig.relatedFields).forEach(
        ([targetField, sourceKey]) => {
          relatedData[targetField] = item[sourceKey];
        }
      );
      onRelatedFieldsReady(relatedData);
    }
  };

  return (
    <div className={styles.lookupWrapper}>
      <input
        type="text"
        value={displayValue}
        readOnly
        placeholder={schema.title || '조회하여 선택'}
        className={styles.lookupInput}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={styles.lookupButton}
        disabled={readonly || disabled}
      >
        조회
      </button>

      <LookupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        lookupConfig={lookupConfig}
      />
    </div>
  );
}
