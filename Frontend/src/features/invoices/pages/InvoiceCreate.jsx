import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useFieldArray } from 'react-hook-form';
import gsap from 'gsap';
import { invoiceApi } from '../services/invoice.api.js';
import BackButton from '../../../shared/components/BackButton.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/invoices.scss';

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InvoiceCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef(null);

  const [meta, setMeta] = useState({ customers: [], products: [], orders: [] });
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      customerId: '',
      orderId: '',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      items: [
        {
          product_variant_id: '',
          product_name: '',
          sku: '',
          quantity: 1,
          unit_price: 0,
          tax_percentage: 18,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items') || [];

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setIsLoadingMeta(true);
        setError(null);
        const metaData = await invoiceApi.getMeta();
        if (metaData) {
          setMeta(metaData);
          if (metaData.customers?.length > 0) {
            setValue('customerId', metaData.customers[0].id);
          }
          if (metaData.products?.length > 0) {
            const firstP = metaData.products[0];
            setValue('items.0.product_variant_id', firstP.variant_id || firstP.id);
            setValue('items.0.product_name', firstP.product_name || firstP.name);
            setValue('items.0.sku', firstP.sku || firstP.product_name || firstP.name);
            setValue('items.0.unit_price', parseFloat(firstP.selling_price || firstP.base_price) || 0);
            setValue('items.0.tax_percentage', parseFloat(firstP.tax_percentage) || 18);
          }
        }
      } catch (err) {
        console.error('Failed to load invoice creation metadata:', err);
        setError('Failed to load customers and products metadata.');
      } finally {
        setIsLoadingMeta(false);
      }
    };
    fetchMeta();
  }, [setValue]);

  // GSAP Entrance Animation
  useEffect(() => {
    if (isLoadingMeta || !formRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-stagger-item',
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.07,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        }
      );
    }, formRef);

    return () => ctx.revert();
  }, [isLoadingMeta]);

  const handleProductSelect = (index, productVariantId) => {
    const foundProduct = meta.products.find(
      (p) => String(p.variant_id || p.id) === String(productVariantId)
    );
    if (foundProduct) {
      setValue(`items.${index}.product_variant_id`, foundProduct.variant_id || foundProduct.id);
      setValue(`items.${index}.product_name`, foundProduct.product_name || foundProduct.name);
      setValue(`items.${index}.sku`, foundProduct.sku || foundProduct.product_name || foundProduct.name);
      setValue(`items.${index}.unit_price`, parseFloat(foundProduct.selling_price || foundProduct.base_price) || 0);
      setValue(`items.${index}.tax_percentage`, parseFloat(foundProduct.tax_percentage) || 18);
    }
  };

  const handleAddItem = () => {
    const firstP = meta.products[0] || {};
    append({
      product_variant_id: firstP.variant_id || firstP.id || '',
      product_name: firstP.product_name || firstP.name || '',
      sku: firstP.sku || '',
      quantity: 1,
      unit_price: parseFloat(firstP.selling_price || firstP.base_price) || 0,
      tax_percentage: parseFloat(firstP.tax_percentage) || 18,
    });
  };

  const subtotal = watchedItems.reduce((sum, it) => {
    const qty = parseInt(it?.quantity, 10) || 1;
    const price = parseFloat(it?.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxTotal = watchedItems.reduce((sum, it) => {
    const itemSub = (parseInt(it?.quantity, 10) || 1) * (parseFloat(it?.unit_price) || 0);
    return sum + (itemSub * (parseFloat(it?.tax_percentage) || 0)) / 100;
  }, 0);

  const grandTotal = subtotal + taxTotal;

  const onFormSubmit = async (formData) => {
    if (!formData.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await invoiceApi.createInvoice({
        customerId: formData.customerId,
        orderId: formData.orderId || null,
        dueDate: formData.dueDate,
        items: formData.items,
      });

      toast.success('Invoice created successfully!');
      if (res.data?.invoice?.id) {
        navigate(`/invoices/${res.data.invoice.id}`);
      } else {
        navigate('/invoices');
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
      toast.error(err.response?.data?.message || err.customMessage || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMeta) {
    return (
      <div className="df-invoices">
        <div className="df-invoices__container">
          <div className="df-invoices__loading">Loading customer and product catalog...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-invoices" ref={formRef}>
      <div className="df-invoices__container">
        <div className="gsap-stagger-item" style={{ marginBottom: '1rem' }}>
          <BackButton to="/invoices" label="Back to Invoices" />
        </div>

        <div className="df-invoices__header gsap-stagger-item">
          <div className="df-invoices__title-row">
            <div>
              <h1 className="df-invoices__title">Create New Invoice</h1>
              <p className="df-invoices__subtitle">
                Generate standard enterprise invoices with live product catalog and automated tax calculation
              </p>
            </div>
          </div>
        </div>

        {error && <div className="df-invoices__empty gsap-stagger-item">{error}</div>}

        <form onSubmit={handleSubmit(onFormSubmit)}>
          {/* Card 1: Invoice Header Parameters */}
          <div className="df-invoices__create-card gsap-stagger-item">
            <div className="df-invoices__form-grid">
              <div className="df-invoices__field">
                <label>
                  Select Customer <span className="required">*</span>
                </label>
                <select {...register('customerId', { required: 'Customer is required' })}>
                  {meta.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.email || 'No email'})
                    </option>
                  ))}
                </select>
                {errors.customerId && <span className="error-msg">{errors.customerId.message}</span>}
              </div>

              <div className="df-invoices__field">
                <label>Link Confirmed Order (Optional)</label>
                <select {...register('orderId')}>
                  <option value="">Direct Invoice (No Order Link)</option>
                  {meta.orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="df-invoices__field">
                <label>
                  Payment Due Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  {...register('dueDate', { required: 'Due date is required' })}
                />
                {errors.dueDate && <span className="error-msg">{errors.dueDate.message}</span>}
              </div>
            </div>
          </div>

          {/* Card 2: Line Items Table */}
          <div className="df-invoices__section-header gsap-stagger-item">
            <h2 className="df-invoices__section-title">Invoice Line Items</h2>
            <button
              type="button"
              className="df-invoices__btn-download"
              onClick={handleAddItem}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Line Item
            </button>
          </div>

          <div className="df-invoices__table-wrapper gsap-stagger-item">
            <table className="df-invoices__table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Product / SKU</th>
                  <th style={{ width: '12%' }}>Quantity</th>
                  <th style={{ width: '18%' }}>Unit Price</th>
                  <th style={{ width: '12%' }}>Tax %</th>
                  <th style={{ width: '14%' }}>Line Total</th>
                  <th style={{ width: '4%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const currentItem = watchedItems[idx] || {};
                  const lineSub = (parseInt(currentItem.quantity, 10) || 1) * (parseFloat(currentItem.unit_price) || 0);
                  const lineTax = (lineSub * (parseFloat(currentItem.tax_percentage) || 0)) / 100;
                  const itemTotal = lineSub + lineTax;

                  return (
                    <tr key={field.id}>
                      <td>
                        <select
                          className="df-invoices__table-select"
                          {...register(`items.${idx}.product_variant_id`, { required: true })}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                        >
                          {meta.products.map((p) => (
                            <option key={p.variant_id || p.id} value={p.variant_id || p.id}>
                              {p.product_name || p.name} ({p.sku}) — {formatCurrency(p.selling_price || p.base_price)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="df-invoices__table-input"
                          {...register(`items.${idx}.quantity`, { required: true, min: 1 })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="df-invoices__table-input"
                          {...register(`items.${idx}.unit_price`, { required: true, min: 0 })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          className="df-invoices__table-input"
                          {...register(`items.${idx}.tax_percentage`, { min: 0 })}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#18181b', fontSize: '0.875rem' }}>
                          {formatCurrency(itemTotal)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            className="df-invoices__btn-remove-row"
                            onClick={() => remove(idx)}
                            title="Remove item"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Card 3: Totals & Submit */}
          <div className="df-invoices__totals-bar gsap-stagger-item">
            <div className="df-invoices__totals-group">
              <div className="df-invoices__total-item">
                <span className="label">Subtotal</span>
                <span className="value">{formatCurrency(subtotal)}</span>
              </div>
              <div className="df-invoices__total-item">
                <span className="label">Estimated Tax (GST)</span>
                <span className="value">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="df-invoices__total-item">
                <span className="label">Grand Total</span>
                <span className="value value--grand">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="df-invoices__form-actions">
              <button
                type="button"
                className="df-invoices__btn-download"
                onClick={() => navigate('/invoices')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="df-cta-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Issuing Invoice...' : 'Create & Issue Invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(InvoiceCreate);

