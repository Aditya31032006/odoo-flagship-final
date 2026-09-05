import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useFieldArray } from 'react-hook-form';

export const ManualOverrideModal = ({
  isOpen,
  onClose,
  totalRequired = 0,
  productName = '',
  warehouses = [],
  currentSplits = [],
  onConfirm,
  isSaving,
}) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      allocations: warehouses.map((w) => {
        const existing = currentSplits.find((s) => s.warehouse_id === w.id);
        return {
          warehouse_id: w.id,
          warehouse_name: w.name,
          quantity: existing ? existing.qty_fulfilled : 0,
        };
      }),
      backorderQty: 0,
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'allocations',
  });

  useEffect(() => {
    if (isOpen && warehouses.length > 0) {
      reset({
        allocations: warehouses.map((w) => {
          const existing = currentSplits.find((s) => s.warehouse_id === w.id);
          return {
            warehouse_id: w.id,
            warehouse_name: w.name,
            quantity: existing ? existing.qty_fulfilled : 0,
          };
        }),
        backorderQty: 0,
      });
    }
  }, [isOpen, warehouses, currentSplits, reset]);

  if (!isOpen) return null;

  const watchedAllocations = watch('allocations') || [];
  const totalAllocated = watchedAllocations.reduce(
    (sum, a) => sum + (parseInt(a?.quantity, 10) || 0),
    0
  );
  const remainingNeeded = Math.max(0, totalRequired - totalAllocated);

  const onSubmit = (data) => {
    const formattedSplits = data.allocations
      .filter((a) => parseInt(a.quantity, 10) > 0)
      .map((a) => ({
        warehouse_id: a.warehouse_id,
        quantity: parseInt(a.quantity, 10),
      }));

    onConfirm(formattedSplits, remainingNeeded);
  };

  const modalContent = (
    <div className="df-modal-backdrop" onClick={onClose}>
      <div className="df-fulfillment-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="df-fulfillment-modal__header">
          <div>
            <h3 className="df-fulfillment-modal__title">Manual Warehouse Split Override</h3>
            <span className="df-fulfillment-modal__subtitle">
              Allocate {totalRequired} units of <strong>{productName}</strong> across warehouses
            </span>
          </div>
          <button
            type="button"
            className="df-fulfillment-modal__close-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="df-fulfillment-modal__form">
          <div className="df-fulfillment-modal__allocations-list">
            {fields.map((field, idx) => (
              <div key={field.id} className="df-fulfillment-modal__wh-row">
                <div className="df-fulfillment-modal__wh-info">
                  <span className="df-fulfillment-modal__wh-name">
                    {warehouses[idx]?.name || `Warehouse #${field.warehouse_id}`}
                  </span>
                  <span className="df-fulfillment-modal__wh-code">
                    {warehouses[idx]?.code}
                  </span>
                </div>

                <div className="df-fulfillment-modal__wh-input-col">
                  <label className="df-fulfillment-modal__input-label">Units to Fulfill</label>
                  <input
                    type="number"
                    min="0"
                    max={totalRequired}
                    {...register(`allocations.${idx}.quantity`, {
                      valueAsNumber: true,
                      min: 0,
                    })}
                    className="df-fulfillment-modal__input"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Allocation summary status */}
          <div className="df-fulfillment-modal__summary-card">
            <div className="df-fulfillment-modal__summary-row">
              <span>Total Required:</span>
              <strong>{totalRequired} units</strong>
            </div>
            <div className="df-fulfillment-modal__summary-row">
              <span>Allocated across Warehouses:</span>
              <strong className="df-fulfillment-modal__highlight-allocated">
                {totalAllocated} units
              </strong>
            </div>
            <div className="df-fulfillment-modal__summary-row">
              <span>Remaining for Backorder:</span>
              <strong className={remainingNeeded > 0 ? 'df-fulfillment-modal__highlight-backorder' : 'df-fulfillment-modal__highlight-ok'}>
                {remainingNeeded} units {remainingNeeded > 0 ? '(Auto-logged to Backorders)' : '(Fully Fulfilled)'}
              </strong>
            </div>
          </div>

          <div className="df-fulfillment-modal__actions">
            <button
              type="button"
              className="df-fulfillment-modal__btn df-fulfillment-modal__btn--cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="df-fulfillment-modal__btn df-fulfillment-modal__btn--submit"
              disabled={isSaving || totalAllocated === 0}
            >
              {isSaving ? 'Saving Split...' : 'Save Manual Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ManualOverrideModal;
