import React from 'react';
import { createPortal } from 'react-dom';

const WarehouseDetailModal = ({ isOpen, onClose, warehouseName, items = [], onEditItem, onDeleteItem }) => {
  if (!isOpen) return null;

  const totalInStock = items.reduce((sum, i) => sum + (Number(i.in_stock) || 0), 0);
  const totalReserved = items.reduce((sum, i) => sum + (Number(i.reserved) || 0), 0);
  const totalAvailable = items.reduce((sum, i) => sum + (Number(i.available) || 0), 0);

  const modalContent = (
    <div className="df-modal-backdrop" onClick={onClose}>
      <div className="df-fulfillment-modal__card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="df-fulfillment-modal__header">
          <div>
            <h3 className="df-fulfillment-modal__title">
              📦 {warehouseName}
            </h3>
            <span className="df-fulfillment-modal__subtitle">
              {items.length} product{items.length !== 1 ? 's' : ''} in this warehouse
            </span>
          </div>
          <button type="button" className="df-fulfillment-modal__close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Summary Cards */}
        <div className="df-wh-detail__summary">
          <div className="df-wh-detail__stat">
            <span className="df-wh-detail__stat-label">Total In Stock</span>
            <span className="df-wh-detail__stat-value">{totalInStock}</span>
          </div>
          <div className="df-wh-detail__stat">
            <span className="df-wh-detail__stat-label">Total Reserved</span>
            <span className="df-wh-detail__stat-value df-wh-detail__stat-value--reserved">{totalReserved}</span>
          </div>
          <div className="df-wh-detail__stat">
            <span className="df-wh-detail__stat-label">Total Available</span>
            <span className={`df-wh-detail__stat-value ${totalAvailable <= 0 ? 'df-wh-detail__stat-value--out' : 'df-wh-detail__stat-value--available'}`}>
              {totalAvailable}
            </span>
          </div>
        </div>

        {/* Products Table */}
        <div className="df-wh-detail__table-wrap">
          <table className="df-fulfillment__table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>In Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.stock_id}>
                  <td>
                    <strong className="df-fulfillment__product-name">{item.product_name}</strong>
                  </td>
                  <td>
                    <span style={{ color: '#71717a', fontSize: '0.8125rem' }}>{item.sku || '—'}</span>
                  </td>
                  <td>{item.in_stock}</td>
                  <td>{item.reserved}</td>
                  <td>
                    <span className={`df-fulfillment__available-badge ${item.available <= 0 ? 'df-fulfillment__available-badge--out' : ''}`}>
                      {item.available}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="df-fulfillment__row-actions">
                      <button
                        type="button"
                        className="df-fulfillment__icon-btn"
                        title="Edit Stock"
                        onClick={() => onEditItem(item)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="df-fulfillment__icon-btn df-fulfillment__icon-btn--delete"
                        title="Delete Stock"
                        onClick={() => onDeleteItem(item)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WarehouseDetailModal;
