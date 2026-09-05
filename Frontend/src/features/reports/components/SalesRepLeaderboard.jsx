import React from 'react';

function getInitials(name) {
  if (!name) return 'SR';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SalesRepLeaderboard({ leaderboard = [] }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="df-reports__chart-box df-reports__chart-box--col-12">
        <div className="df-reports__chart-box-header">
          <div>
            <h3 className="df-reports__chart-box-title">Sales Rep Performance Leaderboard</h3>
            <p className="df-reports__chart-box-subtitle">Deals closed, revenue realized, and discount compliance by sales representative</p>
          </div>
        </div>
        <div className="df-reports__loading-skeleton">
          <p>No sales representative activity found for this period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="df-reports__chart-box df-reports__chart-box--col-12">
      <div className="df-reports__chart-box-header">
        <div>
          <h3 className="df-reports__chart-box-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Sales Rep Performance Leaderboard
          </h3>
          <p className="df-reports__chart-box-subtitle">Deals closed, revenue realized, win rates, and discount compliance ranking</p>
        </div>
      </div>

      <div className="df-reports__table-container">
        <table className="df-reports__leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">#</th>
              <th>Sales Representative</th>
              <th>Quotes Created</th>
              <th>Deals Closed</th>
              <th>Revenue Realized</th>
              <th>Win Rate</th>
              <th>Avg Discount</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((rep, idx) => {
              const rank = idx + 1;
              const avgDisc = parseFloat(rep.avg_discount_pct || 0);

              return (
                <tr key={rep.rep_id || idx}>
                  <td className="rank-col">
                    {rank <= 3 ? (
                      <span className={`rank-badge rank-badge--${rank}`}>
                        {rank}
                      </span>
                    ) : (
                      rank
                    )}
                  </td>
                  <td>
                    <div className="rep-cell">
                      <div className="avatar">{getInitials(rep.rep_name)}</div>
                      <div className="info">
                        <span className="name">{rep.rep_name}</span>
                        <span className="email">{rep.rep_email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{rep.total_quotes}</td>
                  <td>{rep.deals_closed}</td>
                  <td>
                    <strong>${Number(rep.total_revenue || 0).toLocaleString()}</strong>
                  </td>
                  <td>
                    <strong>{rep.win_rate_pct}%</strong>
                  </td>
                  <td>
                    <span className={`discount-pill ${avgDisc > 12 ? 'discount-pill--high' : ''}`}>
                      {avgDisc}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(SalesRepLeaderboard);
