import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import styles from './SignatureWidget.module.css';

export default function SignatureWidget(props) {
  const { value, onChange, readonly, disabled } = props;
  const sigRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(!!value);

  const handleClear = () => {
    if (sigRef.current) {
      sigRef.current.clear();
      onChange('');
      setHasSignature(false);
    }
  };

  const handleEnd = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;

    // JPEG는 투명 배경을 검정으로 깔기 때문에 흰 배경 캔버스에 그려서 추출
    const srcCanvas = sigRef.current.getCanvas();
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = srcCanvas.width;
    exportCanvas.height = srcCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(srcCanvas, 0, 0);

    // PNG로 저장해 원본 그대로 보존 (투명/흰 배경 유지)
    const dataUrl = exportCanvas.toDataURL('image/png');
    onChange(dataUrl);
    setHasSignature(true);
  };

  React.useEffect(() => {
    if (value && sigRef.current && !hasSignature) {
      try {
        sigRef.current.fromDataURL(value);
        setHasSignature(true);
      } catch (e) {
        console.error('Failed to load signature:', e);
      }
    }
  }, [value, hasSignature]);

  if (readonly || disabled) {
    return value ? (
      <div className={styles.signaturePreview}>
        <img src={value} alt="서명" className={styles.signatureImage} />
      </div>
    ) : (
      <div className={styles.signatureEmpty}>서명 없음</div>
    );
  }

  return (
    <div className={styles.signatureWrapper}>
      <div className={styles.canvasContainer}>
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            className: styles.signatureCanvas,
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className={styles.signatureActions}>
        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
        >
          지우기
        </button>
        <span className={styles.hint}>마우스나 터치로 서명해주세요</span>
      </div>
    </div>
  );
}
