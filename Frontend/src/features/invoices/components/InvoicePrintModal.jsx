import React, { useRef } from 'react';
import '../styles/printInvoice.scss';

function formatCurrency(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function InvoicePrintModal({
  isOpen,
  onClose,
  invoice,
  items = [],
}) {
  const printRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxTotal = parseFloat(invoice.tax_total) || 0;
  const grandTotal = parseFloat(invoice.grand_total) || 0;
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const isPaid = invoice.status === 'paid' || paidAmount >= grandTotal;

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="df-invoice-print-modal-backdrop" onClick={onClose}>
      <div className="df-invoice-print-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar matching Reports Page */}
        <div className="df-invoice-print-modal__bar">
          <div className="df-invoice-print-modal__bar-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Tax Invoice #{invoice.invoice_number} — Document Print &amp; PDF Export
          </div>
          <div className="df-invoice-print-modal__bar-actions">
            <button
              type="button"
              className="df-invoice-print-modal__btn df-invoice-print-modal__btn--print"
              onClick={handlePrint}
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
              className="df-invoice-print-modal__btn df-invoice-print-modal__btn--close"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Sheet matching Reports Style */}
        <div className="df-invoice-print-doc" ref={printRef} id="printable-tax-invoice">
          {/* Document Header */}
          <div className="df-invoice-print-doc__header">
            <div className="df-invoice-print-doc__header-brand">
              <div className="df-invoice-print-doc__brand-badge">DealFlow360</div>
              <div className="df-invoice-print-doc__brand-sub">Enterprise Sales Operations &amp; Billing Systems</div>
              <div className="df-invoice-print-doc__brand-address">
                100 Innovation Boulevard, Suite 400 • San Francisco, CA 94105<br />
                billing@dealflow360.com | +1 (800) 555-3600
              </div>
            </div>
            <div className="df-invoice-print-doc__header-meta">
              <div className="meta-title">Official Tax Invoice</div>
              <div className="meta-inv-num">#{invoice.invoice_number}</div>
              <div className="meta-row"><strong>Date:</strong> {formatDate(invoice.invoice_date)}</div>
              <div className="meta-row"><strong>Due Date:</strong> {formatDate(invoice.due_date)}</div>
              <div className="meta-row"><strong>Generated:</strong> {currentDateStr}</div>
              <div className="meta-status">
                <span className={`doc-badge ${isPaid ? 'doc-badge--green' : balanceDue < grandTotal ? 'doc-badge--yellow' : 'doc-badge--red'}`}>
                  {isPaid ? '✓ FULLY PAID & SETTLED' : balanceDue < grandTotal ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
                </span>
              </div>
            </div>
          </div>

          <hr className="df-invoice-print-doc__divider" />

          {/* Customer & Order Metadata Section */}
          <div className="df-invoice-print-doc__parties">
            <div className="party-box">
              <div className="party-lbl">Billed To Customer</div>
              <div className="party-name">{invoice.customer_name || 'Client Organization'}</div>
              <div className="party-address">{invoice.customer_billing_address || 'Registered Corporate Address'}</div>
              <div className="party-contact">
                {invoice.customer_email && <span><strong>Email:</strong> {invoice.customer_email}</span>}
                {invoice.customer_phone && <span> • <strong>Phone:</strong> {invoice.customer_phone}</span>}
              </div>
            </div>

            <div className="party-box meta-summary-box">
              <div className="party-lbl">Contract Reference</div>
              <div className="meta-line"><strong>Order Reference:</strong> {invoice.order_number || 'Direct Contract Invoice'}</div>
              <div className="meta-line"><strong>Payment Terms:</strong> Net 15 Days</div>
              <div className="meta-line"><strong>Currency:</strong> INR (₹)</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="df-invoice-print-doc__section">
            <h2 className="df-invoice-print-doc__section-title">Itemized Line Items Breakdown</h2>
            <table className="df-invoice-print-doc__table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Product Specification / Description</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Tax Rate</th>
                  <th style={{ textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{item.product_name}</strong></td>
                      <td>{item.sku || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.tax_amount)} ({item.tax_percentage}%)</td>
                      <td style={{ textAlign: 'right' }}><strong>{formatCurrency(item.line_total)}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>
                      No itemized items recorded for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Remittance Section */}
          <div className="df-invoice-print-doc__totals-grid">
            <div className="remittance-box">
              <h4>Bank Remittance Instructions</h4>
              <p>Please reference invoice number <strong>{invoice.invoice_number}</strong> with your payment transfer.</p>
              <div className="bank-info">
                <strong>Bank Name:</strong> DealFlow Financial Trust<br />
                <strong>Account Name:</strong> DealFlow360 Enterprise Revenue<br />
                <strong>Account Number:</strong> 8892 0149 2201<br />
                <strong>Routing / SWIFT:</strong> DF360SF99
              </div>
            </div>

            <div className="totals-calculation-box">
              <div className="calc-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="calc-row">
                <span>Tax (GST / VAT)</span>
                <span>+{formatCurrency(taxTotal)}</span>
              </div>
              <div className="calc-row grand">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
              <div className="calc-row paid">
                <span>Amount Paid</span>
                <span>-{formatCurrency(paidAmount)}</span>
              </div>
              <div className="calc-row due">
                <span>Balance Due</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="df-invoice-print-doc__footer">
            <div className="footer-notes">
              <p>
                <strong>NOTE:</strong> This is an authentic computer-generated invoice issued by DealFlow360 Operations.
                For any billing inquiries, please contact billing@dealflow360.com within 7 business days.
              </p>
            </div>
            <div className="footer-signoff">
              <div className="sign-box">
                <div className="sign-line" />
                <div className="sign-lbl">Finance Controller / Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(InvoicePrintModal);
