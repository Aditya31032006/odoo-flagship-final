import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { invoiceApi } from '../services/invoice.api.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
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

  const [invoices, setInvoices] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ unpaid_count: 0, paid_count: 0, total_count: 0 });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const filteredInvoices = useMemo(() => {
    if (!debouncedSearch.trim()) return invoices;
    const q = debouncedSearch.trim().toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.order_number?.toLowerCase().includes(q) ||
        inv.status?.toLowerCase().includes(q)
    );
  }, [invoices, debouncedSearch]);

  const fetchInvoices = useCallback(async (filter) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await invoiceApi.getInvoices(filter);
      if (data) {
        setInvoices(data.invoices || []);
        if (data.statusCounts) setStatusCounts(data.statusCounts);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Unable to load invoices from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(selectedFilter);
  }, [fetchInvoices, selectedFilter]);

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
              className="df-btn-primary df-invoices__btn-payment"
              onClick={() => navigate('/invoices/new')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Invoice
            </button>
          </div>
        </div>

        {/* Status Filter Cards & Search Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
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
                Show All ({statusCounts.total_count || invoices.length})
              </button>
            )}
          </div>

          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search by invoice #, customer, order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.5rem 2rem 0.5rem 0.8rem',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="df-invoices__table-wrapper">
          {isLoading ? (
            <div className="df-invoices__loading">Loading invoices...</div>
          ) : error ? (
            <div className="df-invoices__empty">{error}</div>
          ) : (
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
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="df-invoices__empty">
                      {searchQuery ? 'No invoices match your search.' : 'No invoices found for the selected view.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
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
          )}
        </div>

       
      </div>
    </div>
  );
};

export default React.memo(InvoicesList);
