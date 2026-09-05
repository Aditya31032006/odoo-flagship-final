import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { subscriptionApi } from '../services/subscription.api.js';
import '../styles/subscriptions.scss';

const formatCycle = (cycle) => {
  if (!cycle) return 'Monthly';
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
};

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
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    subscription_plan_id: '',
    billing_cycle: 'monthly',
    unit_price: '',
    quantity: 1,
  });
  const [isSubmittingModify, setIsSubmittingModify] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    reason: 'Customer requested cancellation',
    is_prorated: true,
    credit_amount: 0,
  });
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionApi.getSubscriptionDetail(id);
      if (data) {
        setDetailData(data);
        if (data.subscription) {
          setModifyForm({
            subscription_plan_id: data.subscription.subscription_plan_id || '',
            billing_cycle: data.subscription.billing_cycle || 'monthly',
            unit_price: data.subscription.unit_price || '',
            quantity: data.subscription.quantity || 1,
          });
          // Estimate credit amount based on unused portion of cycle
          const cyclePrice = parseFloat(data.subscription.unit_price) || 0;
          setCancelForm((prev) => ({
            ...prev,
            credit_amount: (cyclePrice / 2).toFixed(2),
            is_prorated: Boolean(data.subscription.allow_proration),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load subscription detail:', err);
      setError('Subscription details could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleModifyChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subscription_plan_id') {
      const selectedPlan = detailData?.availablePlans?.find((p) => String(p.id) === String(value));
      setModifyForm((prev) => ({
        ...prev,
        subscription_plan_id: value,
        billing_cycle: selectedPlan?.billing_cycle || prev.billing_cycle,
        unit_price: selectedPlan?.price || prev.unit_price,
      }));
    } else {
      setModifyForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingModify(true);
      await subscriptionApi.modifySubscription(id, {
        subscription_plan_id: modifyForm.subscription_plan_id,
        billing_cycle: modifyForm.billing_cycle,
        unit_price: parseFloat(modifyForm.unit_price),
        quantity: parseInt(modifyForm.quantity, 10),
      });
      setIsModifyModalOpen(false);
      alert('Subscription configuration updated successfully in PostgreSQL database!');
      fetchDetail();
    } catch (err) {
      console.error('Failed to modify subscription:', err);
      alert(err.response?.data?.message || 'Failed to modify subscription');
    } finally {
      setIsSubmittingModify(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingCancel(true);
      await subscriptionApi.cancelSubscription(id, cancelForm);
      setIsCancelModalOpen(false);
      alert('Subscription has been cancelled and credit note schedule recorded.');
      fetchDetail();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      alert(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="df-subscriptions">
        <div className="df-subscriptions__container">
          <div className="df-subscriptions__loading">Loading billing details...</div>
        </div>
      </div>
    );
  }

  if (error || !detailData?.subscription) {
    return (
      <div className="df-subscriptions">
        <div className="df-subscriptions__container">
          <div className="df-subscriptions__header">
            <button
              type="button"
              className="df-subscriptions__back-btn"
              onClick={() => navigate('/subscriptions')}
            >
              ← Back to Subscriptions
            </button>
          </div>
          <div className="df-subscriptions__empty">{error || 'Subscription not found'}</div>
        </div>
      </div>
    );
  }

  const { subscription, oneTimeLines = [], billingLines = [], availablePlans = [] } = detailData;
  const isCancelled = subscription.status === 'cancelled';

  return (
    <div className="df-subscriptions">
      <div className="df-subscriptions__container">
        {/* Page Header */}
        <div className="df-subscriptions__header">
          <div className="df-subscriptions__title-row">
            <h1 className="df-subscriptions__title">
              Billing Detail: {subscription.customer_name || 'Customer'} - {subscription.plan_name || 'Plan'}
            </h1>
            <button
              type="button"
              className="df-subscriptions__back-btn"
              onClick={() => navigate('/subscriptions')}
            >
              ← Back to Subscriptions
            </button>
          </div>
          <p className="df-subscriptions__subtitle">
            Opened by clicking a row on the Subscriptions list
          </p>
        </div>

        {/* Info Highlights Card */}
        <div className="df-subscriptions__info-card">
          <div className="df-subscriptions__info-item">
            <span className="df-subscriptions__info-item-label">Customer</span>
            <span className="df-subscriptions__info-item-val">{subscription.customer_name}</span>
          </div>
          <div className="df-subscriptions__info-item">
            <span className="df-subscriptions__info-item-label">Current Status</span>
            <span className={`df-subscriptions__badge df-subscriptions__badge--${subscription.status}`}>
              {subscription.status}
            </span>
          </div>
          <div className="df-subscriptions__info-item">
            <span className="df-subscriptions__info-item-label">Originating Order</span>
            <span className="df-subscriptions__info-item-val">
              {subscription.order_number || (subscription.order_id ? `Order #${subscription.order_id}` : 'Direct Plan')}
            </span>
          </div>
          <div className="df-subscriptions__info-item">
            <span className="df-subscriptions__info-item-label">Billing Cycle</span>
            <span className="df-subscriptions__info-item-val">
              {formatCycle(subscription.billing_cycle)}
            </span>
          </div>
        </div>

        {/* Section 1: One-Time Lines (from originating order) */}
        <div className="df-subscriptions__section-header">
          <h2 className="df-subscriptions__section-title">
            One-Time Lines (from originating order)
          </h2>
        </div>

        <div className="df-subscriptions__table-wrapper">
          <table className="df-subscriptions__table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {oneTimeLines.length === 0 ? (
                <tr>
                  <td colSpan="3" className="df-subscriptions__empty">
                    No one-time products associated with originating order.
                  </td>
                </tr>
              ) : (
                oneTimeLines.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_name}</strong>
                      {item.sku && <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.8rem' }}>({item.sku})</span>}
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.line_total || item.unit_price * item.quantity)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Section 2: Recurring Lines */}
        <div className="df-subscriptions__section-header">
          <h2 className="df-subscriptions__section-title">
            Recurring Lines
          </h2>
        </div>

        <div className="df-subscriptions__table-wrapper">
          <table className="df-subscriptions__table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Next Bill Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{subscription.plan_name}</strong>
                </td>
                <td>{formatCycle(subscription.billing_cycle)}</td>
                <td>{subscription.status === 'active' ? formatDate(subscription.next_bill_date) : '-'}</td>
                <td>{formatCurrency(subscription.unit_price * (subscription.quantity || 1))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Detailed Billing Periods / Schedule */}
        {billingLines.length > 0 && (
          <>
            <div className="df-subscriptions__section-header">
              <h2 className="df-subscriptions__section-title" style={{ color: '#94a3b8', fontSize: '1rem' }}>
                Billing Schedule & Proration History
              </h2>
            </div>
            <div className="df-subscriptions__table-wrapper">
              <table className="df-subscriptions__table">
                <thead>
                  <tr>
                    <th>Billing Period</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Credit Note</th>
                  </tr>
                </thead>
                <tbody>
                  {billingLines.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {formatDate(b.billing_period_start)} – {formatDate(b.billing_period_end)}
                      </td>
                      <td style={{ color: Number(b.amount) < 0 ? '#fb7185' : 'inherit' }}>
                        {formatCurrency(b.amount)}
                      </td>
                      <td>
                        {b.is_prorated ? (
                          <span className="df-subscriptions__badge df-subscriptions__badge--paused">
                            Prorated
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Regular Cycle</span>
                        )}
                      </td>
                      <td>
                        {b.credit_note_required ? (
                          <span className="df-subscriptions__badge df-subscriptions__badge--cancelled">
                            Credit Note Required
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Action Buttons matching Wireframe #10 */}
        <div className="df-subscriptions__actions-row">
          <button
            type="button"
            className="df-subscriptions__btn-modify"
            onClick={() => setIsModifyModalOpen(true)}
            disabled={isCancelled}
            title={isCancelled ? 'Cancelled subscriptions cannot be modified' : ''}
          >
            Modify Subscription
          </button>
          <button
            type="button"
            className="df-subscriptions__btn-cancel"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={isCancelled}
            title={isCancelled ? 'Subscription is already cancelled' : ''}
          >
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Modal: Modify Subscription */}
      {isModifyModalOpen && (
        <div className="df-sub-modal">
          <div className="df-sub-modal__content">
            <div className="df-sub-modal__header">
              <h3>Modify Subscription</h3>
              <button
                type="button"
                className="df-sub-modal__close-btn"
                onClick={() => setIsModifyModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleModifySubmit}>
              <div className="df-sub-modal__body">
                {/* Current vs New comparison summary */}
                <div style={{ background: '#1e293b', padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Current Configuration</div>
                  <div style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600 }}>
                    {subscription.plan_name} • {formatCycle(subscription.billing_cycle)} • {formatCurrency(subscription.unit_price)}
                  </div>
                </div>

                <div className="df-sub-modal__field">
                  <label>Select Plan</label>
                  <select
                    name="subscription_plan_id"
                    value={modifyForm.subscription_plan_id}
                    onChange={handleModifyChange}
                  >
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {formatCycle(plan.billing_cycle)} ({formatCurrency(plan.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="df-sub-modal__field">
                  <label>Billing Cycle</label>
                  <select
                    name="billing_cycle"
                    value={modifyForm.billing_cycle}
                    onChange={handleModifyChange}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="df-sub-modal__field">
                  <label>Price Per Cycle ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="unit_price"
                    required
                    value={modifyForm.unit_price}
                    onChange={handleModifyChange}
                  />
                </div>

                <div className="df-sub-modal__field">
                  <label>Quantity / License Units</label>
                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={modifyForm.quantity}
                    onChange={handleModifyChange}
                  />
                </div>

                {subscription.allow_proration && (
                  <p style={{ color: '#38bdf8', fontSize: '0.8rem', margin: 0 }}>
                    ℹ Proration policy enabled: Mid-cycle changes will generate an updated proration billing line.
                  </p>
                )}
              </div>

              <div className="df-sub-modal__footer">
                <button
                  type="button"
                  className="df-sub-modal__btn-cancel"
                  onClick={() => setIsModifyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="df-sub-modal__btn-submit"
                  disabled={isSubmittingModify}
                >
                  {isSubmittingModify ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Subscription */}
      {isCancelModalOpen && (
        <div className="df-sub-modal">
          <div className="df-sub-modal__content">
            <div className="df-sub-modal__header">
              <h3>Cancel Subscription Confirmation</h3>
              <button
                type="button"
                className="df-sub-modal__close-btn"
                onClick={() => setIsCancelModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCancelSubmit}>
              <div className="df-sub-modal__body">
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to cancel the recurring subscription for{' '}
                  <strong>{subscription.customer_name}</strong>?
                </p>

                <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', fontSize: '0.8125rem' }}>
                  <div style={{ color: '#94a3b8' }}>Plan Policy:</div>
                  <div style={{ color: subscription.allow_cancellation ? '#4ade80' : '#fb7185' }}>
                    • Cancellation: {subscription.allow_cancellation ? 'Permitted' : 'Not Permitted'}
                  </div>
                  <div style={{ color: subscription.allow_partial_refund ? '#4ade80' : '#fbbf24' }}>
                    • Partial Refund / Credit Note: {subscription.allow_partial_refund ? 'Supported' : 'Disallowed'}
                  </div>
                </div>

                <div className="df-sub-modal__field">
                  <label>Cancellation Reason</label>
                  <textarea
                    rows="2"
                    value={cancelForm.reason}
                    onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  />
                </div>

                {subscription.allow_partial_refund !== false && (
                  <>
                    <div className="df-sub-modal__field">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={cancelForm.is_prorated}
                          onChange={(e) =>
                            setCancelForm({ ...cancelForm, is_prorated: e.target.checked })
                          }
                        />
                        <span>Issue prorated credit note for unused period</span>
                      </label>
                    </div>

                    {cancelForm.is_prorated && (
                      <div className="df-sub-modal__field">
                        <label>Prorated Credit Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cancelForm.credit_amount}
                          onChange={(e) =>
                            setCancelForm({ ...cancelForm, credit_amount: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="df-sub-modal__footer">
                <button
                  type="button"
                  className="df-sub-modal__btn-cancel"
                  onClick={() => setIsCancelModalOpen(false)}
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  className="df-sub-modal__btn-submit df-sub-modal__btn-submit--danger"
                  disabled={isSubmittingCancel}
                >
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SubscriptionDetail);
