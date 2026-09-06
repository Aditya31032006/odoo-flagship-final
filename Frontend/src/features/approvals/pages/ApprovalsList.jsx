import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { approvalsApi } from '../services/approvals.api.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import { useInfiniteScroll } from '../../../shared/hooks/useInfiniteScroll.js';
import InfiniteScrollSentinel from '../../../shared/components/InfiniteScrollSentinel.jsx';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import '../styles/approvals.scss';

export const ApprovalsList = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ pending_count: 0, returned_count: 0, approved_count: 0, total_count: 0 });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    items: approvals,
    loadingInitial,
    loadingMore,
    hasMore,
    totalCount,
    sentinelRef,
  } = useInfiniteScroll({
    fetchFunction: async (page, limit) => {
      const res = await approvalsApi.getApprovalsList({
        search: debouncedSearch || undefined,
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        page,
        limit,
      });
      if (res?.data?.counts) {
        setCounts(res.data.counts);
      }
      return {
        data: res?.data?.approvals || [],
        pagination: res?.pagination,
      };
    },
    dependencies: [debouncedSearch, selectedFilter],
    limit: 15,
  });

  const handleFilterClick = (filter) => {
    setSelectedFilter((prev) => (prev === filter ? 'all' : filter));
  };

  const filteredApprovals = useMemo(() => {
    let list = approvals || [];

    if (selectedFilter === 'pending') {
      list = list.filter(
        (item) =>
          item.status === 'pending_approval' ||
          item.stage?.includes('Sales Manager') ||
          item.stage?.includes('Finance') ||
          item.stage === 'Operations' ||
          item.stage === 'Admin'
      );
    } else if (selectedFilter === 'returned') {
      list = list.filter(
        (item) =>
          item.stage === 'Returned for Revision' ||
          item.status === 'returned' ||
          (item.status === 'draft' && item.stage === 'Returned for Revision')
      );
    } else if (selectedFilter === 'approved') {
      list = list.filter(
        (item) =>
          item.status === 'approved' ||
          item.status === 'confirmed' ||
          item.status === 'sent' ||
          item.stage === 'Auto-Approved' ||
          item.stage === 'Approved'
      );
    }

    return list;
  }, [approvals, selectedFilter]);

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

        {/* KPI Badges / Counts Bar & Search Input */}
        <div className="df-toolbar-row">
          <div className="df-approvals__kpis" style={{ margin: 0 }}>
            <button
              type="button"
              className={`df-approvals__kpi-card df-approvals__kpi-card--pending ${selectedFilter === 'pending' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('pending')}
            >
              {counts?.pending_count || 0} Pending
            </button>
            <button
              type="button"
              className={`df-approvals__kpi-card df-approvals__kpi-card--returned ${selectedFilter === 'returned' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('returned')}
            >
              {counts?.returned_count || 0} Returned
            </button>
            <button
              type="button"
              className={`df-approvals__kpi-card df-approvals__kpi-card--approved ${selectedFilter === 'approved' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('approved')}
            >
              {counts?.approved_count || 0} Approved
            </button>
            {selectedFilter !== 'all' && (
              <button
                type="button"
                className="df-approvals__kpi-card df-approvals__kpi-card--all"
                onClick={() => setSelectedFilter('all')}
              >
                Show All ({counts?.total_count ?? totalCount ?? (approvals?.length || 0)})
              </button>
            )}
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
              <button type="button" className="df-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Approvals Table Card */}
        <div className="df-approvals__card">
          {loadingInitial ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">Loading approvals...</div>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="df-approvals__empty">
              <div className="df-approvals__empty-title">No quotations found</div>
              <p>{searchQuery ? 'No approval requests match your search criteria.' : 'No quotation discount approval requests match your selected filter.'}</p>
            </div>
          ) : (
            <>
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
                    const isPendingStage = item.stage?.includes('Sales Manager') || item.stage?.includes('Finance');
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

              <InfiniteScrollSentinel
                sentinelRef={sentinelRef}
                loading={loadingMore}
                hasMore={hasMore}
                count={approvals.length}
                total={totalCount}
                itemName="approvals"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsList;
