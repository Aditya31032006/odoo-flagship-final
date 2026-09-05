import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import useFulfillment from '../hooks/useFulfillment.js';
import WarehouseStockModal from '../components/WarehouseStockModal.jsx';
import OrderModal from '../components/OrderModal.jsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';
import '../styles/fulfillment.scss';

export const FulfillmentList = () => {
  const navigate = useNavigate();
  const {
    stock,
    orders,
    meta,
    isLoadingList,
    isMutating,
    error,
    successMsg,
    handleCreateStock,
    handleUpdateStock,
    handleDeleteStock,
    handleCreateOrder,
    handleUpdateOrder,
    handleDeleteOrder,
  } = useFulfillment();

  // Modal States
  const [stockModal, setStockModal] = useState({ isOpen: false, initialData: null });
  const [orderModal, setOrderModal] = useState({ isOpen: false, initialData: null });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: null, // 'stock' | 'order'
    id: null,
    title: '',
    message: '',
  });

  const handleOrderRowClick = (order) => {
    const targetId = order.order_number || order.order_id;
    navigate(`/fulfillment/${targetId}`);
  };

  // Stock Actions
  const handleOpenAddStock = () => {
    setStockModal({ isOpen: true, initialData: null });
  };

  const handleOpenEditStock = (e, item) => {
    e.stopPropagation();
    setStockModal({ isOpen: true, initialData: item });
  };

  const handleOpenDeleteStock = (e, item) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'stock',
      id: item.stock_id,
      title: 'Delete Warehouse Stock',
      message: `Are you sure you want to remove stock for "${item.product_name}" at "${item.warehouse_name}"?`,
    });
  };

  const handleSaveStock = async (payload, stockId) => {
    try {
      if (stockId) {
        await handleUpdateStock(stockId, payload);
      } else {
        await handleCreateStock(payload);
      }
      setStockModal({ isOpen: false, initialData: null });
    } catch (err) {
      console.error('Failed to save stock:', err);
    }
  };

  // Order Actions
  const handleOpenAddOrder = () => {
    setOrderModal({ isOpen: true, initialData: null });
  };

  const handleOpenEditOrder = (e, order) => {
    e.stopPropagation();
    setOrderModal({ isOpen: true, initialData: order });
  };

  const handleOpenDeleteOrder = (e, order) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'order',
      id: order.order_id,
      title: 'Delete Order',
      message: `Are you sure you want to delete order "${order.order_number}" (${order.customer_name})? This will also remove associated fulfillment splits and backorders.`,
    });
  };

  const handleSaveOrder = async (payload, orderId) => {
    try {
      if (orderId) {
        await handleUpdateOrder(orderId, payload);
      } else {
        await handleCreateOrder(payload);
      }
      setOrderModal({ isOpen: false, initialData: null });
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Delete Confirmation Handler
  const handleConfirmDelete = async () => {
    try {
      if (deleteModal.type === 'stock') {
        await handleDeleteStock(deleteModal.id);
      } else if (deleteModal.type === 'order') {
        await handleDeleteOrder(deleteModal.id);
      }
      setDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' });
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="df-fulfillment">
      <div className="df-fulfillment__container">
        {/* Header matching Wireframe #7 */}
        <div className="df-fulfillment__header">
          <div className="df-fulfillment__title-row">
            <h1 className="df-fulfillment__title">Fulfillment and Stock (List)</h1>
          </div>
          <p className="df-fulfillment__subtitle">
            Live stock per warehouse, plus every order that still needs fulfilling
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

        {/* Section 1: Live Warehouse Stock Table with Add Option */}
        <div className="df-fulfillment__section-header">
          <h2 className="df-fulfillment__section-title">Warehouse Inventory & On-Hand Stock</h2>
          <button
            type="button"
            className="df-fulfillment__add-btn"
            onClick={handleOpenAddStock}
          >
            + Add Warehouse Stock
          </button>
        </div>

        <div className="df-fulfillment__card">
          {isLoadingList ? (
            <div className="df-fulfillment__empty">
              <div className="df-fulfillment__empty-title">Loading warehouse stock...</div>
            </div>
          ) : (
            <table className="df-fulfillment__table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Product</th>
                  <th>In Stock</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="df-fulfillment__empty">
                      No stock records found. Click "+ Add Warehouse Stock" above to register inventory.
                    </td>
                  </tr>
                ) : (
                  stock.map((item) => (
                    <tr key={item.stock_id}>
                      <td>
                        <strong className="df-fulfillment__warehouse-name">
                          {item.warehouse_name}
                        </strong>
                      </td>
                      <td>
                        <span className="df-fulfillment__product-name">
                          {item.product_name}
                        </span>
                      </td>
                      <td>{item.in_stock}</td>
                      <td>{item.reserved}</td>
                      <td>
                        <span className="df-fulfillment__available-highlight">
                          {item.available}
                        </span>
                      </td>
                      <td>
                        <div className="df-fulfillment__row-actions">
                          <button
                            type="button"
                            className="df-fulfillment__icon-btn"
                            title="Edit Stock"
                            onClick={(e) => handleOpenEditStock(e, item)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="df-fulfillment__icon-btn df-fulfillment__icon-btn--delete"
                            title="Delete Stock"
                            onClick={(e) => handleOpenDeleteStock(e, item)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Orders Awaiting Fulfillment with Add Option */}
        <div className="df-fulfillment__section-header">
          <h2 className="df-fulfillment__section-title">Orders Awaiting Fulfillment</h2>
          <button
            type="button"
            className="df-fulfillment__add-btn"
            onClick={handleOpenAddOrder}
          >
            + Create Fulfillment Order
          </button>
        </div>

        <div className="df-fulfillment__card">
          {isLoadingList ? (
            <div className="df-fulfillment__empty">
              <div className="df-fulfillment__empty-title">Loading pending orders...</div>
            </div>
          ) : (
            <table className="df-fulfillment__table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Warehouses</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="df-fulfillment__empty">
                      No orders awaiting fulfillment. Click "+ Create Fulfillment Order" above.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.order_id}
                      className="is-clickable"
                      onClick={() => handleOrderRowClick(order)}
                    >
                      <td>
                        <span className="df-fulfillment__code">
                          {order.order_number || `ORD-${order.order_id}`}
                        </span>
                      </td>
                      <td>
                        <strong>{order.customer_name || 'Customer'}</strong>
                      </td>
                      <td>
                        <span className="df-fulfillment__status-pill">
                          {order.status_display || 'Split Pending'}
                        </span>
                      </td>
                      <td>{order.warehouses_display || 'Main Warehouse'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="df-fulfillment__row-actions">
                          <button
                            type="button"
                            className="df-fulfillment__icon-btn"
                            title="Edit Order"
                            onClick={(e) => handleOpenEditOrder(e, order)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="df-fulfillment__icon-btn df-fulfillment__icon-btn--delete"
                            title="Delete Order"
                            onClick={(e) => handleOpenDeleteOrder(e, order)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Info Banner */}
        <div className="df-fulfillment__banner df-fulfillment__banner--info">
          <span>Click an order row to open its warehouse split detail.</span>
        </div>
      </div>

      {/* Warehouse Stock Modal */}
      <WarehouseStockModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, initialData: null })}
        initialData={stockModal.initialData}
        warehouses={meta?.warehouses || []}
        variants={meta?.variants || []}
        onSave={handleSaveStock}
        isSaving={isMutating}
      />

      {/* Order Modal */}
      <OrderModal
        isOpen={orderModal.isOpen}
        onClose={() => setOrderModal({ isOpen: false, initialData: null })}
        initialData={orderModal.initialData}
        customers={meta?.customers || []}
        variants={meta?.variants || []}
        warehouses={meta?.warehouses || []}
        onSave={handleSaveOrder}
        isSaving={isMutating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' })}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={handleConfirmDelete}
        isDeleting={isMutating}
      />
    </div>
  );
};

export default FulfillmentList;
