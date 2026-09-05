import React from 'react';

function ReportKPIs({ summary, bottlenecks, topProducts }) {
  const quotesCount = summary?.quotes_created_count || 0;
  const prevCount = summary?.prev_period_quotes_count || 0;
  const quotesDiffPct = prevCount > 0 ? Math.round(((quotesCount - prevCount) / prevCount) * 100) : 0;

  const avgApprovalHours = Number(bottlenecks?.total_approvals_requested || 0) > 0
    ? Number(bottlenecks?.avg_approval_hours || 0)
    : 0;
  const totalApproved = Number(bottlenecks?.total_approved_count || 0);

  // Find top upsold product from topProducts list
  const topUpsell = topProducts?.filter((p) => Number(p.upsell_count) > 0)?.sort((a, b) => b.upsell_count - a.upsell_count)?.[0] || null;

  const winRate = summary?.win_rate_percentage || 0;
  const avgDiscount = summary?.avg_discount_percentage || 0;

  return (
    <div className="df-reports__kpi-grid">
      {/* 1. Quotes Created */}
      <div className="df-reports__kpi-card df-reports__kpi-card--purple">
        <div className="df-reports__kpi-card-header">
          <h3 className="df-reports__kpi-card-title">Quotes Created</h3>
          <div className="df-reports__kpi-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
        </div>
        <div className="df-reports__kpi-card-value">{quotesCount}</div>
        <div className="df-reports__kpi-card-footer">
          <span className={`df-reports__kpi-card-trend ${quotesDiffPct >= 0 ? 'df-reports__kpi-card-trend--positive' : 'df-reports__kpi-card-trend--negative'}`}>
            {quotesDiffPct >= 0 ? `+${quotesDiffPct}%` : `${quotesDiffPct}%`}
          </span>
          <span>vs previous period</span>
        </div>
      </div>

      {/* 2. Avg Approval Time */}
      <div className="df-reports__kpi-card df-reports__kpi-card--amber">
        <div className="df-reports__kpi-card-header">
          <h3 className="df-reports__kpi-card-title">Avg Approval Time</h3>
          <div className="df-reports__kpi-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        <div className="df-reports__kpi-card-value">{avgApprovalHours} hrs</div>
        <div className="df-reports__kpi-card-footer">
          <span className="df-reports__kpi-card-trend df-reports__kpi-card-trend--positive">
            {totalApproved} approved
          </span>
          <span>across all workflows</span>
        </div>
      </div>

      {/* 3. Top Upsold Product */}
      <div className="df-reports__kpi-card df-reports__kpi-card--green">
        <div className="df-reports__kpi-card-header">
          <h3 className="df-reports__kpi-card-title">Top Upsold Product</h3>
          <div className="df-reports__kpi-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>
        <div className="df-reports__kpi-card-value" title={topUpsell ? topUpsell.product_name : 'No Upsells'}>
          {topUpsell ? (topUpsell.product_name.length > 18 ? `${topUpsell.product_name.slice(0, 18)}...` : topUpsell.product_name) : 'None'}
        </div>
        <div className="df-reports__kpi-card-footer">
          <span className={`df-reports__kpi-card-trend ${topUpsell ? 'df-reports__kpi-card-trend--positive' : 'df-reports__kpi-card-trend--neutral'}`}>
            {topUpsell ? `${topUpsell.upsell_attach_rate_pct}% attach rate` : '0% attach rate'}
          </span>
          <span>({topUpsell ? topUpsell.upsell_count : 0} units)</span>
        </div>
      </div>

      {/* 4. Win / Realization Rate */}
      <div className="df-reports__kpi-card">
        <div className="df-reports__kpi-card-header">
          <h3 className="df-reports__kpi-card-title">Win Rate & Margin</h3>
          <div className="df-reports__kpi-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>
        <div className="df-reports__kpi-card-value">{winRate}%</div>
        <div className="df-reports__kpi-card-footer">
          <span className="df-reports__kpi-card-trend df-reports__kpi-card-trend--neutral">
            Avg Discount: {avgDiscount}%
          </span>
          <span>pipeline health</span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ReportKPIs);
