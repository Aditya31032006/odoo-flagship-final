import React from 'react';

// Format currency in Indian standard or USD format
function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString()}`;
}

export const QuotationCard = ({ quotation, onClick }) => {
  const {
    quotation_number,
    company_name,
    sales_rep_name,
    grand_total,
    risk_level,
    approval_status,
    counter_discount_percentage,
  } = quotation;

  return (
    <div
      className="df-quote-card"
      onClick={() => onClick && onClick(quotation)}
      title={`Click to view ${quotation_number}`}
    >
      <div className="df-quote-card__header">
        <span className="df-quote-card__company">{company_name || 'Customer'}</span>
        <span className="df-quote-card__amount">{formatCurrency(grand_total)}</span>
      </div>

      <div className="df-quote-card__quote-no">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        {quotation_number}
      </div>

      <div className="df-quote-card__footer">
        <span className="df-quote-card__rep" title={`Sales Rep: ${sales_rep_name || 'Unassigned'}`}>
          👤 {sales_rep_name || 'Sales Rep'}
        </span>

        <div className="df-quote-card__badges">
          {counter_discount_percentage != null && (
            <span className="risk-pill risk-pill--medium" title="Counter discount requested">
              -{counter_discount_percentage}%
            </span>
          )}
          {risk_level && (
            <span className={`risk-pill risk-pill--${risk_level}`}>
              {risk_level} risk
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationCard;
