import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import useQuotations from '../hook/useQuotations.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import QuotationKanban from '../components/QuotationKanban.jsx';
import QuotationTable from '../components/QuotationTable.jsx';
import '../styles/quotations.scss';

export const QuotationsList = () => {
  const navigate = useNavigate();
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
    isLoading,
  } = useQuotations();

  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const debouncedSearch = useDebounce(localSearch, 350);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  const handleClearSearch = () => {
    setLocalSearch('');
    setSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearch(localSearch);
    }
  };

  const handleSelectQuote = (quote) => {
    if (quote?.id) {
      navigate(`/quotations/${quote.id}`);
    }
  };

  // Flatten all quotations for Table View if listData is not separately populated
  const allQuotations =
    listData && listData.length > 0
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

          <div className="df-quotations__header-actions">
            <Link to="/quotations/new" className="df-btn-primary df-quotations__btn-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="df-quotations__btn-icon"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Quotation
            </Link>
          </div>
        </header>

        {/* Search & Controls Toolbar */}
        <div className="df-quotations__toolbar">
          <div className="df-quotations__search-group">
            <div className="df-quotations__search-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" x2="16.65" y1="21" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by customer, quote #, or sales rep..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Clear search"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 6px',
                  }}
                >
                  ✕
                </button>
              )}
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="7" height="18" x="3" y="3" rx="1" />
                    <rect width="7" height="18" x="14" y="3" rx="1" />
                  </svg>
                  Switch to Kanban View
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Switch: Kanban or Table */}
        {viewMode === 'kanban' ? (
          <QuotationKanban
            kanbanData={kanbanData}
            summary={summary || {}}
            onSelectQuotation={handleSelectQuote}
          />
        ) : (
          <QuotationTable
            quotations={allQuotations}
            onSelectQuotation={handleSelectQuote}
          />
        )}
      </div>
    </div>
  );
};

export default QuotationsList;
