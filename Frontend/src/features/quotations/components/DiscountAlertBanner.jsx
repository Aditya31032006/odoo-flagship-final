import React, { memo } from 'react';

export const DiscountAlertBanner = memo(({
  hasExcess = false,
  blendedRiskScore = 0,
  riskLevel = 'low',
  matchingRule = null,
}) => {
  return (
    <div
      className={`df-quotation-detail__alert-banner df-quotation-detail__alert-banner--${hasExcess ? 'excess' : 'valid'}`}
    >
      <div className="banner-text">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {hasExcess ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </>
          ) : (
            <>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </>
          )}
        </svg>
        <span>
          {hasExcess ? (
            <>
              Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time.{' '}
              <strong>
                Requires {matchingRule?.requires_finance ? 'Sales Manager + Finance' : 'Sales Manager'} approval.
              </strong>
            </>
          ) : (
            'Discount is checked against each line’s own limit live. All current discounts are within allowed customer tier and category ceilings.'
          )}
        </span>
      </div>

      <div className="banner-risk-badge">
        Risk Score: {blendedRiskScore} pts ({riskLevel} risk)
      </div>
    </div>
  );
});

export default DiscountAlertBanner;
