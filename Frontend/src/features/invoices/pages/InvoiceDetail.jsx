import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { invoiceApi } from '../services/invoice.api.js';
import InvoicePrintModal from '../components/InvoicePrintModal.jsx';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import '../styles/invoices.scss';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const RecordPaymentModal = React.memo(({ isOpen, onClose, balanceDue, onRecordPayment, isSubmitting }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      amount: balanceDue > 0 ? balanceDue.toFixed(2) : '',
      paymentMethod: 'bank_transfer',
      transactionReference: '',
    },
  });

  if (!isOpen) return null;

  return (
    <div className="df-sub-modal">
      <div className="df-sub-modal__content">
        <div className="df-sub-modal__header">
          <h3>Record Invoice Payment</h3>
          <button
            type="button"
            className="df-sub-modal__close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit(onRecordPayment)}>
          <div className="df-sub-modal__body">
            <div style={{ background: '#1e293b', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Balance Due</div>
              <div style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
                {formatCurrency(balanceDue)}
              </div>
            </div>

            <div className="df-sub-modal__field">
              <label>Payment Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                max={balanceDue}
                {...register('amount', {
                  required: 'Payment amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than zero' },
                  max: { value: balanceDue, message: `Amount cannot exceed balance due of ₹${balanceDue}` },
                })}
              />
              {errors.amount && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.amount.message}</span>}
            </div>

            <div className="df-sub-modal__field">
              <label>Payment Method</label>
              <select {...register('paymentMethod', { required: true })}>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="online">Online Payment</option>
              </select>
            </div>

            <div className="df-sub-modal__field">
              <label>Transaction Reference / Cheque #</label>
              <input
                type="text"
                placeholder="e.g. TXN-99482104"
                {...register('transactionReference')}
              />
            </div>
          </div>

          <div className="df-sub-modal__footer">
            <button
              type="button"
              className="df-sub-modal__btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="df-sub-modal__btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  const handlePrintInvoice = () => {
    window.print();
  };

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await invoiceApi.getInvoiceDetail(id);
      if (data) {
        setDetailData(data);
      }
    } catch (err) {
      console.error('Failed to load invoice detail:', err);
      setError('Invoice detail could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePaymentSubmit = async (formData) => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await invoiceApi.recordPayment(id, {
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference,
      });

      setIsPaymentModalOpen(false);
      alert('Payment recorded successfully in database!');
      fetchDetail();
    } catch (err) {
      console.error('Failed to record payment:', err);
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDownloadSummary = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="df-invoices">
        <div className="df-invoices__container">
          <div className="df-invoices__loading">Loading invoice details...</div>
        </div>
      </div>
    );
  }

  if (error || !detailData?.invoice) {
    return (
      <div className="df-invoices">
        <div className="df-invoices__container">
          <div className="df-invoices__header">
            <button
              type="button"
              className="df-invoices__back-btn"
              onClick={() => navigate('/invoices')}
            >
              ← Back to Invoices
            </button>
          </div>
          <div className="df-invoices__empty">{error || 'Invoice not found'}</div>
        </div>
      </div>
    );
  }

  const {
    invoice,
    items = [],
    payments = [],
    deliveryReconciliation = [],
    relatedInvoices = [],
    lifecycle = {},
  } = detailData;

  const isPaid = invoice.status === 'paid' || parseFloat(invoice.paid_amount) >= parseFloat(invoice.grand_total);
  const balanceDue = Math.max(0, parseFloat(invoice.grand_total) - parseFloat(invoice.paid_amount || 0));

  return (
    <div className="df-invoices">
      <div className="df-invoices__container">
        {/* Page Header matching Wireframe #13 */}
        <div className="df-invoices__header">
          <div className="df-invoices__title-row">
            <h1 className="df-invoices__title">
              Invoice Detail: {invoice.invoice_number} ({invoice.customer_name})
            </h1>
            <button
              type="button"
              className="df-invoices__back-btn"
              onClick={() => navigate('/invoices')}
            >
              ← Back to Invoices
            </button>
          </div>
          <p className="df-invoices__subtitle">
            Opened by clicking a row on the Invoices list
          </p>
        </div>

        {/* 4-Step Lifecycle Progress Stepper matching Wireframe #13 */}
        <div className="df-invoices__lifecycle">
          {/* Step 1: Order Confirmed */}
          <div className="df-invoices__step">
            <div
              className={`df-invoices__step-dot ${
                lifecycle.order_confirmed?.completed
                  ? 'df-invoices__step-dot--completed'
                  : 'df-invoices__step-dot--current'
              }`}
            >
              ✓
            </div>
            <span className="df-invoices__step-label">Order Confirmed</span>
          </div>

          {/* Step 2: Shipped */}
          <div className="df-invoices__step">
            <div
              className={`df-invoices__step-dot ${
                lifecycle.shipped?.completed
                  ? 'df-invoices__step-dot--completed'
                  : lifecycle.shipped?.current
                  ? 'df-invoices__step-dot--current'
                  : ''
              }`}
            >
              {lifecycle.shipped?.completed ? '✓' : '2'}
            </div>
            <span className="df-invoices__step-label">Shipped</span>
          </div>

          {/* Step 3: Invoiced */}
          <div className="df-invoices__step">
            <div
              className={`df-invoices__step-dot ${
                lifecycle.invoiced?.completed && isPaid
                  ? 'df-invoices__step-dot--completed'
                  : 'df-invoices__step-dot--current'
              }`}
            >
              {isPaid ? '✓' : '3'}
            </div>
            <span className="df-invoices__step-label">Invoiced</span>
          </div>

          {/* Step 4: Paid */}
          <div className="df-invoices__step">
            <div
              className={`df-invoices__step-dot ${
                isPaid ? 'df-invoices__step-dot--completed' : ''
              }`}
            >
              {isPaid ? '✓' : '4'}
            </div>
            <span className="df-invoices__step-label">Paid</span>
          </div>
        </div>

        {/* Invoice Summary Table matching Wireframe #13 */}
        <div className="df-invoices__table-wrapper">
          <table className="df-invoices__table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{invoice.invoice_number}</strong>
                </td>
                <td>{formatCurrency(invoice.grand_total)}</td>
                <td>
                  <span
                    className={`df-invoices__badge df-invoices__badge--${
                      isPaid ? 'paid' : balanceDue < invoice.grand_total ? 'partially_paid' : 'unpaid'
                    }`}
                  >
                    {isPaid ? 'Paid' : balanceDue < invoice.grand_total ? 'Partially Paid' : 'Unpaid'}
                  </span>
                </td>
                <td>{formatDate(invoice.due_date)}</td>
              </tr>
              {relatedInvoices
                .filter((r) => String(r.id) !== String(invoice.id))
                .slice(0, 2)
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.invoice_number}</strong>
                      {r.is_recurring && (
                        <span style={{ color: '#38bdf8', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                          (Recurring)
                        </span>
                      )}
                    </td>
                    <td>{formatCurrency(r.amount)}</td>
                    <td>
                      <span className={`df-invoices__badge df-invoices__badge--${r.status}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{formatDate(r.due_date)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Delivery Reconciliation Section */}
        {deliveryReconciliation.length > 0 && (
          <>
            <div className="df-invoices__section-header">
              <h2 className="df-invoices__section-title">
                Partial Invoicing & Delivery Reconciliation
              </h2>
            </div>
            <div className="df-invoices__table-wrapper">
              <table className="df-invoices__table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Ordered Qty</th>
                    <th>Shipped Qty</th>
                    <th>Invoiced Qty</th>
                    <th>Reconciliation</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryReconciliation.map((rec) => {
                    const isFullyReconciled = rec.shipped_qty >= rec.ordered_qty;
                    return (
                      <tr key={rec.order_item_id}>
                        <td>
                          <strong>{rec.product_name}</strong>
                          {rec.sku && (
                            <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                              ({rec.sku})
                            </span>
                          )}
                        </td>
                        <td>{rec.ordered_qty}</td>
                        <td>{rec.shipped_qty}</td>
                        <td>{rec.invoiced_qty || rec.shipped_qty}</td>
                        <td>
                          {isFullyReconciled ? (
                            <span className="df-invoices__badge df-invoices__badge--paid">
                              Fulfilled & Billed
                            </span>
                          ) : (
                            <span className="df-invoices__badge df-invoices__badge--partially_paid">
                              Partial Delivery ({rec.shipped_qty}/{rec.ordered_qty})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Payments History Section */}
        {payments.length > 0 && (
          <>
            <div className="df-invoices__section-header">
              <h2 className="df-invoices__section-title" style={{ color: '#94a3b8', fontSize: '1rem' }}>
                Payment History
              </h2>
            </div>
            <div className="df-invoices__table-wrapper">
              <table className="df-invoices__table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Transaction Ref</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.payment_date)}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {(p.payment_method || 'bank_transfer').replace('_', ' ')}
                      </td>
                      <td>{p.transaction_reference || 'N/A'}</td>
                      <td>
                        <span className="df-invoices__badge df-invoices__badge--paid">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Action Buttons matching Wireframe #13 */}
        <div className="df-invoices__actions-row">
          <PermissionGate allowedRoles={['admin', 'finance']}>
            <button
              type="button"
              className="df-invoices__btn-payment"
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={isPaid}
            >
              {isPaid ? 'Fully Paid' : 'Record Payment'}
            </button>
          </PermissionGate>
          <button
            type="button"
            className="df-invoices__btn-download"
            onClick={() => setIsPrintPreviewOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0284c7',
              borderColor: '#38bdf8',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save as PDF
          </button>
          <button
            type="button"
            className="df-invoices__btn-download"
            onClick={() => setIsPrintPreviewOpen(true)}
          >
            Download Summary
          </button>
        </div>

        {/* Callout Banner matching Wireframe #13 */}
        <div className="df-invoices__callout-bar">
          Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
        </div>
      </div>

      {/* Invoice Print & PDF Export Modal */}
      <InvoicePrintModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        invoice={invoice}
        items={items}
      />

      {/* Modal: Record Payment */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        balanceDue={balanceDue}
        onRecordPayment={handlePaymentSubmit}
        isSubmitting={isSubmittingPayment}
      />
    </div>
  );
};

export default React.memo(InvoiceDetail);
