import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../auth/hook/useAuth.js';
import quotationApi from '../services/quotation.api.js';
import NegotiationPanel from '../components/NegotiationPanel.jsx';
import '../styles/myQuotations.scss';

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString()}`;
}

export default function MyQuotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Selected quotation for detail & negotiation modal
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteDetail, setQuoteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch company quotations
  const fetchCompanyQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await quotationApi.getQuotations({ view: 'list' });
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load customer quotations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyQuotations();
  }, [fetchCompanyQuotations]);

  // Fetch full details when opening a quotation
  const openQuoteDetail = async (quote) => {
    setSelectedQuote(quote);
    setLoadingDetail(true);
    try {
      const detail = await quotationApi.getQuotationById(quote.id);
      setQuoteDetail(detail);
    } catch (err) {
      console.error('Failed to load quotation details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeQuoteDetail = () => {
    setSelectedQuote(null);
    setQuoteDetail(null);
  };

  // Filter list
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.quotation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.sales_rep_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || q.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const totalValue = quotations.reduce((acc, q) => acc + Number(q.grand_total || 0), 0);
  const activeCount = quotations.filter((q) => ['sent', 'negotiating', 'approved'].includes(q.status)).length;

  return (
    <div className="df-my-quotes">
      {/* Top Welcome Banner */}
      <div className="df-my-quotes__banner">
        <div className="banner-text">
          <h1>
            Company Quotations & Deals
            <span className="company-pill">{user?.company_name || 'Your Company'}</span>
          </h1>
          <p>Review proposed quotations, request counter-discounts, and negotiate directly with your sales representative.</p>
        </div>

        <div className="banner-stats">
          <div className="stat-chip">
            <span className="num">{quotations.length}</span>
            <span className="label">Total Quotes</span>
          </div>
          <div className="stat-chip">
            <span className="num">{activeCount}</span>
            <span className="label">Active Deals</span>
          </div>
          <div className="stat-chip">
            <span className="num" style={{ color: '#34d399' }}>{formatCurrency(totalValue)}</span>
            <span className="label">Total Pipeline</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="df-my-quotes__controls">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by quote number or sales rep..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="status-filters">
          {['all', 'sent', 'negotiating', 'confirmed'].map((st) => (
            <button
              key={st}
              type="button"
              className={selectedStatus === st ? 'active' : ''}
              onClick={() => setSelectedStatus(st)}
            >
              {st === 'all' ? 'All Quotes' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quotation Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading your company quotations...
        </div>
      ) : filteredQuotations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(15,23,42,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ color: '#f8fafc', marginBottom: '0.5rem' }}>No quotations found</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>There are currently no quotations matching your filter criteria.</p>
        </div>
      ) : (
        <div className="df-my-quotes__grid">
          {filteredQuotations.map((quote) => (
            <div
              key={quote.id}
              className="df-my-quotes__card"
              onClick={() => openQuoteDetail(quote)}
            >
              <div className="card-top">
                <span className="quote-code">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {quote.quotation_number}
                </span>
                <span className={`status-tag status-tag--${quote.status}`}>
                  {quote.status}
                </span>
              </div>

              <div className="card-middle">
                <div className="amount-display">{formatCurrency(quote.grand_total)}</div>
                <div className="meta-row">
                  <span>Items: {quote.item_count || 1}</span>
                  <span>Valid: {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 Days'}</span>
                </div>
              </div>

              <div className="card-bottom">
                <span className="rep-info" title={`Sales Rep: ${quote.sales_rep_name}`}>
                  👤 {quote.sales_rep_name || 'Assigned Sales Rep'}
                </span>
                <button type="button" className="btn-view-deal">
                  Negotiate / View
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quotation Detail & Negotiation Modal */}
      {selectedQuote && (
        <div className="df-my-quotes__detail-modal" onClick={closeQuoteDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" color="#38bdf8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {selectedQuote.quotation_number} - Details & Negotiation
              </h2>
              <button type="button" className="btn-close" onClick={closeQuoteDetail}>
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                Loading line items and negotiation history...
              </div>
            ) : quoteDetail ? (
              <>
                {/* Itemized Table */}
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product & Specification</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteDetail.items?.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>{item.line_number || idx + 1}</td>
                        <td className="item-name">{item.product_name_snapshot}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Live Negotiation Hub */}
                <NegotiationPanel
                  quotationId={selectedQuote.id}
                  quotation={quoteDetail}
                  quotationItems={quoteDetail.items || []}
                  onQuotationUpdated={() => {
                    fetchCompanyQuotations();
                    openQuoteDetail(selectedQuote);
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
