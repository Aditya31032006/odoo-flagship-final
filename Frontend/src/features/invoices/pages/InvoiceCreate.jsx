import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { invoiceApi } from '../services/invoice.api.js';
import '../styles/invoices.scss';

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const InvoiceCreate = () => {
  const navigate = useNavigate();

  const [meta, setMeta] = useState({ customers: [], products: [], orders: [] });
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
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
  });

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

          setForm((prev) => ({
            ...prev,
            customerId: defaultCustId,
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
              : prev.items,
          }));
        }
      } catch (err) {
        console.error('Failed to load invoice metadata:', err);
        setError('Failed to fetch customers and products from database.');
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMeta();
  }, []);

  const handleProductChange = (index, variantId) => {
    const selectedProd = meta.products.find((p) => String(p.variant_id) === String(variantId));
    if (!selectedProd) return;

    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        product_variant_id: variantId,
        product_name: selectedProd.product_name,
        sku: selectedProd.sku,
        unit_price: parseFloat(selectedProd.selling_price) || 0,
        tax_percentage: parseFloat(selectedProd.tax_percentage) || 18,
      };
      return { ...prev, items: updated };
    });
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const handleAddItem = () => {
    const firstP = meta.products[0] || {};
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_variant_id: firstP.variant_id || '',
          product_name: firstP.product_name || '',
          sku: firstP.sku || '',
          quantity: 1,
          unit_price: parseFloat(firstP.selling_price) || 0,
          tax_percentage: parseFloat(firstP.tax_percentage) || 18,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculate dynamic totals
  const subtotal = form.items.reduce((sum, it) => {
    return sum + (parseInt(it.quantity, 10) || 1) * (parseFloat(it.unit_price) || 0);
  }, 0);

  const taxTotal = form.items.reduce((sum, it) => {
    const itemSub = (parseInt(it.quantity, 10) || 1) * (parseFloat(it.unit_price) || 0);
    return sum + (itemSub * (parseFloat(it.tax_percentage) || 0)) / 100;
  }, 0);

  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerId) {
      alert('Please select a customer');
      return;
    }
    if (form.items.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await invoiceApi.createInvoice({
        customerId: form.customerId,
        orderId: form.orderId || null,
        dueDate: form.dueDate,
        items: form.items,
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

        <form onSubmit={handleSubmit}>
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
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                {meta.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>

            <div className="df-sub-modal__field">
              <label>Link Confirmed Order (Optional)</label>
              <select
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              >
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
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
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
                {form.items.map((item, idx) => {
                  const lineSub = (parseInt(item.quantity, 10) || 1) * (parseFloat(item.unit_price) || 0);
                  const lineTax = (lineSub * (parseFloat(item.tax_percentage) || 0)) / 100;
                  const itemTotal = lineSub + lineTax;

                  return (
                    <tr key={idx}>
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
                          value={item.product_variant_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
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
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
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
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
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
                          value={item.tax_percentage}
                          onChange={(e) => handleItemChange(idx, 'tax_percentage', e.target.value)}
                        />
                      </td>
                      <td>
                        <strong>{formatCurrency(itemTotal)}</strong>
                      </td>
                      <td>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
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
