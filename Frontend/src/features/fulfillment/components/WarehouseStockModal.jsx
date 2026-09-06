import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';

export const WarehouseStockModal = ({
  isOpen,
  onClose,
  initialData = null,
  warehouses = [],
  variants = [],
  onSave,
  isSaving = false,
}) => {
  const isEdit = !!initialData;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      warehouse_id: '',
      new_warehouse_name: '',
      product_variant_id: '',
      quantity_on_hand: 10,
      quantity_reserved: 0,
      lead_time_days: 2,
    },
  });

  const selectedWhId = watch('warehouse_id');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          warehouse_id: initialData.warehouse_id ? String(initialData.warehouse_id) : '',
          new_warehouse_name: '',
          product_variant_id: initialData.product_variant_id ? String(initialData.product_variant_id) : '',
          quantity_on_hand: initialData.in_stock != null ? initialData.in_stock : 10,
          quantity_reserved: initialData.reserved != null ? initialData.reserved : 0,
          lead_time_days: initialData.lead_time_days != null ? initialData.lead_time_days : 2,
        });
      } else {
        reset({
          warehouse_id: warehouses[0]?.id || '',
          new_warehouse_name: '',
          product_variant_id: variants[0]?.variant_id || '',
          quantity_on_hand: 20,
          quantity_reserved: 0,
          lead_time_days: 2,
        });
      }
    }
  }, [isOpen, initialData, warehouses, variants, reset]);

  if (!isOpen) return null;

  const onSubmit = (formData) => {
    const payload = {
      warehouse_id: formData.warehouse_id === 'NEW' ? null : parseInt(formData.warehouse_id, 10),
      warehouse_name: formData.warehouse_id === 'NEW' ? formData.new_warehouse_name : undefined,
      product_variant_id: parseInt(formData.product_variant_id, 10),
      quantity_on_hand: parseInt(formData.quantity_on_hand, 10) || 0,
      quantity_reserved: parseInt(formData.quantity_reserved, 10) || 0,
      lead_time_days: parseInt(formData.lead_time_days, 10) || 2,
    };
    onSave(payload, initialData?.stock_id);
  };

  const modalContent = (
    <div className="df-modal-backdrop df-modal-backdrop--top" onClick={onClose}>
      <div className="df-fulfillment-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="df-fulfillment-modal__header">
          <div>
            <h3 className="df-fulfillment-modal__title">
              {isEdit ? 'Update Warehouse Stock' : 'Add Warehouse Stock'}
            </h3>
            <span className="df-fulfillment-modal__subtitle">
              {isEdit ? 'Modify on-hand stock and reservation limits' : 'Register available stock for a product variant at a warehouse'}
            </span>
          </div>
          <button type="button" className="df-fulfillment-modal__close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="df-fulfillment-modal__form">
          {/* Warehouse Selector */}
          <div className="df-fulfillment-modal__field">
            <label className="df-fulfillment-modal__label">Warehouse Facility *</label>
            <select
              {...register('warehouse_id', { required: 'Please select or add a warehouse' })}
              className="df-fulfillment-modal__select"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
              <option value="NEW">+ Add New Warehouse...</option>
            </select>
          </div>

          {selectedWhId === 'NEW' && (
            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">New Warehouse Name *</label>
              <input
                type="text"
                placeholder="e.g. West Coast Distribution"
                {...register('new_warehouse_name', { required: 'Warehouse name is required' })}
                className="df-fulfillment-modal__input-text"
              />
              {errors.new_warehouse_name && (
                <span className="df-fulfillment-modal__error-text">{errors.new_warehouse_name.message}</span>
              )}
            </div>
          )}

          {/* Product Variant Selector */}
          <div className="df-fulfillment-modal__field">
            <label className="df-fulfillment-modal__label">Product / SKU Variant *</label>
            <select
              {...register('product_variant_id', { required: 'Please select a product variant' })}
              className="df-fulfillment-modal__select"
            >
              {variants.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.product_name} — SKU: {v.sku}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Numbers Grid */}
          <div className="df-fulfillment-modal__grid-2">
            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">In Stock (On-Hand) *</label>
              <input
                type="number"
                min="0"
                {...register('quantity_on_hand', {
                  required: 'In Stock quantity is required',
                  valueAsNumber: true,
                  min: 0,
                })}
                className="df-fulfillment-modal__input-text"
              />
            </div>

            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">Reserved Units</label>
              <input
                type="number"
                min="0"
                {...register('quantity_reserved', {
                  valueAsNumber: true,
                  min: 0,
                })}
                className="df-fulfillment-modal__input-text"
              />
            </div>
          </div>

          <div className="df-fulfillment-modal__field">
            <label className="df-fulfillment-modal__label">Lead Time (Days)</label>
            <input
              type="number"
              min="1"
              max="60"
              {...register('lead_time_days', {
                valueAsNumber: true,
                min: 1,
              })}
              className="df-fulfillment-modal__input-text"
            />
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
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : isEdit ? 'Update Stock' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WarehouseStockModal;
