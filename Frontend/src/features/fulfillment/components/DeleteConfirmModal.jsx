import React from 'react';
import { createPortal } from 'react-dom';

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="df-modal-backdrop" onClick={onClose}>
      <div className="df-fulfillment-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="df-fulfillment-modal__header">
          <div>
            <h3 className="df-fulfillment-modal__title">{title}</h3>
          </div>
          <button type="button" className="df-fulfillment-modal__close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <p className="df-fulfillment-modal__delete-msg">{message}</p>

        <div className="df-fulfillment-modal__actions">
          <button
            type="button"
            className="df-fulfillment-modal__btn df-fulfillment-modal__btn--cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="df-fulfillment-modal__btn df-fulfillment-modal__btn--danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeleteConfirmModal;
