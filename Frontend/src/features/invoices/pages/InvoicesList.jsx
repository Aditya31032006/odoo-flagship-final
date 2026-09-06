import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { invoiceApi } from '../services/invoice.api.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import { useInfiniteScroll } from '../../../shared/hooks/useInfiniteScroll.js';
import InfiniteScrollSentinel from '../../../shared/components/InfiniteScrollSentinel.jsx';
import '../styles/invoices.scss';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InvoicesList = () => {
  const navigate = useNavigate();

  const [statusCounts, setStatusCounts] = useState({ unpaid_count: 0, paid_count: 0, total_count: 0 });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    items: invoices,
    loadingInitial,
    loadingMore,
    hasMore,
    totalCount,
    sentinelRef,
  } = useInfiniteScroll({
    fetchFunction: async (page, limit) => {
      const data = await invoiceApi.getInvoices({
        status: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      if (data?.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
      return {
        data: data?.invoices || [],
        pagination: data?.pagination,
      };
    },
    dependencies: [selectedFilter, debouncedSearch],
    limit: 10,
  });

  const handleFilterClick = (status) => {
    setSelectedFilter((prev) => (prev === status ? 'all' : status));
  };

  const handleRowClick = (invId) => {
    navigate(`/invoices/${invId}`);
  };

  return (
    <div className="df-invoices">
      <div className="df-invoices__container">
        {/* Page Header matching Wireframe #12 */}
        <div className="df-invoices__header">
          <div className="df-invoices__title-row">
            <div>
              <h1 className="df-invoices__title">Invoices (List)</h1>
              <p className="df-invoices__subtitle">
                Every invoice generated from one-time and recurring orders
              </p>
            </div>
            <button
              type="button"
              className="df-cta-btn"
              onClick={() => navigate('/invoices/new')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Invoice
            </button>
          </div>
        </div>

        {/* Status Filter Cards & Search Toolbar */}
        <div className="df-toolbar-row">
          <div className="df-invoices__status-cards" style={{ margin: 0 }}>
            <button
              type="button"
              className={`df-invoices__status-card df-invoices__status-card--unpaid ${selectedFilter === 'unpaid' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('unpaid')}
            >
              {statusCounts.unpaid_count || 0} Unpaid
            </button>
            <button
              type="button"
              className={`df-invoices__status-card df-invoices__status-card--paid ${selectedFilter === 'paid' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('paid')}
            >
              {statusCounts.paid_count || 0} Paid
            </button>
            {selectedFilter !== 'all' && (
              <button
                type="button"
                className="df-invoices__status-card df-invoices__status-card--all"
                onClick={() => setSelectedFilter('all')}
              >
                Show All ({statusCounts.total_count || totalCount || invoices.length})
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
              placeholder="Search by invoice #, customer..."
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

        {/* Invoices Table */}
        <div className="df-invoices__table-wrapper">
          <table className="df-invoices__table df-invoices__table--clickable">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loadingInitial ? (
                <tr>
                  <td colSpan="5" className="df-invoices__loading">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="df-invoices__empty">
                    {searchQuery ? 'No invoices match your search.' : 'No invoices found for the selected view.'}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.status === 'paid' || parseFloat(inv.paid_amount) >= parseFloat(inv.grand_total);
                  const statusLabel = isPaid ? 'Paid' : (parseFloat(inv.paid_amount) > 0 ? 'Partially Paid' : 'Unpaid');
                  const badgeClass = isPaid ? 'paid' : (parseFloat(inv.paid_amount) > 0 ? 'partially_paid' : 'unpaid');

                  return (
                    <tr key={inv.id} onClick={() => handleRowClick(inv.id)}>
                      <td>
                        <strong>{inv.invoice_number}</strong>
                      </td>
                      <td>{inv.customer_name || 'Customer'}</td>
                      <td>{formatCurrency(inv.grand_total)}</td>
                      <td>
                        <span className={`df-invoices__badge df-invoices__badge--${badgeClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>{formatDate(inv.due_date)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loading={loadingMore}
          hasMore={hasMore}
          count={invoices.length}
          total={totalCount}
          itemName="invoices"
        />
      </div>
    </div>
  );
};

export default React.memo(InvoicesList);
