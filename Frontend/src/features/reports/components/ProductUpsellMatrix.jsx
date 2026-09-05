import React from 'react';

function ProductUpsellMatrix({ topProducts = [], revenueMix = {} }) {
  const recurring = parseFloat(revenueMix?.recurring_revenue || 0);
  const onetime = parseFloat(revenueMix?.onetime_revenue || 0);
  const totalRev = recurring + onetime;

  const recurringPct = totalRev > 0 ? Math.round((recurring / totalRev) * 100) : 0;
  const onetimePct = totalRev > 0 ? 100 - recurringPct : 0;

  return (
    <>
      {/* 1. Top Products & Upsell Attach Performance */}
      <div className="df-reports__chart-box df-reports__chart-box--col-8">
        <div className="df-reports__chart-box-header">
          <div>
            <h3 className="df-reports__chart-box-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
              Top Product Performance & Upsell Attach Rates
            </h3>
            <p className="df-reports__chart-box-subtitle">Units sold, revenue volume, and warranty/service upsell attach rates</p>
          </div>
        </div>

        {topProducts.length > 0 ? (
          <div className="df-reports__table-container">
            <table className="df-reports__upsell-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units</th>
                  <th>Total Revenue</th>
                  <th>Upsell Attach Rate</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => {
                  const attachPct = Math.min(100, Math.round(parseFloat(p.upsell_attach_rate_pct || 0)));
                  return (
                    <tr key={`${p.sku || p.product_name}-${idx}`}>
                      <td>
                        <div className="prod-cell">
                          <span className="name">{p.product_name}</span>
                          <span className="sku">{p.sku || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{p.category_name}</td>
                      <td>{p.units_sold}</td>
                      <td>₹{Number(p.total_revenue || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <div className="attach-bar-wrap">
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: `${attachPct}%` }}
                            />
                          </div>
                          <span className="pct">{attachPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="df-reports__loading-skeleton">
            <p>No product performance records found for this timeframe.</p>
          </div>
        )}
      </div>

      {/* 2. Revenue Mix: One-Time vs Recurring */}
      <div className="df-reports__chart-box df-reports__chart-box--col-4">
        <div className="df-reports__chart-box-header">
          <div>
            <h3 className="df-reports__chart-box-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Revenue Mix
            </h3>
            <p className="df-reports__chart-box-subtitle">One-time hardware vs recurring subscription ARR</p>
          </div>
        </div>

        <div className="df-reports__revenue-mix">
          {/* Clean Segmented Revenue Mix Bar */}
          <div className="df-reports__revenue-mix-bar">
            {totalRev > 0 ? (
              <>
                {onetimePct > 0 && (
                  <div
                    className="df-reports__revenue-mix-segment df-reports__revenue-mix-segment--onetime"
                    style={{ width: `${onetimePct}%` }}
                    title={`One-Time: ${onetimePct}%`}
                  />
                )}
                {recurringPct > 0 && (
                  <div
                    className="df-reports__revenue-mix-segment df-reports__revenue-mix-segment--recurring"
                    style={{ width: `${recurringPct}%` }}
                    title={`Recurring: ${recurringPct}%`}
                  />
                )}
              </>
            ) : (
              <div className="df-reports__revenue-mix-empty">No revenue recorded in this period</div>
            )}
          </div>

          <div className="df-reports__revenue-mix-breakdown">
            {/* One-Time */}
            <div className="df-reports__revenue-mix-item">
              <div className="item-left">
                <span className="df-reports__chart-box-legend-dot df-reports__chart-box-legend-dot--onetime" />
                <span>One-Time Product / Hardware</span>
              </div>
              <div className="item-right">
                <div className="amt">₹{Number(onetime).toLocaleString('en-IN')}</div>
                <div className="pct">{onetimePct}% of total</div>
              </div>
            </div>

            {/* Recurring */}
            <div className="df-reports__revenue-mix-item">
              <div className="item-left">
                <span className="df-reports__chart-box-legend-dot df-reports__chart-box-legend-dot--recurring" />
                <span>Recurring Subscriptions & AMC</span>
              </div>
              <div className="item-right">
                <div className="amt">₹{Number(recurring).toLocaleString('en-IN')}</div>
                <div className="pct">{recurringPct}% of total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(ProductUpsellMatrix);
