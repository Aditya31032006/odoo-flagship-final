import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useFieldArray } from 'react-hook-form';
import { invoiceApi } from '../services/invoice.api.js';
import '../styles/invoices.scss';

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InvoiceCreate = () => {
  const navigate = useNavigate();

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
    reset,
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
          const defaultCustId = metaData.customers?.length > 0 ? metaData.customers[0].id : '';
          const firstP = metaData.products?.length > 0 ? metaData.products[0] : null;

          reset({
            customerId: defaultCustId,
            orderId: '',
            dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            items: firstP
              ? [
                  {
                    product_variant_id: firstP.variant_id,
                    product_name: firstP.product_name,
                    sku: firstP.sku,
                    quantity: 1,
                    unit_price: parseFloat(firstP.selling_price) || 0,
                    tax_percentage: parseFloat(firstP.tax_percentage) || 18,
                  },
                ]
              : [
                  {
                    product_variant_id: '',
                    product_name: '',
                    sku: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_percentage: 18,
                  },
                ],
          });
        }
      } catch (err) {
        console.error('Failed to load invoice metadata:', err);
        setError('Failed to fetch customers and products from database.');
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMeta();
  }, [reset]);

  const handleProductSelect = (index, variantId) => {
    const selectedProd = meta.products.find((p) => String(p.variant_id) === String(variantId));
    if (!selectedProd) return;

    setValue(`items.${index}.product_variant_id`, variantId);
    setValue(`items.${index}.product_name`, selectedProd.product_name);
    setValue(`items.${index}.sku`, selectedProd.sku);
    setValue(`items.${index}.unit_price`, parseFloat(selectedProd.selling_price) || 0);
    setValue(`items.${index}.tax_percentage`, parseFloat(selectedProd.tax_percentage) || 18);
  };

  const handleAddItem = () => {
    const firstP = meta.products[0] || {};
    append({
      product_variant_id: firstP.variant_id || '',
      product_name: firstP.product_name || '',
      sku: firstP.sku || '',
      quantity: 1,
      unit_price: parseFloat(firstP.selling_price) || 0,
      tax_percentage: parseFloat(firstP.tax_percentage) || 18,
    });
  };

  // Calculate dynamic totals from watched form values
  const subtotal = watchedItems.reduce((sum, it) => {
    return sum + (parseInt(it?.quantity, 10) || 1) * (parseFloat(it?.unit_price) || 0);
  }, 0);

  const taxTotal = watchedItems.reduce((sum, it) => {
    const itemSub = (parseInt(it?.quantity, 10) || 1) * (parseFloat(it?.unit_price) || 0);
    return sum + (itemSub * (parseFloat(it?.tax_percentage) || 0)) / 100;
  }, 0);

  const grandTotal = subtotal + taxTotal;

  const onFormSubmit = async (formData) => {
    if (!formData.customerId) {
      alert('Please select a customer');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      alert('Please add at least one line item');
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

      alert('Invoice created successfully in database!');
      if (res.data?.invoice?.id) {
        navigate(`/invoices/${res.data.invoice.id}`);
      } else {
        navigate('/invoices');
      }
    } catch (err) {
      console.error('Failed to create invoice:', err);
      alert(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMeta) {
    return (
      <div className="df-invoices">
        <div className="df-invoices__container">
          <div className="df-invoices__loading">Loading customer and catalog metadata...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-invoices">
      <div className="df-invoices__container">
        {/* Header */}
        <div className="df-invoices__header">
          <div className="df-invoices__title-row">
            <div>
              <h1 className="df-invoices__title">Create New Invoice</h1>
              <p className="df-invoices__subtitle">
                Generate one-time and recurring invoices with live customer and product catalog
              </p>
            </div>
            <button
              type="button"
              className="df-invoices__back-btn"
              onClick={() => navigate('/invoices')}
            >
              ← Back to Invoices
            </button>
          </div>
        </div>

        {error && <div className="df-invoices__empty">{error}</div>}

        <form onSubmit={handleSubmit(onFormSubmit)}>
          {/* Card 1: Invoice Header Parameters */}
          <div
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <div className="df-sub-modal__field">
              <label>Select Customer *</label>
              <select {...register('customerId', { required: 'Customer is required' })}>
                {meta.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.email || 'No email'})
                  </option>
                ))}
              </select>
              {errors.customerId && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.customerId.message}</span>}
            </div>

            <div className="df-sub-modal__field">
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

            <div className="df-sub-modal__field">
              <label>Payment Due Date *</label>
              <input
                type="date"
                {...register('dueDate', { required: 'Due date is required' })}
              />
              {errors.dueDate && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.dueDate.message}</span>}
            </div>
          </div>

          {/* Card 2: Line Items Table */}
          <div className="df-invoices__section-header">
            <h2 className="df-invoices__section-title">Invoice Line Items</h2>
            <button
              type="button"
              className="df-invoices__btn-download"
              onClick={handleAddItem}
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }}
            >
              + Add Line Item
            </button>
          </div>

          <div className="df-invoices__table-wrapper">
            <table className="df-invoices__table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Product / SKU</th>
                  <th style={{ width: '12%' }}>Quantity</th>
                  <th style={{ width: '18%' }}>Unit Price ($)</th>
                  <th style={{ width: '12%' }}>Tax %</th>
                  <th style={{ width: '14%' }}>Line Total</th>
                  <th style={{ width: '6%' }}>Action</th>
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
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '0.375rem',
                            padding: '0.5rem',
                          }}
                          {...register(`items.${idx}.product_variant_id`, { required: true })}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                        >
                          {meta.products.map((p) => (
                            <option key={p.variant_id} value={p.variant_id}>
                              {p.product_name} ({p.sku}) — ${p.selling_price}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '0.375rem',
                            padding: '0.5rem',
                          }}
                          {...register(`items.${idx}.quantity`, { required: true, min: 1 })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '0.375rem',
                            padding: '0.5rem',
                          }}
                          {...register(`items.${idx}.unit_price`, { required: true, min: 0 })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            borderRadius: '0.375rem',
                            padding: '0.5rem',
                          }}
                          {...register(`items.${idx}.tax_percentage`, { min: 0 })}
                        />
                      </td>
                      <td>
                        <strong>{formatCurrency(itemTotal)}</strong>
                      </td>
                      <td>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#fb7185',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            ✕
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
          <div
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>
                  {formatCurrency(subtotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Estimated Tax</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f8fafc' }}>
                  {formatCurrency(taxTotal)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Grand Total</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(grandTotal)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className="df-invoices__btn-download"
                onClick={() => navigate('/invoices')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="df-invoices__btn-payment"
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
