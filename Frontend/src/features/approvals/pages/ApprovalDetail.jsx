import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import useApprovals from '../hooks/useApprovals.js';
import ApprovalActionModal from '../components/ApprovalActionModal.jsx';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import BackButton from '../../../shared/components/BackButton.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/approvals.scss';

export const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currentDetail,
    isLoadingDetail,
    isSubmittingDecision,
    error,
    successMsg,
    makeDecision,
    clearMessages,
  } = useApprovals(id);

  const [modalState, setModalState] = useState({
    isOpen: false,
    actionType: null,
  });

  const header = currentDetail?.header;
  const flaggedLines = currentDetail?.flaggedLines || [];
  const auditLogs = currentDetail?.auditLogs || [];
  const stepper = currentDetail?.stepper || [];

  const handleOpenModal = (actionType) => {
    setModalState({ isOpen: true, actionType });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, actionType: null });
  };

  const handleConfirmDecision = async ({ action, reason }) => {
    try {
      await makeDecision(action, reason);
      toast.success(`Quotation successfully ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned'}`);
      handleCloseModal();
    } catch (err) {
      console.error('Error submitting approval decision:', err);
      toast.error(err.message || 'Error submitting approval decision');
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="df-approvals">
        <div className="df-approvals__container">
          <div className="df-approvals__empty">
            <div className="df-approvals__empty-title">Loading approval details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!header && !isLoadingDetail) {
    return (
      <div className="df-approvals">
        <div className="df-approvals__container">
          <div className="df-approvals__empty">
            <div className="df-approvals__empty-title">Quotation Approval Record Not Found</div>
            <BackButton to="/approvals" label="Back to Approvals" />
          </div>
        </div>
      </div>
    );
  }

  const worstOverLine = flaggedLines.reduce((max, line) => {
    const val = Number(line.excess_discount) || 0;
    return val > max ? val : max;
  }, 0);

  const riskLevel = header?.risk_level?.toUpperCase() || 'LOW';

  return (
    <div className="df-approvals">
      <div className="df-approvals__container">
        {/* Uniform Back Navigation placed in Left Top Corner */}
        <BackButton to="/approvals" label="Back to Approvals" />

        {/* Navigation & Header */}
        <div className="df-approvals__header">
          <div className="df-approvals__title-row">
            <h1 className="df-approvals__title">
              Approval Detail: {header?.quotation_number || `Q-${id}`} ({header?.customer_name || 'Customer'})
            </h1>
          </div>
          <p className="df-approvals__subtitle">
            Opened by clicking a row on the Approvals list
          </p>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="df-approvals__banner df-approvals__banner--success">
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="df-approvals__banner df-approvals__banner--danger">
            <span>{error}</span>
          </div>
        )}

        {/* Badges Bar */}
        <div className="df-approvals__detail-badges">
          <div className="df-approvals__detail-badge df-approvals__detail-badge--risk">
            <span>Blended Risk: {riskLevel}</span>
          </div>
          <div className="df-approvals__detail-badge df-approvals__detail-badge--tier">
            <span>Customer Tier: {header?.customer_tier_name || 'Standard'}</span>
          </div>
          <div className="df-approvals__detail-badge df-approvals__detail-badge--status">
            <span>Status: {header?.status?.toUpperCase()}</span>
          </div>
        </div>

        {/* Section: Why This Quote Was Flagged */}
        <h2 className="df-approvals__section-title">Why This Quote Was Flagged</h2>

        <div className="df-approvals__card">
          <table className="df-approvals__table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Discount Given</th>
                <th>Limit Allowed</th>
                <th>Over By</th>
              </tr>
            </thead>
            <tbody>
              {flaggedLines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="df-approvals__empty">
                    No line items found for this quotation.
                  </td>
                </tr>
              ) : (
                flaggedLines.map((line) => {
                  const isOver = Number(line.excess_discount) > 0 || line.is_over_limit;
                  return (
                    <tr key={line.line_id || line.line_display}>
                      <td>
                        <strong>{line.line_display || line.product_name}</strong>
                      </td>
                      <td>{line.discount_given}%</td>
                      <td>{line.limit_allowed}%</td>
                      <td>
                        <span
                          className={
                            isOver
                              ? 'df-approvals__over-highlight'
                              : 'df-approvals__ok-highlight'
                          }
                        >
                          {line.over_by_display || (isOver ? `${line.excess_discount} pt - OVER` : '0 pt - OK')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Warning Explainer Banner */}
        <div className="df-approvals__banner df-approvals__banner--warning">
          <span>
            Worst single line ({worstOverLine > 0 ? `${worstOverLine}pt` : '0pt'} over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
          </span>
        </div>

        {/* Stepper Timeline */}
        <div className="df-approvals__stepper-wrapper">
          <div className="df-approvals__stepper">
            {stepper.map((step, idx) => {
              return (
                <div
                  key={step.id || idx}
                  className={`df-approvals__step df-approvals__step--${step.status}`}
                >
                  <div className="df-approvals__step-circle">
                    {step.status === 'completed' ? '✓' : idx + 1}
                  </div>
                  <span className="df-approvals__step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Section */}
        <h2 className="df-approvals__section-title">Audit Trail & History</h2>
        <div className="df-approvals__card">
          <table className="df-approvals__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="df-approvals__empty">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{log.user_name || 'System'}</strong></td>
                    <td>
                      <span className="df-approvals__stage-badge">
                        {log.action}
                      </span>
                    </td>
                    <td>{log.formatted_date || (log.created_at ? new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-')}</td>
                    <td>{log.note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Decision Action Buttons */}
        <PermissionGate allowedRoles={['admin', 'sales_manager', 'finance']}>
          <div className="df-approvals__actions-bar">
            <button
              type="button"
              className="df-approvals__action-btn df-approvals__action-btn--approve"
              onClick={() => handleOpenModal('approve')}
              disabled={isSubmittingDecision}
            >
              Approve
            </button>
            <button
              type="button"
              className="df-approvals__action-btn df-approvals__action-btn--return"
              onClick={() => handleOpenModal('return_revision')}
              disabled={isSubmittingDecision}
            >
              Return for Revision
            </button>
            <button
              type="button"
              className="df-approvals__action-btn df-approvals__action-btn--reject"
              onClick={() => handleOpenModal('reject')}
              disabled={isSubmittingDecision}
            >
              Reject
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Modal using React Hook Form */}
      <ApprovalActionModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        actionType={modalState.actionType}
        onConfirm={handleConfirmDecision}
        isSubmitting={isSubmittingDecision}
      />
    </div>
  );
};

export default ApprovalDetail;
