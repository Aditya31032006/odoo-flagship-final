import React from 'react';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/toast.scss';

export const ConfirmModal = () => {
  const { confirmDialog, handleConfirmClose } = useToast();

  if (!confirmDialog.isOpen) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
  } = confirmDialog;

  return (
    <div className="df-confirm-backdrop" onClick={() => handleConfirmClose(false)}>
      <div className="df-confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="df-confirm__header">
          <div className={`df-confirm-modal__icon df-confirm-modal__icon--${type}`}>
            {type === 'danger' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {type === 'warning' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {type === 'info' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="df-confirm-modal__title">{title}</h3>
            <p className="df-confirm-modal__message">{message}</p>
          </div>
        </div>

        <div className="df-confirm-modal__actions">
          <button
            type="button"
            className="df-confirm-modal__btn df-confirm-modal__btn--cancel"
            onClick={() => handleConfirmClose(false)}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`df-confirm-modal__btn df-confirm-modal__btn--${type}`}
            onClick={() => handleConfirmClose(true)}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
