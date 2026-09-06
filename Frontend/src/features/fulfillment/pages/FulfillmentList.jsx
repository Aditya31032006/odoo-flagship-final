import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import useFulfillment from '../hooks/useFulfillment.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import WarehouseStockModal from '../components/WarehouseStockModal.jsx';
import WarehouseDetailModal from '../components/WarehouseDetailModal.jsx';
import OrderModal from '../components/OrderModal.jsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
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

  // Search filter states
  const [stockSearch, setStockSearch] = useState('');
  const debouncedStockSearch = useDebounce(stockSearch, 300);

  const [orderSearch, setOrderSearch] = useState('');
  const debouncedOrderSearch = useDebounce(orderSearch, 300);

  // Selected warehouse for detail modal
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);

  // Filtered Stock List
  const filteredStock = useMemo(() => {
    if (!debouncedStockSearch.trim()) return stock;
    const q = debouncedStockSearch.trim().toLowerCase();
    return stock.filter(
      (s) =>
        s.warehouse_name?.toLowerCase().includes(q) ||
        s.product_name?.toLowerCase().includes(q) ||
        s.sku?.toLowerCase().includes(q)
    );
  }, [stock, debouncedStockSearch]);

  // Group stock by warehouse
  const groupedStock = useMemo(() => {
    const groups = {};
    filteredStock.forEach((item) => {
      const wId = item.warehouse_id || item.warehouse_name;
      if (!groups[wId]) {
        groups[wId] = {
          warehouse_id: wId,
          warehouse_name: item.warehouse_name,
          items: [],
          totalInStock: 0,
          totalReserved: 0,
          totalAvailable: 0,
        };
      }
      groups[wId].items.push(item);
      groups[wId].totalInStock += Number(item.in_stock) || 0;
      groups[wId].totalReserved += Number(item.reserved) || 0;
      groups[wId].totalAvailable += Number(item.available) || 0;
    });
    return Object.values(groups);
  }, [filteredStock]);

  const selectedWarehouseGroup = useMemo(() => {
    if (!selectedWarehouseId) return null;
    return groupedStock.find((g) => g.warehouse_id === selectedWarehouseId) || null;
  }, [selectedWarehouseId, groupedStock]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    if (!debouncedOrderSearch.trim()) return orders;
    const q = debouncedOrderSearch.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.warehouses_display?.toLowerCase().includes(q) ||
        o.status_display?.toLowerCase().includes(q)
    );
  }, [orders, debouncedOrderSearch]);

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
        {/* Header matching Wireframe #7 with Top-Right Actions */}
        <div className="df-fulfillment__header">
          <div className="df-fulfillment__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="df-fulfillment__title">Fulfillment and Stock (List)</h1>
              <p className="df-fulfillment__subtitle">
                Live stock per warehouse, plus every order that still needs fulfilling
              </p>
            </div>

            <div className="df-fulfillment__header-right">
              <PermissionGate allowedRoles={['admin', 'operations']}>
                <button
                  type="button"
                  className="df-btn-primary df-fulfillment__add-btn"
                  onClick={handleOpenAddStock}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Warehouse Stock
                </button>
              </PermissionGate>

              <PermissionGate allowedRoles={['admin', 'operations', 'sales_manager']}>
                <button
                  type="button"
                  className="df-btn-secondary df-fulfillment__btn-secondary"
                  onClick={handleOpenAddOrder}
                >
                  + New Order
                </button>
              </PermissionGate>
            </div>
          </div>
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
        <div className="df-toolbar-row" style={{ marginBottom: '0.75rem' }}>
          <h2 className="df-fulfillment__section-title" style={{ margin: 0 }}>Warehouse Inventory &amp; On-Hand Stock</h2>
          <div className="df-search-wrap" style={{ width: '260px' }}>
            <span className="df-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="df-search-input"
              placeholder="Search stock by product, SKU, warehouse..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
            {stockSearch && (
              <button type="button" className="df-search-clear" onClick={() => setStockSearch('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
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
                  <th>Warehouse Facility</th>
                  <th>Stocked Items</th>
                  <th>Total In Stock</th>
                  <th>Total Reserved</th>
                  <th>Total Available</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="df-fulfillment__empty">
                      {stockSearch ? 'No warehouse stock matches your search.' : 'No stock records found. Click "+ Add Warehouse Stock" above to register inventory.'}
                    </td>
                  </tr>
                ) : (
                  groupedStock.map((group) => (
                    <tr
                      key={group.warehouse_id}
                      className="df-fulfillment__warehouse-row is-clickable"
                      onClick={() => setSelectedWarehouseId(group.warehouse_id)}
                      style={{ cursor: 'pointer' }}
                      title="Click row to view all stock items in this warehouse"
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>🏢</span>
                          <strong className="df-fulfillment__warehouse-name">
                            {group.warehouse_name}
                          </strong>
                        </div>
                      </td>
                      <td>
                        <span className="df-fulfillment__product-count">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <strong>{group.totalInStock}</strong>
                      </td>
                      <td>
                        <span style={{ color: group.totalReserved > 0 ? '#d97706' : '#71717a', fontWeight: group.totalReserved > 0 ? 600 : 400 }}>
                          {group.totalReserved}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`df-fulfillment__available-badge ${
                            group.totalAvailable <= 0 ? 'df-fulfillment__available-badge--out' : ''
                          }`}
                        >
                          {group.totalAvailable}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="df-fulfillment__btn df-fulfillment__btn--cancel"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWarehouseId(group.warehouse_id);
                          }}
                        >
                          View Inventory ↗
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Orders Awaiting Fulfillment Table with Create Option */}
        <div className="df-toolbar-row" style={{ marginTop: '2.5rem', marginBottom: '0.75rem' }}>
          <h2 className="df-fulfillment__section-title" style={{ margin: 0 }}>Orders Awaiting Fulfillment</h2>
          <div className="df-search-wrap" style={{ width: '260px' }}>
            <span className="df-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="df-search-input"
              placeholder="Search orders by number, customer..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            {orderSearch && (
              <button type="button" className="df-search-clear" onClick={() => setOrderSearch('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="df-fulfillment__empty">
                      {orderSearch ? 'No orders match your search criteria.' : 'No orders awaiting fulfillment. Click "+ Create Fulfillment Order" above.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
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
        
      </div>

      {/* Warehouse Stock Modal */}
      {stockModal.isOpen && (
        <WarehouseStockModal
          isOpen={stockModal.isOpen}
          onClose={() => setStockModal({ isOpen: false, initialData: null })}
          initialData={stockModal.initialData}
          warehouses={meta?.warehouses || []}
          variants={meta?.variants || []}
          onSave={handleSaveStock}
          isSaving={isMutating}
        />
      )}

      {/* Order Modal */}
      {orderModal.isOpen && (
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
      )}

      {/* Warehouse Detail Modal */}
      {selectedWarehouseGroup && (
        <WarehouseDetailModal
          isOpen={!!selectedWarehouseGroup}
          onClose={() => setSelectedWarehouseId(null)}
          warehouseName={selectedWarehouseGroup.warehouse_name}
          items={selectedWarehouseGroup.items}
          onEditItem={(item) => handleOpenEditStock(null, item)}
          onDeleteItem={(item) => handleOpenDeleteStock(null, item)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, type: null, id: null, title: '', message: '' })}
          title={deleteModal.title}
          message={deleteModal.message}
          onConfirm={handleConfirmDelete}
          isDeleting={isMutating}
        />
      )}
    </div>
  );
};

export default FulfillmentList;
