import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';

export const OrderModal = ({
  isOpen,
  onClose,
  initialData = null,
  customers = [],
  variants = [],
  warehouses = [],
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
      order_number: '',
      customer_id: '',
      product_variant_id: '',
      quantity: 1,
      warehouse_id: '',
      new_warehouse_name: '',
      new_warehouse_code: '',
      status: 'pending',
    },
  });

  const selectedWhId = watch('warehouse_id');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          order_number: initialData.order_number || '',
          customer_id: initialData.customer_id || '',
          product_variant_id: initialData.product_variant_id || variants[0]?.variant_id || '',
          quantity: initialData.total_quantity || 1,
          warehouse_id: initialData.warehouse_id || warehouses[0]?.id || '',
          new_warehouse_name: '',
          new_warehouse_code: '',
          status: initialData.status || 'pending',
        });
      } else {
        const orderSuffix = Math.floor(1000 + Math.random() * 9000);
        reset({
          order_number: `ORD-${new Date().getFullYear()}-${orderSuffix}`,
          customer_id: customers[0]?.id || '',
          product_variant_id: variants[0]?.variant_id || '',
          quantity: 1,
          warehouse_id: warehouses[0]?.id || (warehouses.length > 0 ? warehouses[0].id : 'NEW'),
          new_warehouse_name: '',
          new_warehouse_code: '',
          status: 'pending',
        });
      }
    }
  }, [isOpen, initialData, customers, variants, warehouses, reset]);

  if (!isOpen) return null;

  const onSubmit = (formData) => {
    const isNewWarehouse = formData.warehouse_id === 'NEW';
    const payload = {
      order_number: formData.order_number,
      customer_id: parseInt(formData.customer_id, 10),
      product_variant_id: parseInt(formData.product_variant_id, 10),
      quantity: parseInt(formData.quantity, 10) || 1,
      warehouse_id: isNewWarehouse ? null : parseInt(formData.warehouse_id, 10),
      warehouse_name: isNewWarehouse ? formData.new_warehouse_name : undefined,
      warehouse_code: isNewWarehouse ? formData.new_warehouse_code : undefined,
      status: formData.status,
    };
    onSave(payload, initialData?.order_id);
  };

  const modalContent = (
    <div className="df-modal-backdrop" onClick={onClose}>
      <div className="df-fulfillment-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="df-fulfillment-modal__header">
          <div>
            <h3 className="df-fulfillment-modal__title">
              {isEdit ? 'Update Fulfillment Order' : 'Create Order Awaiting Fulfillment'}
            </h3>
            <span className="df-fulfillment-modal__subtitle">
              {isEdit ? `Edit properties of ${initialData?.order_number}` : 'Add a new client order to the database fulfillment schedule'}
            </span>
          </div>
          <button type="button" className="df-fulfillment-modal__close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="df-fulfillment-modal__form">
          <div className="df-fulfillment-modal__grid-2">
            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">Order / Quotation # *</label>
              <input
                type="text"
                placeholder="e.g. ORD-2026-1050"
                {...register('order_number', { required: 'Order number is required' })}
                className="df-fulfillment-modal__input-text"
                disabled={isEdit}
              />
              {errors.order_number && (
                <span className="df-fulfillment-modal__error-text">{errors.order_number.message}</span>
              )}
            </div>

            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">Customer Company *</label>
              <select
                {...register('customer_id', { required: 'Customer is required' })}
                className="df-fulfillment-modal__select"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="df-fulfillment-modal__field">
            <label className="df-fulfillment-modal__label">Product / SKU Variant *</label>
            <select
              {...register('product_variant_id', { required: 'Product is required' })}
              className="df-fulfillment-modal__select"
            >
              {variants.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.product_name} — SKU: {v.sku} (₹{Number(v.price).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="df-fulfillment-modal__grid-2">
            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">Quantity to Fulfill *</label>
              <input
                type="number"
                min="1"
                {...register('quantity', {
                  required: 'Quantity is required',
                  valueAsNumber: true,
                  min: 1,
                })}
                className="df-fulfillment-modal__input-text"
              />
            </div>

            <div className="df-fulfillment-modal__field">
              <label className="df-fulfillment-modal__label">Initial Fulfillment Warehouse *</label>
              <select
                {...register('warehouse_id', { required: 'Please select a warehouse' })}
                className="df-fulfillment-modal__select"
                disabled={isEdit}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
                <option value="NEW">+ Add New Warehouse to Database...</option>
              </select>
            </div>
          </div>

          {selectedWhId === 'NEW' && !isEdit && (
            <div className="df-fulfillment-modal__grid-2">
              <div className="df-fulfillment-modal__field">
                <label className="df-fulfillment-modal__label">New Warehouse Name *</label>
                <input
                  type="text"
                  placeholder="e.g. West Coast Distribution Hub"
                  {...register('new_warehouse_name', { required: 'Warehouse name is required' })}
                  className="df-fulfillment-modal__input-text"
                />
                {errors.new_warehouse_name && (
                  <span className="df-fulfillment-modal__error-text">{errors.new_warehouse_name.message}</span>
                )}
              </div>
              <div className="df-fulfillment-modal__field">
                <label className="df-fulfillment-modal__label">Warehouse Code (e.g. WEST)</label>
                <input
                  type="text"
                  placeholder="e.g. WEST"
                  {...register('new_warehouse_code')}
                  className="df-fulfillment-modal__input-text"
                />
              </div>
            </div>
          )}

          <div className="df-fulfillment-modal__field">
            <label className="df-fulfillment-modal__label">Fulfillment Status</label>
            <select {...register('status')} className="df-fulfillment-modal__select">
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="partially_fulfilled">Partially Fulfilled</option>
              <option value="confirmed">Confirmed</option>
            </select>
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
              {isSaving ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default OrderModal;
