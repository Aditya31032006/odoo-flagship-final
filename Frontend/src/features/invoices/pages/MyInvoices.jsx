import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../../auth/hook/useAuth.js';
import invoiceApi from '../services/invoice.api.js';
import InvoicePrintModal from '../components/InvoicePrintModal.jsx';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import '../styles/myInvoices.scss';

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MyInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Selected invoice for detail modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // React Hook Form for payment submission
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: '',
      paymentMethod: 'bank_transfer',
      transactionReference: '',
    },
  });

  // Fetch company invoices
  const fetchCompanyInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getInvoices();
      const list = res?.invoices || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load customer invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyInvoices();
  }, [fetchCompanyInvoices]);

  // Open invoice detail modal
  const openInvoiceDetail = async (inv) => {
    setSelectedInvoice(inv);
    setLoadingDetail(true);
    try {
      const detail = await invoiceApi.getInvoiceById(inv.id);
      setInvoiceDetail(detail);
      if (detail?.invoice) {
        const balance = Math.max(0, (parseFloat(detail.invoice.grand_total) || 0) - (parseFloat(detail.invoice.paid_amount) || 0));
        setValue('amount', balance.toFixed(2));
      }
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeInvoiceDetail = () => {
    setSelectedInvoice(null);
    setInvoiceDetail(null);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Submit payment handler via react-hook-form
  const onPaymentSubmit = async (data) => {
    if (!selectedInvoice) return;
    try {
      setIsProcessingPayment(true);
      await invoiceApi.recordPayment(selectedInvoice.id, {
        amount: parseFloat(data.amount),
        paymentMethod: data.paymentMethod,
        transactionReference: data.transactionReference || `TXN-${Date.now()}`,
      });

      setActionAlert({
        type: 'success',
        message: `✅ Payment of ${formatCurrency(data.amount)} recorded successfully!`,
      });

      await fetchCompanyInvoices();
      const updatedDetail = await invoiceApi.getInvoiceById(selectedInvoice.id);
      setInvoiceDetail(updatedDetail);
    } catch (err) {
      console.error('Failed to process payment:', err);
      setActionAlert({
        type: 'error',
        message: err.customMessage || err.message || 'Payment submission failed.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const query = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        inv.invoice_number?.toLowerCase().includes(query) ||
        inv.order_number?.toLowerCase().includes(query);

      const isPaid = inv.status === 'paid' || parseFloat(inv.paid_amount) >= parseFloat(inv.grand_total);
      let matchesStatus = true;
      if (selectedStatus === 'unpaid') {
        matchesStatus = !isPaid;
      } else if (selectedStatus === 'paid') {
        matchesStatus = isPaid;
      }

      return matchesSearch && matchesStatus;
    });
  }, [invoices, debouncedSearch, selectedStatus]);

  // Aggregate statistics
  const totalBilled = invoices.reduce((acc, i) => acc + (parseFloat(i.grand_total) || 0), 0);
  const totalPaid = invoices.reduce((acc, i) => acc + (parseFloat(i.paid_amount) || 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalPaid);

  return (
    <div className="df-my-invoices">
      {/* Top Welcome Banner */}
      <div className="df-my-invoices__banner">
        <div className="banner-text">
          <h1>
            Company Invoices &amp; Billing
            <span className="company-pill">{user?.company_name || 'Your Organization'}</span>
          </h1>
          <p>Access your billing records, verify tax breakdowns, download invoices, and settle outstanding balances.</p>
        </div>

        <div className="banner-stats">
          <div className="stat-chip">
            <span className="num">{invoices.length}</span>
            <span className="label">Total Invoices</span>
          </div>
          <div className="stat-chip">
            <span className="num" style={{ color: totalOutstanding > 0 ? '#f87171' : '#34d399' }}>
              {formatCurrency(totalOutstanding)}
            </span>
            <span className="label">Outstanding</span>
          </div>
          <div className="stat-chip">
            <span className="num" style={{ color: '#34d399' }}>{formatCurrency(totalPaid)}</span>
            <span className="label">Total Settled</span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionAlert && (
        <div className={`df-action-banner df-action-banner--${actionAlert.type}`}>
          <span>{actionAlert.message}</span>
          <button
            type="button"
            onClick={() => setActionAlert(null)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="df-my-invoices__controls">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by invoice number or order reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="status-filters">
          {[
            { id: 'all', label: `All Invoices (${invoices.length})` },
            { id: 'unpaid', label: 'Unpaid / Due' },
            { id: 'paid', label: 'Paid & Settled' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              className={selectedStatus === st.id ? 'active' : ''}
              onClick={() => setSelectedStatus(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Cards Grid */}
      {loading ? (
        <div className="df-my-invoices__empty">
          <p>Loading your company invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="df-my-invoices__empty">
          <h3>No invoices found</h3>
          <p>There are currently no invoices matching your search or filter criteria.</p>
        </div>
      ) : (
        <div className="df-my-invoices__grid">
          {filteredInvoices.map((inv) => {
            const isPaid = inv.status === 'paid' || parseFloat(inv.paid_amount) >= parseFloat(inv.grand_total);
            const balance = Math.max(0, (parseFloat(inv.grand_total) || 0) - (parseFloat(inv.paid_amount) || 0));

            return (
              <div
                key={inv.id}
                className="df-my-invoices__card"
                onClick={() => openInvoiceDetail(inv)}
              >
                <div className="card-top">
                  <span className="inv-code">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="7" y1="8" x2="17" y2="8" />
                      <line x1="7" y1="12" x2="17" y2="12" />
                      <line x1="7" y1="16" x2="12" y2="16" />
                    </svg>
                    {inv.invoice_number}
                  </span>
                  <span className={`status-tag status-tag--${isPaid ? 'paid' : inv.status || 'issued'}`}>
                    {isPaid ? '✓ Paid' : inv.status === 'partially_paid' ? 'Partially Paid' : 'Issued'}
                  </span>
                </div>

                <div className="card-middle">
                  <div className="amount-display">{formatCurrency(inv.grand_total)}</div>
                  {!isPaid && balance > 0 && (
                    <div className="balance-due-text">
                      Balance Due: {formatCurrency(balance)}
                    </div>
                  )}
                  <div className="meta-row">
                    <span>Date: {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '—'}</span>
                    <span>Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>

                <div className="card-bottom">
                  <span className="order-ref">
                    {inv.order_number ? `Order: ${inv.order_number}` : 'Direct Invoice'}
                  </span>
                  {!isPaid && balance > 0 ? (
                    <button
                      type="button"
                      className="btn-view-inv btn-pay-now"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoiceDetail(inv);
                      }}
                    >
                      💳 Pay Now
                    </button>
                  ) : (
                    <button type="button" className="btn-view-inv">
                      View Details
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Detail & Payment Modal */}
      {selectedInvoice && (
        <div className="df-my-invoices__detail-modal" onClick={closeInvoiceDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" color="#38bdf8">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                </svg>
                {selectedInvoice.invoice_number} — Invoice Breakdown
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-print-action"
                  onClick={() => setIsPrintModalOpen(true)}
                  title="Print official tax invoice"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print / Save as PDF
                </button>
                <button type="button" className="btn-close" onClick={closeInvoiceDetail}>
                  ✕
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                Loading line items and payment details...
              </div>
            ) : invoiceDetail?.invoice ? (
              <>
                {/* Meta Grid */}
                <div className="invoice-meta-grid">
                  <div className="meta-item">
                    <div className="label">Status</div>
                    <div className="val" style={{ color: invoiceDetail.invoice.status === 'paid' ? '#34d399' : '#38bdf8', textTransform: 'capitalize' }}>
                      {invoiceDetail.invoice.status}
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="label">Invoice Date</div>
                    <div className="val">{invoiceDetail.invoice.invoice_date ? new Date(invoiceDetail.invoice.invoice_date).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="meta-item">
                    <div className="label">Due Date</div>
                    <div className="val">{invoiceDetail.invoice.due_date ? new Date(invoiceDetail.invoice.due_date).toLocaleDateString() : '—'}</div>
                  </div>
                  <div className="meta-item">
                    <div className="label">Linked Order</div>
                    <div className="val">{invoiceDetail.invoice.order_number || 'Direct Contract'}</div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product &amp; Specification</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Tax</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceDetail.items?.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td>{idx + 1}</td>
                        <td className="item-name">{it.product_name} {it.sku ? `(SKU: ${it.sku})` : ''}</td>
                        <td>{it.quantity}</td>
                        <td>{formatCurrency(it.unit_price)}</td>
                        <td>{formatCurrency(it.tax_amount)} ({it.tax_percentage}%)</td>
                        <td><strong>{formatCurrency(it.line_total)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Summary */}
                <div className="totals-summary-box">
                  <div className="tot-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoiceDetail.invoice.subtotal)}</span>
                  </div>
                  <div className="tot-row">
                    <span>Tax (GST / VAT)</span>
                    <span>+{formatCurrency(invoiceDetail.invoice.tax_total)}</span>
                  </div>
                  <div className="tot-row grand-tot">
                    <span>Grand Total</span>
                    <span>{formatCurrency(invoiceDetail.invoice.grand_total)}</span>
                  </div>
                  <div className="tot-row">
                    <span>Paid to Date</span>
                    <span style={{ color: '#34d399' }}>-{formatCurrency(invoiceDetail.invoice.paid_amount)}</span>
                  </div>
                  <div className="tot-row balance-due">
                    <span>Remaining Balance Due</span>
                    <span>
                      {formatCurrency(Math.max(0, (parseFloat(invoiceDetail.invoice.grand_total) || 0) - (parseFloat(invoiceDetail.invoice.paid_amount) || 0)))}
                    </span>
                  </div>
                </div>

                {/* Payment Form (if balance is due) */}
                {parseFloat(invoiceDetail.invoice.paid_amount) < parseFloat(invoiceDetail.invoice.grand_total) && (
                  <div className="payment-action-section">
                    <h3>💳 Settle Balance / Make Payment</h3>
                    <form onSubmit={handleSubmit(onPaymentSubmit)} className="pay-form">
                      <div className="form-group">
                        <label>Payment Method</label>
                        <select {...register('paymentMethod')}>
                          <option value="bank_transfer">Bank Transfer / NEFT</option>
                          <option value="upi">UPI / Instant Pay</option>
                          <option value="card">Credit / Debit Card</option>
                          <option value="cash">Cash on Delivery</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Amount to Pay (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('amount', {
                            required: 'Amount is required',
                            min: { value: 1, message: 'Amount must be greater than 0' }
                          })}
                        />
                        {errors.amount && <span style={{ color: '#f87171', fontSize: '0.75rem' }}>{errors.amount.message}</span>}
                      </div>

                      <div className="form-group">
                        <label>Transaction Reference (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. UTR-982347102"
                          {...register('transactionReference')}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-submit-pay"
                        disabled={isProcessingPayment}
                      >
                        {isProcessingPayment ? 'Processing...' : 'Submit Payment'}
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Dedicated Invoice Print & PDF Preview Modal (Matching Reports page) */}
      {isPrintModalOpen && (
        <InvoicePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={invoiceDetail?.invoice || selectedInvoice}
          items={invoiceDetail?.items || []}
        />
      )}
    </div>
  );
}
