import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { invoiceApi } from '../services/invoice.api.js';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
              className="df-invoices__btn-payment"
              onClick={() => navigate('/invoices/new')}
            >
              + New Invoice
            </button>
          </div>
        </div>

        {/* Status Filter Cards */}
        <div className="df-invoices__status-cards">
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
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="df-invoices__empty">
                      No invoices found for the selected view.
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
          )}
        </div>

        {/* Hint Box Bar matching Wireframe #12 */}
        <div className="df-invoices__hint-bar">
          <span>Click an invoice row to open its full payment and delivery reconciliation detail.</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvoicesList);
