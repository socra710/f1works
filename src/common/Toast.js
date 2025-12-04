import React, { useState, useCallback } from 'react';
import './Toast.css';

/**
 * 토스트 컨텍스트 생성
 */
export const ToastContext = React.createContext();

/**
 * 토스트 제공자 컴포넌트
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const closeAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, closeAll }}>
      <DialogProvider>
        {children}
        <Toast toasts={toasts} removeToast={removeToast} />
      </DialogProvider>
    </ToastContext.Provider>
  );
}

/**
 * 토스트 훅
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * 다이얼로그 컨텍스트 생성
 */
export const DialogContext = React.createContext();

/**
 * 다이얼로그 프로바이더
 */
export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = React.useState([]);

  const showDialog = React.useCallback((options) => {
    const {
      title = '확인',
      message = '',
      okText = '확인',
      cancelText = '취소',
      onOk = () => {},
      onCancel = () => {},
      type = 'confirm', // 'confirm', 'alert'
      hasInput = false,
      inputPlaceholder = '',
      inputValue = '',
    } = options;

    const id = Date.now();
    const dialog = {
      id,
      title,
      message,
      okText,
      cancelText,
      onOk,
      onCancel,
      type,
      hasInput,
      inputPlaceholder,
      inputValue: inputValue || '',
    };

    setDialogs((prev) => [...prev, dialog]);

    return id;
  }, []);

  const closeDialog = React.useCallback((id) => {
    setDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <DialogContext.Provider value={{ showDialog, closeDialog }}>
      {children}
      <Dialog dialogs={dialogs} closeDialog={closeDialog} />
    </DialogContext.Provider>
  );
}

/**
 * 다이얼로그 훅
 */
export function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

/**
 * 토스트 UI 컴포넌트
 */
function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-message">{toast.message}</div>
          <button
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * 다이얼로그 UI 컴포넌트
 */
function Dialog({ dialogs, closeDialog }) {
  const [inputValues, setInputValues] = React.useState({});

  const handleInputChange = (dialogId, value) => {
    setInputValues((prev) => ({
      ...prev,
      [dialogId]: value,
    }));
  };

  return (
    <>
      {dialogs.map((dialog) => (
        <DialogOverlay key={dialog.id}>
          <DialogContent>
            <DialogHeader>{dialog.title}</DialogHeader>
            <DialogBody>
              {dialog.message}
              {dialog.hasInput && (
                <input
                  type="text"
                  className="dialog-input"
                  placeholder={dialog.inputPlaceholder}
                  value={inputValues[dialog.id] || dialog.inputValue || ''}
                  onChange={(e) => handleInputChange(dialog.id, e.target.value)}
                  autoFocus
                />
              )}
            </DialogBody>
            <DialogFooter>
              {dialog.type === 'confirm' && (
                <button
                  className="dialog-button dialog-ok"
                  onClick={() => {
                    const inputValue =
                      inputValues[dialog.id] || dialog.inputValue || '';
                    dialog.onOk(inputValue);
                    setInputValues((prev) => {
                      const newValues = { ...prev };
                      delete newValues[dialog.id];
                      return newValues;
                    });
                    closeDialog(dialog.id);
                  }}
                >
                  {dialog.okText}
                </button>
              )}
              <button
                className="dialog-button dialog-cancel"
                onClick={() => {
                  dialog.onCancel();
                  setInputValues((prev) => {
                    const newValues = { ...prev };
                    delete newValues[dialog.id];
                    return newValues;
                  });
                  closeDialog(dialog.id);
                }}
              >
                {dialog.cancelText}
              </button>
            </DialogFooter>
          </DialogContent>
        </DialogOverlay>
      ))}
    </>
  );
}

/**
 * 다이얼로그 오버레이 (배경)
 */
function DialogOverlay({ children }) {
  return <div className="dialog-overlay">{children}</div>;
}

/**
 * 다이얼로그 컨텐츠
 */
function DialogContent({ children }) {
  return <div className="dialog-content">{children}</div>;
}

/**
 * 다이얼로그 헤더
 */
function DialogHeader({ children }) {
  return <div className="dialog-header">{children}</div>;
}

/**
 * 다이얼로그 바디
 */
function DialogBody({ children }) {
  return <div className="dialog-body">{children}</div>;
}

/**
 * 다이얼로그 푸터
 */
function DialogFooter({ children }) {
  return <div className="dialog-footer">{children}</div>;
}
