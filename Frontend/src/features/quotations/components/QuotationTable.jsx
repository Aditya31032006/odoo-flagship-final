import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

function formatCurrency(amount) {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const QuotationTable = ({ quotations = [], onSelectQuotation }) => {
  const tableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current) return;
    const ctx = gsap.context(() => {
      const rows = tableRef.current.querySelectorAll('.df-quotations-table tbody tr');
      if (rows.length > 0) {
        gsap.fromTo(
          rows,
          {
            opacity: 0,
            y: 14,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.03,
            ease: 'power2.out',
            clearProps: 'opacity,transform',
          }
        );
      }
    }, tableRef);

    return () => ctx.revert();
  }, [quotations]);

  if (!quotations || quotations.length === 0) {
    return (
      <div className="df-quotations__empty-table">
        No quotations found matching the criteria.
      </div>
    );
  }

  return (
    <div className="df-quotations-table-wrapper" ref={tableRef}>
      <table className="df-quotations-table">
        <thead>
          <tr>
            <th>Quotation #</th>
            <th>Customer</th>
            <th>Sales Rep</th>
            <th>Tier</th>
            <th>Grand Total</th>
            <th>Risk Level</th>
            <th>Status</th>
            <th>Valid Until</th>
          </tr>
        </thead>
        <tbody>
          {quotations.map((q) => (
            <tr
              key={q.id || q.quotation_number}
              onClick={() => onSelectQuotation && onSelectQuotation(q)}
            >
              <td>
                <strong>{q.quotation_number}</strong>
                <span className="sub-text">{q.item_count ? `${q.item_count} items` : '1 SKU'}</span>
              </td>
              <td>
                <strong>{q.company_name || 'Customer'}</strong>
                <span className="sub-text">{q.customer_email || '—'}</span>
              </td>
              <td>{q.sales_rep_name || 'Unassigned'}</td>
              <td>{q.tier_name || 'Standard'}</td>
              <td>
                <span className="amount-highlight">{formatCurrency(q.grand_total)}</span>
              </td>

              <td>
                <span className={`risk-pill risk-pill--${q.risk_level || 'low'}`}>
                  {q.risk_level || 'low'}
                </span>
              </td>
              <td>
                <span className={`status-pill status-pill--${q.status}`}>
                  {q.status ? q.status.replace('_', ' ') : 'draft'}
                </span>
              </td>
              <td>{formatDate(q.valid_until)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuotationTable;
