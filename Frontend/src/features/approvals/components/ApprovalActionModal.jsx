import React, { memo } from 'react';
import { useForm } from 'react-hook-form';

export const ApprovalActionModal = memo(({ isOpen, onClose, actionType, onConfirm, isSubmitting }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      reason: '',
    },
  });

  if (!isOpen) return null;

  const isReject = actionType === 'reject';
  const isReturn = actionType === 'return_revision';
  const isApprove = actionType === 'approve';

  const actionTitle = isApprove
    ? 'Approve Quotation'
    : isReturn
    ? 'Return Quotation for Revision'
    : 'Reject Quotation';

  const actionDescription = isApprove
    ? 'Confirm discount approval for this quotation and move to next stage / confirmed.'
    : isReturn
    ? 'Send quotation back to sales rep with feedback and discount adjustments.'
    : 'Permanently decline discount approval for this quotation.';

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (formData) => {
    onConfirm({ action: actionType, reason: formData.reason });
  };

  return (
    <div className="df-approval-modal__backdrop" onClick={handleClose}>
      <div className="df-approval-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="df-approval-modal__header">
          <div className="df-approval-modal__header-left">
            <span
              className={`df-approval-modal__badge df-approval-modal__badge--${
                isApprove ? 'approve' : isReturn ? 'return' : 'reject'
              }`}
            >
              {actionType?.toUpperCase()}
            </span>
            <h3 className="df-approval-modal__title">{actionTitle}</h3>
          </div>
          <button
            type="button"
            className="df-approval-modal__close-btn"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>

        <p className="df-approval-modal__desc">{actionDescription}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="df-approval-modal__form">
          <div className="df-approval-modal__field">
            <label className="df-approval-modal__label">
              Decision Note / Justification {isReturn || isReject ? '*' : '(Optional)'}
            </label>
            <textarea
              {...register('reason', {
                required: isReturn || isReject ? 'Please provide a reason or note for this decision' : false,
                minLength: isReturn || isReject ? { value: 5, message: 'Reason must be at least 5 characters' } : undefined,
              })}
              placeholder={
                isApprove
                  ? 'Add an optional note for the audit trail (e.g. Approved within quarterly quota)...'
                  : isReturn
                  ? 'Specify required margin adjustments or line item corrections...'
                  : 'State reason for rejecting this quotation discount...'
              }
              rows={4}
              className={`df-approval-modal__textarea ${errors.reason ? 'df-approval-modal__textarea--error' : ''}`}
            />
            {errors.reason && (
              <span className="df-approval-modal__error-msg">{errors.reason.message}</span>
            )}
          </div>

          <div className="df-approval-modal__actions">
            <button
              type="button"
              className="df-approval-modal__btn df-approval-modal__btn--cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`df-approval-modal__btn df-approval-modal__btn--${
                isApprove ? 'approve' : isReturn ? 'return' : 'reject'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : actionTitle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ApprovalActionModal;
