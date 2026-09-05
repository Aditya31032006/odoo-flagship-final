import React from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import useQuotationForm from '../hook/useQuotationForm.js';
import useAuth from '../../auth/hook/useAuth.js';
import QuotationLineItemsTable from '../components/QuotationLineItemsTable.jsx';
import DiscountAlertBanner from '../components/DiscountAlertBanner.jsx';
import UpsellSuggestionsWidget from '../components/UpsellSuggestionsWidget.jsx';
import NegotiationPanel from '../components/NegotiationPanel.jsx';
import quotationApi from '../services/quotation.api.js';
import '../styles/quotationDetail.scss';

function formatCurrency(val) {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

export const QuotationDetail = ({ isNew = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const targetId = isNew ? 'new' : id;

  const {
    customers,
    priceLists,
    products,
    upsellSuggestions,
    selectedCustomer,
    tierMaxDiscount,

    quotationNumber,
    customerId,
    priceListId,
    status,
    validUntil,
    lineItems,
    calculatedTotals,

    setPriceListId,
    setValidUntil,
    handleCustomerChange,
    addProductLine,
    updateLineItem,
    removeLineItem,
    addUpsellSuggestion,

    isLoading,
    isSaving,
    error,
    successMessage,
    clearError,
    saveDraft,
    submitForApproval,
  } = useQuotationForm({ quotationId: targetId });

  const handleSaveDraft = async () => {
    const res = await saveDraft();
    if (res) {
      setTimeout(() => {
        navigate('/quotations');
      }, 1000);
    }
  };

  const handleSubmitApproval = async () => {
    const res = await submitForApproval();
    if (res) {
      setTimeout(() => {
        navigate('/quotations');
      }, 1200);
    }
  };

  if (isLoading) {
    return (
      <div className="df-quotation-detail">
        <div className="df-quotation-detail__loading-state">Loading quotation details...</div>
      </div>
    );
  }

  const titleText = quotationNumber
    ? `Quotation Detail: ${quotationNumber}`
    : 'New Quotation Formation';
  const customerName = selectedCustomer?.company_name || 'Select Customer';

  return (
    <div className="df-quotation-detail">
      <div className="df-quotation-detail__container">
        {/* Navigation & Header matching Wireframe #4 */}
        <Link to="/quotations" className="df-quotation-detail__back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Quotations List
        </Link>

        <header className="df-quotation-detail__header">
          <div className="df-quotation-detail__title-group">
            <h1>
              <span>{titleText}</span>
              {selectedCustomer && (
                <span className="customer-tag">({selectedCustomer.company_name})</span>
              )}
              {status && (
                <span className={`status-pill status-pill--${status}`}>
                  {status.replace('_', ' ')}
                </span>
              )}
            </h1>
            <p>Add products, apply line discounts, review live limit ceilings, and assess upsells.</p>
          </div>
        </header>

        {/* Notifications & Error Alerts */}
        {error && (
          <div className="df-quotation-detail__error-alert">
            <span>{error}</span>
            <button onClick={clearError} className="df-quotation-detail__alert-close-btn">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="df-quotation-detail__success-alert">
            ✓ {successMessage}
          </div>
        )}

        {/* Top Controls matching Wireframe #4: Customer & Price List */}
        <section className="df-quotation-detail__meta-controls">
          <div className="df-quotation-detail__field-group">
            <label>
              Customer
              {selectedCustomer?.tier_name && (
                <span className="tier-indicator">
                  {selectedCustomer.tier_name} Tier (Max {tierMaxDiscount}%)
                </span>
              )}
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              <option value="" disabled>
                Select B2B Customer Company...
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} {c.tier_name ? `— [${c.tier_name} Tier]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="df-quotation-detail__field-group">
            <label>Price List</label>
            <select
              value={priceListId}
              onChange={(e) => setPriceListId(e.target.value)}
            >
              <option value="">Default Catalog Standard Pricing</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.currency})
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Line Items Table matching Wireframe #4 */}
        <section aria-label="Quotation Line Items">
          <QuotationLineItemsTable
            lineItems={lineItems}
            products={products}
            tierMaxDiscount={tierMaxDiscount}
            onUpdateLine={updateLineItem}
            onRemoveLine={removeLineItem}
            onAddLine={addProductLine}
          />
        </section>

        {/* Live Discount Limit Alert Banner matching Wireframe #4 */}
        <DiscountAlertBanner
          hasExcess={calculatedTotals.hasExcess}
          blendedRiskScore={calculatedTotals.blendedRiskScore}
          riskLevel={calculatedTotals.riskLevel}
          matchingRule={calculatedTotals.matchingRule}
        />

        {/* Upsell and Cross-Sell Suggestions Widget matching Wireframe #4 */}
        <UpsellSuggestionsWidget
          suggestions={upsellSuggestions}
          onAddSuggestion={addUpsellSuggestion}
        />

        {/* Real-time Deal Negotiation Hub (Active for existing quotes) */}
        {!isNew && targetId !== 'new' && (
          <NegotiationPanel
            quotationId={targetId}
            quotation={{
              id: targetId,
              status,
              quotation_number: quotationNumber,
              grand_total: calculatedTotals.grandTotal,
            }}
            quotationItems={lineItems}
            onQuotationUpdated={() => {
              // Reload page to reflect confirmed/negotiating state updates
              window.location.reload();
            }}
          />
        )}

        {/* Bottom Actions Bar */}
        <footer className="df-quotation-detail__actions-bar">
          <div className="totals-summary">
            <div className="total-group">
              <span className="label">Subtotal</span>
              <span className="val df-quotation-detail__total-val--subtotal">
                {formatCurrency(calculatedTotals.subtotal)}
              </span>
            </div>

            {calculatedTotals.discountTotal > 0 && (
              <div className="total-group">
                <span className="label">Discount</span>
                <span className="val df-quotation-detail__total-val--discount">
                  -{formatCurrency(calculatedTotals.discountTotal)}
                </span>
              </div>
            )}

            {calculatedTotals.taxTotal > 0 && (
              <div className="total-group">
                <span className="label">Tax / GST</span>
                <span className="val df-quotation-detail__total-val--tax">
                  +{formatCurrency(calculatedTotals.taxTotal)}
                </span>
              </div>
            )}

            <div className="total-group">
              <span className="label">Grand Total</span>
              <span className="val">{formatCurrency(calculatedTotals.grandTotal)}</span>
            </div>
          </div>

          {isCustomer ? (
            <div className="buttons-group">
              {status === 'payment' ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '8px',
                  color: '#818cf8',
                  fontWeight: 600,
                  fontSize: '0.9375rem'
                }}>
                  🎉 Paid &amp; Completed
                </div>
              ) : status === 'shipment' ? (
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  }}
                  onClick={async () => {
                    if (window.confirm(`Confirm payment of ${formatCurrency(calculatedTotals.grandTotal)}?`)) {
                      try {
                        await quotationApi.payQuotation(id);
                        window.location.reload();
                      } catch (err) {
                        alert(err.customMessage || 'Payment failed');
                      }
                    }
                  }}
                >
                  💳 Pay Now ({formatCurrency(calculatedTotals.grandTotal)})
                </button>
              ) : null}
            </div>
          ) : (
            <div className="buttons-group">
              {status === 'payment' ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '8px',
                  color: '#818cf8',
                  fontWeight: 600,
                  fontSize: '0.9375rem'
                }}>
                  🎉 Status: Payment Completed &amp; Settled
                </div>
              ) : status === 'shipment' ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '8px',
                  color: '#38bdf8',
                  fontWeight: 600,
                  fontSize: '0.9375rem'
                }}>
                  🚚 Status: In Shipment
                </div>
              ) : status === 'confirmed' ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  color: '#34d399',
                  fontWeight: 600,
                  fontSize: '0.9375rem'
                }}>
                  ✅ Order Confirmed &amp; Locked
                </div>
              ) : status === 'approved' ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontWeight: 600,
                    fontSize: '0.9375rem'
                  }}>
                    ✓ Status: Approved
                  </div>

                  <button
                    type="button"
                    className="df-quotation-detail__btn-draft"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Update & Re-save'}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="df-quotation-detail__btn-draft"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Quotation'}
                  </button>

                  <button
                    type="button"
                    className="df-quotation-detail__btn-submit"
                    onClick={handleSubmitApproval}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Filing...' : 'File & Send to Customer'}
                  </button>
                </>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default QuotationDetail;
