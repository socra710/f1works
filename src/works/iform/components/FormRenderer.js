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
    uiSchema,
  } = props;

  const hideLabel = uiSchema?.['ui:options']?.hideLabel;
  const isDocumentField = uiSchema?.['ui:widget'] === 'document';
  const pageBreakBefore = uiSchema?.['ui:options']?.pageBreakBefore;

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
    <div
      className={`${styles.tableRow} ${
        isDocumentField ? styles.documentRow : ''
      } ${pageBreakBefore ? styles.pageBreakBefore : ''} ${classNames || ''}`}
      id={id}
    >
      {!hideLabel ? (
        <div className={styles.cellLabel}>
          <span>{label}</span>
          {required ? <span className={styles.required}>*</span> : null}
        </div>
      ) : null}
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
  const formRef = React.useRef(null);
  const originalTextareaStylesRef = React.useRef(new Map());
  const printMirrorsRef = React.useRef([]);
  const isPrintingRef = React.useRef(false);
  // LookupWidget에서 관련 필드 데이터를 받을 때까지 임시 저장
  const pendingRelatedFieldsRef = React.useRef({});

  // 외부 formData prop이 변경되면 동기화
  React.useEffect(() => {
    setCurrentFormData(formData || {});
    pendingRelatedFieldsRef.current = {};
  }, [formData]);

  const expandTextareas = React.useCallback(() => {
    const container = formRef.current;
    if (!container) return;
    const textareas = container.querySelectorAll('textarea');
    const nextMap = new Map();
    textareas.forEach((textarea) => {
      nextMap.set(textarea, {
        height: textarea.style.height,
        overflow: textarea.style.overflow,
        maxHeight: textarea.style.maxHeight,
        resize: textarea.style.resize,
        boxSizing: textarea.style.boxSizing,
      });
      const applySize = () => {
        textarea.style.height = 'auto';
        textarea.style.overflow = 'hidden';
        textarea.style.maxHeight = 'none';
        textarea.style.resize = 'none';
        textarea.style.boxSizing = 'border-box';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };

      applySize();
      requestAnimationFrame(applySize);
      setTimeout(applySize, 0);
    });
    originalTextareaStylesRef.current = nextMap;
  }, []);

  const restoreTextareas = React.useCallback(() => {
    const map = originalTextareaStylesRef.current;
    if (!map || !map.size) return;
    map.forEach((styles, textarea) => {
      textarea.style.height = styles.height || '';
      textarea.style.overflow = styles.overflow || '';
      textarea.style.maxHeight = styles.maxHeight || '';
      textarea.style.resize = styles.resize || '';
      textarea.style.boxSizing = styles.boxSizing || '';
    });
    originalTextareaStylesRef.current = new Map();
  }, []);

  const createPrintMirrors = React.useCallback(() => {
    const container = formRef.current;
    if (!container) return;
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;

    container
      .querySelectorAll('[data-print-mirror="true"]')
      .forEach((node) => node.parentNode?.removeChild(node));

    const textareas = container.querySelectorAll('textarea');
    const mirrors = [];

    textareas.forEach((textarea) => {
      const computed = window.getComputedStyle(textarea);
      const mirror = document.createElement('div');

      mirror.setAttribute('data-print-mirror', 'true');
      mirror.textContent = textarea.value || '';

      Object.assign(mirror.style, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        color: computed.color,
        padding: '0',
        margin: '0',
        background: 'transparent',
        border: 'none',
      });

      const originalDisplay = textarea.style.display;
      textarea.style.display = 'none';
      textarea.insertAdjacentElement('afterend', mirror);
      mirrors.push({ textarea, mirror, display: originalDisplay });
    });

    printMirrorsRef.current = mirrors;
  }, []);

  const restorePrintMirrors = React.useCallback(() => {
    const mirrors = printMirrorsRef.current || [];
    mirrors.forEach(({ textarea, mirror, display }) => {
      if (mirror && mirror.parentNode) {
        mirror.parentNode.removeChild(mirror);
      }
      if (textarea) {
        textarea.style.display = display || '';
      }
    });
    printMirrorsRef.current = [];
    isPrintingRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!readOnly) return;
    expandTextareas();
    return () => restoreTextareas();
  }, [readOnly, currentFormData, expandTextareas, restoreTextareas]);

  React.useEffect(() => {
    const handleBeforePrint = () => {
      expandTextareas();
      createPrintMirrors();
    };
    const handleAfterPrint = () => {
      restorePrintMirrors();
      restoreTextareas();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    const mediaQuery = window.matchMedia('print');
    const handleMediaChange = (event) => {
      if (event.matches) {
        expandTextareas();
        createPrintMirrors();
      } else {
        restorePrintMirrors();
        restoreTextareas();
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, [
    expandTextareas,
    restoreTextareas,
    createPrintMirrors,
    restorePrintMirrors,
  ]);

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
      <div ref={formRef}>
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
      </div>
      {docDescription ? (
        <div className={styles.docDescription}>{docDescription}</div>
      ) : null}
    </div>
  );
}
