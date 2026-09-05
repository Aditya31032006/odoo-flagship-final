import React, { useState } from 'react';
import { Link } from 'react-router';
import useQuotations from '../hook/useQuotations.js';
import QuotationKanban from '../components/QuotationKanban.jsx';
import QuotationTable from '../components/QuotationTable.jsx';
import '../styles/quotations.scss';

function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString()}`;
}

export const QuotationsList = () => {
  const {
    viewMode,
    kanbanData,
    listData,
    summary,
    totalCount,
    searchQuery,
    selectedStatus,
    toggleViewMode,
    setSearch,
    setStatus,
    refresh,
    isLoading
  } = useQuotations();

  const [selectedQuote, setSelectedQuote] = useState(null);

  // Flatten all quotations for Table View if listData is not separately populated
  const allQuotations = listData && listData.length > 0
    ? listData
    : Object.values(kanbanData).flat();

  return (
    <div className="df-quotations">
      <div className="df-quotations__container">
        {/* Header matching Wireframe #3 */}
        <header className="df-quotations__header">
          <div className="df-quotations__title-group">
            <h1>Quotations (List)</h1>
            <p>Every quotation in the system, one row per quotation, click a row to open it</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/quotations?action=new" className="df-quotations__btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" x2="12" y1="5" y2="19" />
                <line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              + New Quotation
            </Link>
          </div>
        </header>

        {/* Search & Controls Toolbar */}
        <div className="df-quotations__toolbar">
          <div className="df-quotations__search-group">
            <div className="df-quotations__search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by customer, quote #, or sales rep..."
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="df-quotations__controls-group">
            <button
              className="df-quotations__toggle-view-btn"
              onClick={() => toggleViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
              title="Switch view layout"
            >
              {viewMode === 'kanban' ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" x2="21" y1="6" y2="6" />
                    <line x1="8" x2="21" y1="12" y2="12" />
                    <line x1="8" x2="21" y1="18" y2="18" />
                    <line x1="3" x2="3.01" y1="6" y2="6" />
                    <line x1="3" x2="3.01" y1="12" y2="12" />
                    <line x1="3" x2="3.01" y1="18" y2="18" />
                  </svg>
                  Switch to Table View
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="18" x="3" y="3" rx="1" />
                    <rect width="7" height="18" x="14" y="3" rx="1" />
                  </svg>
                  Switch to Kanban View
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Mode: Kanban vs Table */}
        {viewMode === 'kanban' ? (
          <QuotationKanban
            kanbanData={kanbanData}
            summary={summary || {}}
            onSelectQuotation={(quote) => setSelectedQuote(quote)}
          />
        ) : (
          <QuotationTable
            quotations={allQuotations}
            onSelectQuotation={(quote) => setSelectedQuote(quote)}
          />
        )}

        {/* Detail Modal */}
        {selectedQuote && (
          <div className="df-modal-backdrop" onClick={() => setSelectedQuote(null)}>
            <div className="df-quote-modal" onClick={(e) => e.stopPropagation()}>
              <div className="df-quote-modal__header">
                <div>
                  <h2>{selectedQuote.company_name}</h2>
                  <span style={{ fontSize: '0.8125rem', color: '#38bdf8', fontWeight: 600 }}>
                    {selectedQuote.quotation_number}
                  </span>
                </div>
                <button onClick={() => setSelectedQuote(null)}>✕</button>
              </div>

              <div className="df-quote-modal__body">
                <div className="df-quote-modal__row">
                  <span className="label">Status Stage</span>
                  <span className={`status-pill status-pill--${selectedQuote.status || 'draft'}`}>
                    {selectedQuote.status ? selectedQuote.status.replace('_', ' ') : 'draft'}
                  </span>
                </div>

                <div className="df-quote-modal__row">
                  <span className="label">Sales Representative</span>
                  <span className="value">{selectedQuote.sales_rep_name || 'Unassigned'}</span>
                </div>

                <div className="df-quote-modal__row">
                  <span className="label">Customer Tier</span>
                  <span className="value">{selectedQuote.tier_name || 'Standard Tier'}</span>
                </div>

                <div className="df-quote-modal__row">
                  <span className="label">Risk Assessment</span>
                  <span className={`risk-pill risk-pill--${selectedQuote.risk_level || 'low'}`}>
                    {selectedQuote.risk_level || 'low'} risk ({selectedQuote.blended_risk_score || 0} pts)
                  </span>
                </div>

                {selectedQuote.valid_until && (
                  <div className="df-quote-modal__row">
                    <span className="label">Valid Until</span>
                    <span className="value">{new Date(selectedQuote.valid_until).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="df-quote-modal__totals">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedQuote.subtotal || selectedQuote.grand_total)}</span>
                  </div>
                  {Number(selectedQuote.discount_total) > 0 && (
                    <div className="total-row" style={{ color: '#f87171' }}>
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedQuote.discount_total)}</span>
                    </div>
                  )}
                  {Number(selectedQuote.tax_total) > 0 && (
                    <div className="total-row">
                      <span>Tax / GST</span>
                      <span>+{formatCurrency(selectedQuote.tax_total)}</span>
                    </div>
                  )}
                  <div className="total-row total-row--grand">
                    <span>Grand Total</span>
                    <span>{formatCurrency(selectedQuote.grand_total)}</span>
                  </div>
                </div>
              </div>

              <div className="df-quote-modal__footer">
                <button
                  className="df-quotations__toggle-view-btn"
                  onClick={() => setSelectedQuote(null)}
                >
                  Close
                </button>
                <Link
                  to={`/quotations/${selectedQuote.id || 1}`}
                  className="df-quotations__btn-primary"
                >
                  Open Full Detail View →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationsList;
