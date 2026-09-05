import React from 'react';
import { useNavigate } from 'react-router';
import useApprovals from '../hooks/useApprovals.js';
import '../styles/approvals.scss';

export const ApprovalsList = () => {
  const navigate = useNavigate();
  const {
    counts,
    approvals,
    isLoadingList,
    error,
    filterPendingOnly,
    handleTogglePendingOnly,
  } = useApprovals();

  const handleRowClick = (quotationId) => {
    navigate(`/approvals/${quotationId}`);
  };

  return (
    <div className="df-approvals">
      <div className="df-approvals__container">
        {/* Header */}
        <div className="df-approvals__header">
          <div className="df-approvals__title-row">
            <h1 className="df-approvals__title">Approvals (List)</h1>
          </div>
          <p className="df-approvals__subtitle">
            Every quotation that needs manager's or finance's going through discount approval
          </p>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="df-approvals__banner df-approvals__banner--danger">
            <span>{error}</span>
          </div>
        )}

        {/* KPI Badges / Counts Bar */}
        <div className="df-approvals__kpis">
          <div className="df-approvals__kpi-card df-approvals__kpi-card--pending">
            <span>{counts?.pending_count || 0} Pending</span>
          </div>
          <div className="df-approvals__kpi-card df-approvals__kpi-card--returned">
            <span>{counts?.returned_count || 0} Returned</span>
          </div>
          <div className="df-approvals__kpi-card df-approvals__kpi-card--approved">
            <span>{counts?.approved_count || 0} Approved</span>
          </div>
        </div>

        {/* Approvals Table Card */}
        <div className="df-approvals__card">
          {isLoadingList ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">Loading approvals...</div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">No quotations found</div>
              <p>No quotation discount approval requests match your criteria.</p>
            </div>
          ) : (
            <table className="df-approvals__table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Blended Risk</th>
                  <th>Stage</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((item) => {
                  const riskLevel = item.risk_level?.toUpperCase() || 'LOW';
                  const isPendingStage = item.stage === 'Sales Manager' || item.stage === 'Finance';
                  const isAuto = item.stage === 'Auto-Approved' || item.stage === 'Approved';
                  const isReturned = item.stage === 'Returned for Revision';

                  return (
                    <tr
                      key={item.quotation_id}
                      className="is-clickable"
                      onClick={() => handleRowClick(item.quotation_id)}
                      id={`approval-row-${item.quotation_id}`}
                    >
                      <td>
                        <span className="df-approvals__code">
                          {item.quotation_number || `Q-${item.quotation_id}`}
                        </span>
                      </td>
                      <td>
                        <span className="df-approvals__company">
                          {item.customer_name || 'Customer'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`df-approvals__risk-badge df-approvals__risk-badge--${
                            riskLevel === 'HIGH'
                              ? 'high'
                              : riskLevel === 'MEDIUM'
                              ? 'medium'
                              : 'low'
                          }`}
                        >
                          {riskLevel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`df-approvals__stage-badge ${
                            isAuto
                              ? 'df-approvals__stage-badge--auto'
                              : isPendingStage
                              ? 'df-approvals__stage-badge--sales'
                              : isReturned
                              ? 'df-approvals__stage-badge--returned'
                              : ''
                          }`}
                        >
                          {item.stage}
                        </span>
                      </td>
                      <td>{item.assigned_to || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Info Banner */}
        <div className="df-approvals__banner df-approvals__banner--info">
          <span>Click any row to open its full approval detail, risk breakdown, and audit trail.</span>
        </div>

        {/* Filter Button */}
        <div>
          <button
            type="button"
            className={`df-approvals__filter-btn ${filterPendingOnly ? 'is-active' : ''}`}
            onClick={handleTogglePendingOnly}
          >
            Filter: {filterPendingOnly ? 'Showing Pending Only' : 'Pending Only'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalsList;
