import React from 'react';
import '../styles/printInvoice.scss';

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PrintableInvoice({ invoice, items = [] }) {
  if (!invoice) return null;

  const subtotal = parseFloat(invoice.subtotal) || 0;
  const taxTotal = parseFloat(invoice.tax_total) || 0;
  const grandTotal = parseFloat(invoice.grand_total) || 0;
  const paidAmount = parseFloat(invoice.paid_amount) || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const isPaid = invoice.status === 'paid' || paidAmount >= grandTotal;

  return (
    <div className="df-printable-invoice-wrapper">
      {/* Invoice Header */}
      <div className="invoice-header">
        <div className="brand-section">
          <div className="brand-logo-text">
            DealFlow<span className="brand-accent">360</span>
          </div>
          <div className="company-meta">
            <strong>DealFlow Operations &amp; Enterprise Inc.</strong><br />
            100 Innovation Boulevard, Suite 400<br />
            San Francisco, CA 94105 • USA<br />
            billing@dealflow360.com | +1 (800) 555-3600
          </div>
        </div>

        <div className="doc-meta">
          <h1 className="doc-title">TAX INVOICE</h1>
          <div className="doc-number">{invoice.invoice_number}</div>
          <div className={`status-stamp status-stamp--${isPaid ? 'paid' : invoice.status || 'issued'}`}>
            {isPaid ? '✓ PAID & SETTLED' : invoice.status === 'partially_paid' ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
          </div>
        </div>
      </div>

      {/* Parties & Dates Grid */}
      <div className="parties-grid">
        <div className="party-card">
          <div className="party-label">Billed To</div>
          <div className="party-name">{invoice.customer_name || 'Customer Organization'}</div>
          <div className="party-info">
            {invoice.customer_billing_address || 'Registered Billing Address'}<br />
            <strong>Email:</strong> {invoice.customer_email || '—'}<br />
            {invoice.customer_phone && <><strong>Phone:</strong> {invoice.customer_phone}<br /></>}
            {invoice.customer_tax_id && <><strong>GSTIN / Tax ID:</strong> {invoice.customer_tax_id}</>}
          </div>
        </div>

        <div className="meta-details">
          <div className="meta-item">
            <div className="label">Invoice Date</div>
            <div className="val">
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="meta-item">
            <div className="label">Payment Due Date</div>
            <div className="val">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="meta-item">
            <div className="label">Order Reference</div>
            <div className="val">{invoice.order_number || 'Direct Contract'}</div>
          </div>
          <div className="meta-item">
            <div className="label">Payment Terms</div>
            <div className="val">Net 15 Days</div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="items-table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Description / Product Specification</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Tax (Rate)</th>
              <th className="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <span className="item-desc">{item.product_name}</span>
                    {item.sku && <span className="item-sku">SKU: {item.sku}</span>}
                  </td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right">
                    {formatCurrency(item.tax_amount)} ({item.tax_percentage}%)
                  </td>
                  <td className="text-right">
                    <strong>{formatCurrency(item.line_total)}</strong>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8' }}>
                  No itemized line items recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes Section */}
      <div className="totals-reconciliation-grid">
        <div className="notes-section">
          <h4>Payment Instructions &amp; Notes</h4>
          <p>
            Please include invoice number <strong>{invoice.invoice_number}</strong> on your payment remittance.
          </p>
          <div className="bank-details">
            <strong>Bank Transfer Details:</strong><br />
            Bank: DealFlow Financial Corp.<br />
            Account Name: DealFlow360 Operations<br />
            Account Number: 9870 0041 8821<br />
            Swift / Routing: DF360US66
          </div>
        </div>

        <div className="totals-box">
          <div className="tot-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="tot-row">
            <span>Tax (GST / VAT)</span>
            <span>+{formatCurrency(taxTotal)}</span>
          </div>
          <div className="tot-row grand-tot">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          <div className="tot-row paid-tot">
            <span>Amount Paid</span>
            <span>-{formatCurrency(paidAmount)}</span>
          </div>
          <div className="tot-row due-tot">
            <span>Balance Due</span>
            <span>{formatCurrency(balanceDue)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="invoice-footer">
        <div className="terms">
          This is a computer-generated tax invoice. No physical signature is required under IT Act Section 10A.
          For any discrepancies, contact billing@dealflow360.com within 7 business days.
        </div>
        <div className="signature-line">
          <div className="line" />
          <div className="sign-title">Authorized Representative</div>
        </div>
      </div>
    </div>
  );
}
