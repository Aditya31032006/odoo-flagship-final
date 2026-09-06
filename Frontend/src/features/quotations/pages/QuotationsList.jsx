import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import gsap from 'gsap';
import useQuotations from '../hook/useQuotations.js';
import useAuth from '../../auth/hook/useAuth.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll.js';
import InfiniteScrollSentinel from '../../../shared/components/InfiniteScrollSentinel.jsx';
import { quotationApi } from '../services/quotation.api.js';
import QuotationKanban from '../components/QuotationKanban.jsx';
import QuotationTable from '../components/QuotationTable.jsx';
import '../styles/quotations.scss';

export const QuotationsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFinance = user?.role === 'finance';

  const {
    viewMode,
    kanbanData,
    summary,
    searchQuery,
    selectedStatus,
    toggleViewMode,
    setSearch,
    setStatus,
    isLoading,
  } = useQuotations(true);

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

  // Filter kanban data for finance: only high risk quotations (> 5pt excess)
  const displayKanbanData = React.useMemo(() => {
    if (!isFinance) return kanbanData;
    const filtered = {};
    Object.keys(kanbanData).forEach((stage) => {
      filtered[stage] = (kanbanData[stage] || []).filter(
        (q) => (q.risk_level || '').toLowerCase() === 'high' || Number(q.blended_risk_score || 0) > 5.00
      );
    });
    return filtered;
  }, [kanbanData, isFinance]);

  // Infinite scroll pagination fetcher for List / Table view
  const fetchQuotationsPage = useCallback(
    async (page, limit) => {
      const res = await quotationApi.getQuotations({
        view: 'list',
        status: selectedStatus || '',
        search: debouncedSearch || '',
        page,
        limit,
      });
      return {
        data: res?.data || [],
        pagination: res?.pagination || { total: res?.totalCount || 0 },
      };
    },
    [selectedStatus, debouncedSearch]
  );

  const {
    items: paginatedQuotations,
    loadingInitial,
    loadingMore,
    hasMore,
    total: paginatedTotal,
    sentinelRef,
  } = useInfiniteScroll({
    fetchFunction: fetchQuotationsPage,
    dependencies: [selectedStatus, debouncedSearch],
    limit: 10,
    enabled: viewMode === 'list',
  });

  const filteredList = paginatedQuotations.filter(
    (q) => !isFinance || (q.risk_level || '').toLowerCase() === 'high' || Number(q.blended_risk_score || 0) > 5.00
  );

  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const fields = containerRef.current.querySelectorAll('.gsap-stagger-field');
      if (fields.length > 0) {
        gsap.fromTo(
          fields,
          {
            opacity: 0,
            y: 18,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="df-quotations" ref={containerRef}>
      <div className="df-quotations__container">
        {/* Header matching Wireframe #3 */}
        <header className="df-quotations__header">
          <div className="df-quotations__title-group gsap-stagger-field">
            <h1>Quotations ({viewMode === 'list' ? 'List View' : 'Kanban Pipeline'})</h1>
            <p>
              {viewMode === 'list'
                ? `Showing ${filteredList.length} of ${paginatedTotal || filteredList.length} quotations`
                : 'Interactive drag & drop deal governance stages'}
            </p>
          </div>

          <div className="df-quotations__header-actions gsap-stagger-field">
            <Link to="/quotations/new" className="df-btn-primary df-quotations__btn-primary">
              <svg
                width="16"
                height="16"
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

        {/* Filter and Search Bar matching Wireframe #3 */}
        <div className="df-quotations__controls">
          <div className="df-quotations__search-box gsap-stagger-field">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="df-quotations__search-icon"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by quote #, customer, sales rep..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {localSearch && (
              <button
                type="button"
                className="df-quotations__search-clear"
                onClick={handleClearSearch}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="df-quotations__view-actions">
            <div className="df-quotations__status-filter gsap-stagger-field">
              <select
                value={selectedStatus}
                onChange={(e) => setStatus(e.target.value)}
                className="df-quotations__select"
              >
                <option value="">All Stages</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="negotiating">Negotiating</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipment">Shipment / Fulfillment</option>
                <option value="payment">Payment / Invoiced</option>
              </select>
            </div>

            <button
              type="button"
              className="df-btn-secondary df-quotations__view-toggle gsap-stagger-field"
              onClick={() => toggleViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
            >
              {viewMode === 'kanban' ? (
                <>
                  <svg
                    width="15"
                    height="15"
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
                    width="15"
                    height="15"
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
            kanbanData={displayKanbanData}
            summary={summary || {}}
            onSelectQuotation={handleSelectQuote}
          />
        ) : (
          <div className="df-quotations__table-container">
            {loadingInitial ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#6b7280' }}>
                <p>Loading quotations...</p>
              </div>
            ) : (
              <>
                <QuotationTable
                  quotations={filteredList}
                  onSelectQuotation={handleSelectQuote}
                />
                <InfiniteScrollSentinel
                  sentinelRef={sentinelRef}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  itemsCount={filteredList.length}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationsList;
