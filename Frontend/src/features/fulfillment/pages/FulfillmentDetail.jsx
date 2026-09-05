import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import useFulfillment from '../hooks/useFulfillment.js';
import ManualOverrideModal from '../components/ManualOverrideModal.jsx';
import '../styles/fulfillment.scss';

function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString()}`;
}

export const FulfillmentDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const {
    currentDetail,
    isLoadingDetail,
    isSavingSplit,
    error,
    successMsg,
    handleAcceptSplit,
    handleSaveManualOverride,
  } = useFulfillment(orderId);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const header = currentDetail?.header;
  const items = currentDetail?.items || [];
  const splits = currentDetail?.splits || [];
  const backorders = currentDetail?.backorders || [];
  const warehouses = currentDetail?.warehouses || [];

  const mainItem = items[0] || {};
  const totalRequired = mainItem.quantity || 24;

  const onConfirmOverride = async (allocatedSplits, remainingNeeded) => {
    try {
      await handleSaveManualOverride(allocatedSplits, remainingNeeded);
      setIsOverrideModalOpen(false);
    } catch (err) {
      console.error('Failed to save manual override:', err);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="df-fulfillment">
        <div className="df-fulfillment__container">
          <div className="df-fulfillment__empty">
            <div className="df-fulfillment__empty-title">Loading fulfillment details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!header && !isLoadingDetail) {
    return (
      <div className="df-fulfillment">
        <div className="df-fulfillment__container">
          <div className="df-fulfillment__empty">
            <div className="df-fulfillment__empty-title">Order Fulfillment Record Not Found</div>
            <button
              type="button"
              className="df-fulfillment__back-btn"
              onClick={() => navigate('/fulfillment')}
            >
              &larr; Back to Fulfillment List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-fulfillment">
      <div className="df-fulfillment__container">
        {/* Header matching Wireframe #8 */}
        <div className="df-fulfillment__header">
          <div className="df-fulfillment__title-row">
            <h1 className="df-fulfillment__title">
              Fulfillment Detail: {header?.order_number || `ORD-${orderId}`} ({header?.customer_name || 'Customer'})
            </h1>
            <button
              type="button"
              className="df-fulfillment__back-btn"
              onClick={() => navigate('/fulfillment')}
            >
              &larr; Back to Fulfillment List
            </button>
          </div>
          <p className="df-fulfillment__subtitle">
            Opened by clicking an order row on the Fulfillment list
          </p>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="df-fulfillment__banner df-fulfillment__banner--success">
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="df-fulfillment__banner df-fulfillment__banner--danger">
            <span>{error}</span>
          </div>
        )}

        {/* Warehouse Splits Table */}
        <div className="df-fulfillment__card">
          <table className="df-fulfillment__table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Qty Fulfilled</th>
                <th>Est. Shipments</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {splits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="df-fulfillment__empty">
                    No warehouse splits generated for this order.
                  </td>
                </tr>
              ) : (
                splits.map((split) => (
                  <tr key={split.split_id || split.warehouse_id}>
                    <td>
                      <strong className="df-fulfillment__warehouse-name">
                        {split.warehouse_name}
                      </strong>
                    </td>
                    <td>{split.qty_fulfilled} units</td>
                    <td>{split.est_shipments || 1}</td>
                    <td>
                      <span className="df-fulfillment__cost-highlight">
                        {formatCurrency(split.estimated_shipping_cost)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Restock Prompt Banner matching Wireframe #8 */}
        <div className="df-fulfillment__banner df-fulfillment__banner--prompt">
          <span>
            "Consolidate Remaining Backorder" prompt appears automatically once East Depot restocks.
          </span>
        </div>

        {/* Backorders Table if any exist */}
        {backorders.length > 0 && (
          <>
            <h2 className="df-fulfillment__section-title">Outstanding Backorders</h2>
            <div className="df-fulfillment__card">
              <table className="df-fulfillment__table">
                <thead>
                  <tr>
                    <th>Backorder ID</th>
                    <th>Pending Units</th>
                    <th>Preferred Warehouse</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {backorders.map((b) => (
                    <tr key={b.backorder_id}>
                      <td>
                        <span className="df-fulfillment__code">
                          BO-{b.backorder_id}
                        </span>
                      </td>
                      <td>
                        <strong>{b.quantity} units</strong>
                      </td>
                      <td>{b.preferred_warehouse_name || 'East Depot'}</td>
                      <td>
                        <span className="df-fulfillment__status-pill">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Actions Bar matching Wireframe #8 */}
        <div className="df-fulfillment__actions-bar">
          <button
            type="button"
            className="df-fulfillment__action-btn df-fulfillment__action-btn--accept"
            onClick={handleAcceptSplit}
            disabled={isSavingSplit}
          >
            {isSavingSplit ? 'Processing...' : 'Accept Suggested Split'}
          </button>

          <button
            type="button"
            className="df-fulfillment__action-btn df-fulfillment__action-btn--override"
            onClick={() => setIsOverrideModalOpen(true)}
            disabled={isSavingSplit}
          >
            Manual Override
          </button>
        </div>
      </div>

      {/* Manual Override Modal */}
      <ManualOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        totalRequired={totalRequired}
        productName={mainItem.product_name || 'Laptop Pro 14'}
        warehouses={warehouses}
        currentSplits={splits}
        onConfirm={onConfirmOverride}
        isSaving={isSavingSplit}
      />
    </div>
  );
};

export default FulfillmentDetail;
