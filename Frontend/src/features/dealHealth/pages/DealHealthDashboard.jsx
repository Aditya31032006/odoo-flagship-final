import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { dealHealthApi } from '../services/dealHealth.api.js';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/dealHealth.scss';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatActionText = (action, detail) => {
  if (detail && (detail.toLowerCase().includes('nudge') || detail.toLowerCase().includes('escalat'))) {
    return detail;
  }
  if (action === 'acknowledged') return 'Acknowledged';
  if (action === 'resolved') return 'Resolved';
  return 'Open Action';
};

const ConfigureThresholdsModal = React.memo(({ isOpen, onClose, currentConfig, onSave, isSaving }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      stalled_days: currentConfig?.stalled_days || 7,
      discount_anomaly_multiplier: currentConfig?.discount_anomaly_multiplier || 1.5,
      delivery_slippage_days: currentConfig?.delivery_slippage_days || 3,
    },
  });

  if (!isOpen) return null;

  return (
    <div className="df-sub-modal">
      <div className="df-sub-modal__content">
        <div className="df-sub-modal__header">
          <h3>Configure Deal Health Thresholds</h3>
          <button
            type="button"
            className="df-sub-modal__close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit(onSave)}>
          <div className="df-sub-modal__body">
            <div className="df-sub-modal__field">
              <label>Stalled Deal Threshold (Days Idle)</label>
              <input
                type="number"
                min="1"
                {...register('stalled_days', {
                  required: 'Stalled threshold is required',
                  min: { value: 1, message: 'Must be at least 1 day' },
                })}
              />
              {errors.stalled_days && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.stalled_days.message}</span>}
              <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Quotes idle longer than this will trigger a Stalled Deal flag.
              </small>
            </div>

            <div className="df-sub-modal__field">
              <label>Discount Anomaly Multiplier (× Average)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                {...register('discount_anomaly_multiplier', {
                  required: 'Multiplier is required',
                  min: { value: 1.0, message: 'Must be at least 1.0' },
                })}
              />
              {errors.discount_anomaly_multiplier && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.discount_anomaly_multiplier.message}</span>}
              <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Discounts exceeding average × multiplier will be flagged.
              </small>
            </div>

            <div className="df-sub-modal__field">
              <label>Delivery Slippage Threshold (Days Overdue)</label>
              <input
                type="number"
                min="0"
                {...register('delivery_slippage_days', {
                  required: 'Delivery slippage threshold is required',
                  min: { value: 0, message: 'Must be at least 0 days' },
                })}
              />
              {errors.delivery_slippage_days && <span style={{ color: '#fb7185', fontSize: '0.75rem' }}>{errors.delivery_slippage_days.message}</span>}
              <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Shipments delayed beyond this threshold will trigger Delivery Slippage.
              </small>
            </div>
          </div>

          <div className="df-sub-modal__footer">
            <button
              type="button"
              className="df-sub-modal__btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="df-sub-modal__btn-submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const DealHealthDashboard = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user);
  const toast = useToast();

  const [flags, setFlags] = useState([]);
  const [summary, setSummary] = useState({
    stalled_count: 0,
    discount_anomaly_count: 0,
    delivery_slippage_count: 0,
    total_open_flags: 0,
    total_all_flags: 0,
  });
  const [config, setConfig] = useState({
    stalled_days: 7,
    discount_anomaly_multiplier: 1.5,
    delivery_slippage_days: 3,
  });

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  // Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchDashboard = useCallback(async (filterType) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dealHealthApi.getDashboard(filterType);
      if (data) {
        setFlags(data.flags || []);
        if (data.summary) setSummary(data.summary);
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load deal health dashboard:', err);
      setError('Unable to load deal health data from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedFilter);
  }, [fetchDashboard, selectedFilter]);

  const handleCardClick = (type) => {
    setSelectedFilter((prev) => (prev === type ? 'all' : type));
  };

  const handleTriggerScan = async () => {
    try {
      setIsScanning(true);
      const res = await dealHealthApi.triggerScan();
      if (res.data) {
        setFlags(res.data.flags || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
      toast.success('Deal health automated scan completed!');
    } catch (err) {
      console.error('Failed to run scan:', err);
      toast.error('Failed to trigger scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAction = async (flagId, actionType, actionDetail) => {
    try {
      await dealHealthApi.updateAction(flagId, {
        action: actionType,
        detail: actionDetail,
      });
      toast.success('Action recorded successfully');
      fetchDashboard(selectedFilter);
    } catch (err) {
      console.error('Failed to update action:', err);
      toast.error('Failed to update action');
    }
  };

  const handleConfigSubmit = async (formData) => {
    try {
      setIsSavingConfig(true);
      await dealHealthApi.updateConfig({
        stalled_days: parseInt(formData.stalled_days, 10),
        discount_anomaly_multiplier: parseFloat(formData.discount_anomaly_multiplier),
        delivery_slippage_days: parseInt(formData.delivery_slippage_days, 10),
      });
      setIsConfigModalOpen(false);
      toast.success('Deal health thresholds updated successfully!');
      fetchDashboard(selectedFilter);
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Failed to update thresholds');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="df-deal-health">
      <div className="df-deal-health__container">
        {/* Header */}
        <div className="df-deal-health__header">
          <div className="df-deal-health__title-row">
            <div>
              <h1 className="df-deal-health__title">Deal Health and Anomaly Dashboard</h1>
              <p className="df-deal-health__subtitle">
                Real-time flags for stalled deals and unusual discount patterns
              </p>
            </div>
            <div className="df-deal-health__header-actions">
              <button
                type="button"
                className="df-cta-btn df-deal-health__btn-scan"
                onClick={handleTriggerScan}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning...' : '⚡ Scan Health'}
              </button>
              <PermissionGate allowedRoles={['admin', 'sales_manager']}>
                <button
                  type="button"
                  className="df-cta-btn df-deal-health__btn-config"
                  onClick={() => setIsConfigModalOpen(true)}
                >
                  ⚙ Configure Thresholds
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* Top 3 KPI Summary Cards matching Wireframe #14 */}
        <div className="df-deal-health__kpi-grid">
          {/* Card 1: Stalled Deals */}
          <div
            className={`df-deal-health__kpi-card ${selectedFilter === 'stalled_deal' ? 'is-selected' : ''}`}
            onClick={() => handleCardClick('stalled_deal')}
          >
            <h3 className="df-deal-health__kpi-card-title">Stalled Deals</h3>
            <p className="df-deal-health__kpi-card-desc">
              {summary.stalled_count || 0} quotes idle {config.stalled_days || 7}+ days
            </p>
            <span className="df-deal-health__kpi-card-count df-deal-health__kpi-card-count--stalled">
              {summary.stalled_count || 0}
            </span>
          </div>

          {/* Card 2: Discount Anomalies */}
          <div
            className={`df-deal-health__kpi-card ${selectedFilter === 'discount_anomaly' ? 'is-selected' : ''}`}
            onClick={() => handleCardClick('discount_anomaly')}
          >
            <h3 className="df-deal-health__kpi-card-title">Discount Anomalies</h3>
            <p className="df-deal-health__kpi-card-desc">
              {summary.discount_anomaly_count || 0} above {config.discount_anomaly_multiplier || 1.5}× rep average
            </p>
            <span className="df-deal-health__kpi-card-count df-deal-health__kpi-card-count--discount">
              {summary.discount_anomaly_count || 0}
            </span>
          </div>

          {/* Card 3: Delivery Slippage */}
          <div
            className={`df-deal-health__kpi-card ${selectedFilter === 'delivery_slippage' ? 'is-selected' : ''}`}
            onClick={() => handleCardClick('delivery_slippage')}
          >
            <h3 className="df-deal-health__kpi-card-title">Delivery Slippage</h3>
            <p className="df-deal-health__kpi-card-desc">
              {summary.delivery_slippage_count || 0} promise dates at risk ({config.delivery_slippage_days || 3}+ days)
            </p>
            <span className="df-deal-health__kpi-card-count df-deal-health__kpi-card-count--slippage">
              {summary.delivery_slippage_count || 0}
            </span>
          </div>
        </div>

        {/* Table matching Wireframe #14 */}
        <div className="df-deal-health__table-wrapper">
          {isLoading ? (
            <div className="df-deal-health__loading">Loading deal health issues...</div>
          ) : error ? (
            <div className="df-deal-health__empty">{error}</div>
          ) : (
            <table className="df-deal-health__table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Issue</th>
                  <th>Flagged</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="df-deal-health__empty">
                      No health flags detected for the selected view. All deals healthy.
                    </td>
                  </tr>
                ) : (
                  flags.map((flag) => (
                    <tr key={flag.id}>
                      <td>
                        <strong>{flag.customer_name || 'Customer'}</strong>
                        {flag.quotation_number && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            {flag.quotation_number} ({flag.quotation_status})
                          </div>
                        )}
                      </td>
                      <td>
                        <span>{flag.detail}</span>
                      </td>
                      <td>{formatDate(flag.created_at)}</td>
                      <td>
                        <div className="df-deal-health__actions-cell">
                          {flag.action === 'resolved' ? (
                            <span className="df-deal-health__action-badge df-deal-health__action-badge--resolved">
                              Resolved {flag.resolved_by_name ? `by ${flag.resolved_by_name}` : ''}
                            </span>
                          ) : (
                            <>
                              {/* Escalate button matching Wireframe #14 */}
                              <button
                                type="button"
                                className="df-deal-health__btn-escalate"
                                onClick={() =>
                                  handleAction(flag.id, 'acknowledged', 'Escalated to Manager')
                                }
                              >
                                Escalate
                              </button>

                              <button
                                type="button"
                                className="df-deal-health__btn-nudge"
                                onClick={() =>
                                  handleAction(flag.id, 'acknowledged', 'Nudge sent to rep')
                                }
                              >
                                Nudge
                              </button>

                              <button
                                type="button"
                                className="df-deal-health__btn-resolve"
                                onClick={() => handleAction(flag.id, 'resolved', 'Issue resolved')}
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Thresholds Config Modal */}
      {isConfigModalOpen && (
        <ConfigureThresholdsModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          currentConfig={config}
          onSave={handleConfigSubmit}
          isSaving={isSavingConfig}
        />
      )}
    </div>
  );
};

export default React.memo(DealHealthDashboard);
