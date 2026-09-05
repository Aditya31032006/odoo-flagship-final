import React, { memo } from 'react';

// Format currency in Indian standard or USD format
function formatCurrency(amount) {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

const FLAG_ICONS = {
  stalled_deal: '⏸',
  discount_anomaly: '⚠️',
  delivery_slippage: '🚚',
};

const FLAG_COLORS = {
  stalled_deal: '#f59e0b',
  discount_anomaly: '#ef4444',
  delivery_slippage: '#f97316',
};

export const QuotationCard = memo(({ quotation, onClick }) => {
  const {
    quotation_number,
    company_name,
    sales_rep_name,
    grand_total,
    risk_level,
    approval_status,
    counter_discount_percentage,
    deal_health_flags,
    status,
  } = quotation;

  const flags = Array.isArray(deal_health_flags) ? deal_health_flags : [];

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="card-icon">
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

      {/* Deal Health Flags */}
      {flags.length > 0 && (
        <div className="df-quote-card__health-flags">
          {flags.slice(0, 3).map((flag, i) => (
            <span
              key={flag.id || i}
              className="df-quote-card__health-flag"
              style={{ borderColor: FLAG_COLORS[flag.flag_type] || '#94a3b8', color: FLAG_COLORS[flag.flag_type] || '#94a3b8' }}
              title={flag.detail || flag.flag_type}
            >
              {FLAG_ICONS[flag.flag_type] || '🔴'} {flag.flag_type?.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

export default QuotationCard;
