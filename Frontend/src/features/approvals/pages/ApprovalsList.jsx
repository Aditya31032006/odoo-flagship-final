import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import useApprovals from '../hooks/useApprovals.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
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

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredApprovals = useMemo(() => {
    if (!debouncedSearch.trim()) return approvals;
    const q = debouncedSearch.trim().toLowerCase();
    return approvals.filter(
      (item) =>
        item.quotation_number?.toLowerCase().includes(q) ||
        item.customer_name?.toLowerCase().includes(q) ||
        item.stage?.toLowerCase().includes(q) ||
        item.assigned_to?.toLowerCase().includes(q)
    );
  }, [approvals, debouncedSearch]);

  const handleRowClick = (quotationId) => {
    navigate(`/approvals/${quotationId}`);
  };

  return (
    <div className="df-approvals">
      <div className="df-approvals__container">
        {/* Header with Top Right Redirect Buttons */}
        <div className="df-approvals__header">
          <div className="df-approvals__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="df-approvals__title">Approvals (List)</h1>
              <p className="df-approvals__subtitle">
                Every quotation that needs manager's or finance's going through discount approval
              </p>
            </div>

            <div className="df-approvals__header-right">
              <PermissionGate allowedRoles={['admin', 'sales_manager']}>
                <Link
                  to="/discount-rules"
                  className="df-btn-secondary df-approvals__btn-secondary"
                >
                  ⚙ Discount Rules
                </Link>
              </PermissionGate>

              <Link
                to="/quotations"
                className="df-btn-primary df-approvals__btn-primary"
              >
                View Quotations →
              </Link>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="df-approvals__banner df-approvals__banner--danger">
            <span>{error}</span>
          </div>
        )}

        {/* KPI Badges / Counts Bar & Search Input */}
        <div className="df-toolbar-row">
          <div className="df-approvals__kpis" style={{ margin: 0 }}>
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

          <div className="df-search-wrap">
            <span className="df-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="df-search-input"
              placeholder="Search by quote #, customer, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="df-search-clear" onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>


        {/* Approvals Table Card */}
        <div className="df-approvals__card">
          {isLoadingList ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">Loading approvals...</div>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">No quotations found</div>
              <p>{searchQuery ? 'No approval requests match your search criteria.' : 'No quotation discount approval requests match your criteria.'}</p>
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
                {filteredApprovals.map((item) => {
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
