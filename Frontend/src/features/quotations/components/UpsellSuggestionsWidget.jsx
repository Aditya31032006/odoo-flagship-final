import React, { memo } from 'react';

export const UpsellSuggestionsWidget = memo(({
  suggestions = [],
  onAddSuggestion,
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <section className="df-quotation-detail__upsell-section" aria-label="Upsell and Cross-Sell Suggestions">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="upsell-icon">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Upsell and Cross-Sell Suggestions
      </h3>

      <div className="df-quotation-detail__upsell-grid">
        {suggestions.map((sug) => {
          const detailText = sug.is_subscription
            ? `🔁 Recurring Plan • ₹${Number(sug.suggested_selling_price || sug.suggested_base_price).toLocaleString('en-IN')} / ${sug.billing_cycle || 'mo'}`
            : sug.is_promoted
            ? 'Promo recommendation'
            : sug.minimum_margin_percentage
            ? `Margin +${sug.minimum_margin_percentage}%`
            : `Price: ₹${Number(sug.suggested_selling_price || sug.suggested_base_price).toLocaleString('en-IN')}`;

          return (
            <div
              key={sug.rule_id || sug.subscription_plan_id || sug.suggested_variant_id}
              className={`df-quotation-detail__upsell-card ${sug.is_subscription ? 'df-upsell-card--subscription' : ''}`}
              onClick={() => onAddSuggestion(sug)}
              title={`Click to add ${sug.suggested_product_name}`}
            >
              <div className="upsell-info">
                <div className="title">
                  {sug.is_subscription ? '🔁 ' : '+ '}
                  {sug.suggested_product_name}
                </div>
                <div className="detail" style={sug.is_subscription ? { color: '#38bdf8', fontWeight: 500 } : {}}>
                  {detailText}
                </div>
              </div>

              <button type="button" className="btn-add">
                {sug.is_subscription ? '+ Attach Plan' : 'Add +'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
});

export default UpsellSuggestionsWidget;
