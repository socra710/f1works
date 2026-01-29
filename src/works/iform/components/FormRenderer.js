import React from 'react';
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import SignatureWidget from '../widgets/SignatureWidget';
import LookupWidget from '../widgets/LookupWidget';
import DocumentWidget from '../widgets/DocumentWidget';
import styles from './FormRenderer.module.css';

function ObjectFieldTemplate(props) {
  const { properties } = props;
  return (
    <div className={styles.gridContainer}>
      {properties.map((element) => (
        <div
          key={element.name}
          className={
            element.content.props.uiSchema?.['ui:options']?.col === 6
              ? styles.colHalf
              : styles.colFull
          }
        >
          {element.content}
        </div>
      ))}
    </div>
  );
}

function TableFieldTemplate(props) {
  const {
    id,
    classNames,
    label,
    required,
    errors,
    help,
    children,
    hidden,
  } = props;

  if (hidden) return <div style={{ display: 'none' }}>{children}</div>;

  // 에러 메시지 한글화
  const translatedErrors = errors
    ? React.cloneElement(errors, {
        children:
          errors.props.children?.map?.((error) => {
            if (typeof error === 'string') {
              return error.replace(
                /must have required property '([^']+)'/,
                (match, fieldId) => {
                  const fieldMessages = {
                    receiver_sign: '수령자 서명이 필요합니다.',
                    agreement_check:
                      '위 내용을 확인하였으며 이에 동의해주세요.',
                  };
                  return fieldMessages[fieldId] || match;
                },
              );
            }
            return error;
          }) || errors.props.children,
      })
    : null;

  return (
    <div className={`${styles.tableRow} ${classNames || ''}`} id={id}>
      <div className={styles.cellLabel}>
        <span>{label}</span>
        {required ? <span className={styles.required}>*</span> : null}
      </div>
      <div className={styles.cellControl}>
        {children}
        {translatedErrors}
        {help}
      </div>
    </div>
  );
}

function DescriptionField() {
  return null;
}

export default function FormRenderer({
  schema,
  uiSchema,
  formData,
  onSubmit,
  onSaveDraft,
  onChange,
  readOnly = false,
  onComplete,
}) {
  const docDescription = schema?.description;
  const [currentFormData, setCurrentFormData] = React.useState(formData || {});
  // LookupWidget에서 관련 필드 데이터를 받을 때까지 임시 저장
  const pendingRelatedFieldsRef = React.useRef({});

  // 외부 formData prop이 변경되면 동기화
  React.useEffect(() => {
    setCurrentFormData(formData || {});
    pendingRelatedFieldsRef.current = {};
  }, [formData]);

  // LookupWidget에서 관련 필드 정보를 받으면 pending에 저장
  const handleRelatedFieldsReady = React.useCallback((relatedData) => {
    pendingRelatedFieldsRef.current = relatedData;
  }, []);

  return (
    <div>
      {/* <div className={styles.docHeader}>
        <div className={styles.docTitleBlock}>
          <p className={styles.docLabel}>문서명</p>
          <h2 className={styles.docTitle}>{docTitle}</h2>
        </div>
        <div className={styles.docStamp}>서명/날인</div>
      </div> */}
      <Form
        className={styles.rjsfForm}
        templates={{
          ObjectFieldTemplate,
          FieldTemplate: TableFieldTemplate,
          DescriptionField,
        }}
        widgets={{
          signature: SignatureWidget,
          lookup: LookupWidget,
          document: DocumentWidget,
        }}
        formContext={{
          onRelatedFieldsReady: handleRelatedFieldsReady,
        }}
        schema={schema}
        uiSchema={uiSchema}
        formData={currentFormData}
        validator={validator}
        disabled={readOnly}
        readonly={readOnly}
        noHtml5Validate
        onChange={(e) => {
          // RJSF formData와 pending related fields를 병합하여 즉시 업데이트
          const merged = {
            ...e.formData,
            ...pendingRelatedFieldsRef.current,
          };
          pendingRelatedFieldsRef.current = {};

          setCurrentFormData(merged);
          if (onChange) {
            onChange(merged);
          }
        }}
        onSubmit={(e) => {
          onSubmit && onSubmit(currentFormData);
        }}
      >
        {!readOnly ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => onSaveDraft && onSaveDraft(currentFormData)}
            >
              저장
            </button>
            <button type="submit" className={styles.primary}>
              제출
            </button>
          </div>
        ) : (
          <></>
        )}
      </Form>
      {docDescription ? (
        <div className={styles.docDescription}>{docDescription}</div>
      ) : null}
    </div>
  );
}
