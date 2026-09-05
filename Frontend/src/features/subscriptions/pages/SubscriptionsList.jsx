import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { subscriptionApi } from '../services/subscription.api.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/subscriptions.scss';

const formatCycle = (cycle) => {
  if (!cycle) return 'Monthly';
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
};

const formatDate = (dateStr, status) => {
  if (status === 'paused' || status === 'cancelled') return '-';
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const SubscriptionsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useSelector((state) => state.auth?.user);

  const [subscriptions, setSubscriptions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const filteredSubscriptions = useMemo(() => {
    if (!debouncedSearch.trim()) return subscriptions;
    const q = debouncedSearch.trim().toLowerCase();
    return subscriptions.filter(
      (s) =>
        s.customer_name?.toLowerCase().includes(q) ||
        s.plan_name?.toLowerCase().includes(q) ||
        s.billing_cycle?.toLowerCase().includes(q) ||
        s.order_number?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q)
    );
  }, [subscriptions, debouncedSearch]);

  // Modal State for "+ New Plan (Admin)"
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  const {
    register: registerPlan,
    handleSubmit: handleSubmitPlan,
    reset: resetPlanForm,
    formState: { errors: planErrors },
  } = useForm({
    defaultValues: {
      name: '',
      billing_cycle: 'monthly',
      price: '',
      allow_proration: true,
      allow_cancellation: true,
      allow_partial_refund: false,
    },
  });

  const fetchSubscriptions = useCallback(async (filter) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionApi.getSubscriptions(filter);
      if (data) {
        setSubscriptions(data.subscriptions || []);
        setStatusCounts(data.statusCounts || {});
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setError('Subscriptions could not be loaded from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions(selectedFilter);
  }, [fetchSubscriptions, selectedFilter]);

  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
  };

  const handleRowClick = (subId) => {
    navigate(`/subscriptions/${subId}`);
  };

  const handlePlanSubmit = async (formData) => {
    try {
      setIsSubmittingPlan(true);
      await subscriptionApi.createPlan({
        name: formData.name,
        billing_cycle: formData.billing_cycle,
        price: parseFloat(formData.price),
        allow_proration: Boolean(formData.allow_proration),
        allow_cancellation: Boolean(formData.allow_cancellation),
        allow_partial_refund: Boolean(formData.allow_partial_refund),
      });

      setIsPlanModalOpen(false);
      resetPlanForm();
      toast.success('Subscription plan created successfully!');
      fetchSubscriptions(selectedFilter);
    } catch (err) {
      console.error('Failed to create plan:', err);
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  return (
    <div className="df-subscriptions">
      <div className="df-subscriptions__container">
        {/* Page Header with Top Right Action */}
        <div className="df-subscriptions__header">
          <div className="df-subscriptions__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="df-subscriptions__title">Subscriptions (List)</h1>
              <p className="df-subscriptions__subtitle">
                Every recurring plan across every customer, regardless of which order it came from
              </p>
            </div>
            <PermissionGate allowedRoles={['admin', 'finance']}>
              <button
                type="button"
                className="df-btn-primary df-subscriptions__btn-primary"
                onClick={() => setIsPlanModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Master Plan
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Search & Status KPI Cards matching Wireframe #9 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="df-subscriptions__status-cards" style={{ margin: 0 }}>
            <button
              type="button"
              className={`df-subscriptions__status-card df-subscriptions__status-card--active ${selectedFilter === 'active' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('active')}
            >
              {statusCounts.active_count ?? 0} Active
            </button>
            <button
              type="button"
              className={`df-subscriptions__status-card df-subscriptions__status-card--paused ${selectedFilter === 'paused' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('paused')}
            >
              {statusCounts.paused_count ?? 0} Paused
            </button>
            <button
              type="button"
              className={`df-subscriptions__status-card df-subscriptions__status-card--cancelled ${selectedFilter === 'cancelled' ? 'is-selected' : ''}`}
              onClick={() => handleFilterClick('cancelled')}
            >
              {statusCounts.cancelled_count ?? 0} Cancelled
            </button>
            {selectedFilter !== 'all' && (
              <button
                type="button"
                className="df-subscriptions__status-card df-subscriptions__status-card--all"
                onClick={() => setSelectedFilter('all')}
              >
                Show All ({statusCounts.total_count ?? subscriptions.length})
              </button>
            )}
          </div>

          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search plan, customer, order..."
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

        {/* Subscriptions Table */}
        <div className="df-subscriptions__table-wrapper">
          {isLoading ? (
            <div className="df-subscriptions__loading">Loading subscriptions...</div>
          ) : error ? (
            <div className="df-subscriptions__empty">{error}</div>
          ) : (
            <table className="df-subscriptions__table df-subscriptions__table--clickable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Cycle</th>
                  <th>Next Bill</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="df-subscriptions__empty">
                      {searchQuery ? 'No subscriptions match your search.' : 'No subscriptions found for the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} onClick={() => handleRowClick(sub.id)}>
                      <td>
                        <strong>{sub.customer_name || 'N/A'}</strong>
                      </td>
                      <td>{sub.plan_name || 'N/A'}</td>
                      <td>{formatCycle(sub.billing_cycle)}</td>
                      <td>{formatDate(sub.next_bill_date, sub.status)}</td>
                      <td>
                        <span className={`df-subscriptions__badge df-subscriptions__badge--${sub.status}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        

        {/* + New Plan (Admin) Action */}
        <div className="df-subscriptions__actions-row">
          <button
            type="button"
            className="df-subscriptions__btn-admin"
            onClick={() => setIsPlanModalOpen(true)}
          >
            + New Plan (Admin)
          </button>
        </div>
      </div>

      {/* Modal: + New Plan */}
      {isPlanModalOpen && (
        <div className="df-sub-modal">
          <div className="df-sub-modal__content">
            <div className="df-sub-modal__header">
              <h3>Create Subscription Plan</h3>
              <button
                type="button"
                className="df-sub-modal__close-btn"
                onClick={() => setIsPlanModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitPlan(handlePlanSubmit)} noValidate>
              <div className="df-sub-modal__body">
                <div className="df-sub-modal__field">
                  <label>Plan Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Care Plan 3yr Premium"
                    {...registerPlan('name', { required: 'Plan name is required' })}
                  />
                  {planErrors.name && (
                    <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '4px' }}>
                      {planErrors.name.message}
                    </span>
                  )}
                </div>

                <div className="df-sub-modal__field">
                  <label>Billing Cycle</label>
                  <select {...registerPlan('billing_cycle')}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="df-sub-modal__field">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 46.00"
                    {...registerPlan('price', {
                      required: 'Price is required',
                      min: { value: 0, message: 'Price must be greater than or equal to 0' },
                    })}
                  />
                  {planErrors.price && (
                    <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '4px' }}>
                      {planErrors.price.message}
                    </span>
                  )}
                </div>

                <div className="df-sub-modal__field">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      {...registerPlan('allow_proration')}
                    />
                    <span>Allow Proration on mid-cycle changes</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      {...registerPlan('allow_cancellation')}
                    />
                    <span>Allow Cancellation by customer/rep</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      {...registerPlan('allow_partial_refund')}
                    />
                    <span>Allow Partial Refund / Credit Note</span>
                  </label>
                </div>
              </div>

              <div className="df-sub-modal__footer">
                <button
                  type="button"
                  className="df-sub-modal__btn-cancel"
                  onClick={() => setIsPlanModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="df-sub-modal__btn-submit"
                  disabled={isSubmittingPlan}
                >
                  {isSubmittingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SubscriptionsList);
