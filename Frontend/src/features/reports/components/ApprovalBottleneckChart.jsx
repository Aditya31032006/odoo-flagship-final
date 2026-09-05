import React from 'react';

function ApprovalBottleneckChart({ data = {} }) {
  const totalRequested = Number(data?.total_approvals_requested || 0);
  const totalApproved = Number(data?.total_approved_count || 0);
  const approvalRate = Number(data?.approval_rate_pct || 0);

  const managerHours = totalRequested > 0 ? parseFloat(data?.manager_avg_hours || 0) : 0;
  const financeHours = totalRequested > 0 ? parseFloat(data?.finance_avg_hours || 0) : 0;
  const overallHours = totalRequested > 0 ? parseFloat(data?.avg_approval_hours || 0) : 0;

  // Benchmark for scaling bars (minimum 10 hrs scale)
  const maxBenchmark = Math.max(managerHours, financeHours, overallHours, 10);
  const managerPct = totalRequested > 0 && managerHours > 0 ? Math.min(100, Math.round((managerHours / maxBenchmark) * 100)) : 0;
  const financePct = totalRequested > 0 && financeHours > 0 ? Math.min(100, Math.round((financeHours / maxBenchmark) * 100)) : 0;
  const overallPct = totalRequested > 0 && overallHours > 0 ? Math.min(100, Math.round((overallHours / maxBenchmark) * 100)) : 0;

  return (
    <div className="df-reports__chart-box df-reports__chart-box--col-4">
      <div className="df-reports__chart-box-header">
        <div>
          <h3 className="df-reports__chart-box-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Approval Bottlenecks
          </h3>
          <p className="df-reports__chart-box-subtitle">Turnaround duration across review stages</p>
        </div>
      </div>

      <div className="df-reports__bottleneck-bars">
        {/* Sales Manager Stage */}
        <div className="df-reports__bottleneck-bars-stage">
          <div className="df-reports__bottleneck-bars-stage-header">
            <span>Sales Manager Review</span>
            <span className="df-reports__bottleneck-bars-stage-time">{managerHours.toFixed(1)} hrs avg</span>
          </div>
          <div className="df-reports__bottleneck-bars-progress-track">
            <div
              className="df-reports__bottleneck-bars-progress-fill df-reports__bottleneck-bars-progress-fill--manager"
              style={{ width: `${managerPct}%` }}
            />
          </div>
        </div>

        {/* Finance Escalation Stage */}
        <div className="df-reports__bottleneck-bars-stage">
          <div className="df-reports__bottleneck-bars-stage-header">
            <span>Finance Review (High Risk)</span>
            <span className="df-reports__bottleneck-bars-stage-time">{financeHours.toFixed(1)} hrs avg</span>
          </div>
          <div className="df-reports__bottleneck-bars-progress-track">
            <div
              className="df-reports__bottleneck-bars-progress-fill df-reports__bottleneck-bars-progress-fill--finance"
              style={{ width: `${financePct}%` }}
            />
          </div>
        </div>

        {/* Overall Cycle */}
        <div className="df-reports__bottleneck-bars-stage">
          <div className="df-reports__bottleneck-bars-stage-header">
            <span>Overall Turnaround</span>
            <span className="df-reports__bottleneck-bars-stage-time">{overallHours.toFixed(1)} hrs avg</span>
          </div>
          <div className="df-reports__bottleneck-bars-progress-track">
            <div
              className="df-reports__bottleneck-bars-progress-fill df-reports__bottleneck-bars-progress-fill--overall"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="df-reports__bottleneck-stats-row">
        <div className="df-reports__bottleneck-stats-row-stat">
          <div className="val">{totalRequested}</div>
          <div className="lbl">Submitted</div>
        </div>
        <div className="df-reports__bottleneck-stats-row-stat">
          <div className="val">{totalApproved}</div>
          <div className="lbl">Approved</div>
        </div>
        <div className="df-reports__bottleneck-stats-row-stat">
          <div className="val">{approvalRate}%</div>
          <div className="lbl">Pass Rate</div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ApprovalBottleneckChart);
