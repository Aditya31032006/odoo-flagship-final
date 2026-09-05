import React, { useState } from 'react';

function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString()}`;
}

export const QuotationLineItemsTable = ({
  lineItems = [],
  products = [],
  tierMaxDiscount = 0,
  onUpdateLine,
  onRemoveLine,
  onAddLine,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  const handleOpenAddModal = () => {
    if (products.length > 0) {
      setSelectedVariantId(products[0].product_variant_id);
      setSelectedQty(1);
      setIsAddModalOpen(true);
    }
  };

  const handleConfirmAdd = () => {
    const variant = products.find((p) => String(p.product_variant_id) === String(selectedVariantId));
    if (variant) {
      onAddLine(variant, selectedQty);
    }
    setIsAddModalOpen(false);
  };

  const chosenPreview = products.find((p) => String(p.product_variant_id) === String(selectedVariantId));

  return (
    <div className="df-quotation-detail__table-wrapper">
      <table className="df-quotation-detail__items-table">
        <thead>
          <tr>
            <th className="col-product">Product / Sellable Variant</th>
            <th className="col-qty">Qty</th>
            <th className="col-price">Price</th>
            <th className="col-discount">Discount</th>
            <th className="col-limit">Limit</th>
            <th className="col-status">Status</th>
            <th className="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan="7" className="df-products__empty-cell">
                No products added yet. Click "+ Add Product Line" below or pick an upsell suggestion.
              </td>
            </tr>
          ) : (
            lineItems.map((item, index) => {
              const isOver = Number(item.excess_discount_percentage) > 0;
              const excessPts = item.excess_discount_percentage;

              return (
                <tr key={item.key || index} className={isOver ? 'is-over-limit' : ''}>
                  {/* Product Variant Selector */}
                  <td>
                    <select
                      value={item.product_variant_id || ''}
                      onChange={(e) => onUpdateLine(index, 'product_variant_id', e.target.value)}
                    >
                      <option value="" disabled>
                        Select a product / SKU...
                      </option>
                      {products.map((p) => (
                        <option key={p.product_variant_id} value={p.product_variant_id}>
                          {p.product_name} {p.variant_name ? `(${p.variant_name})` : ''} — SKU: {p.sku} (${Number(p.default_selling_price || p.base_price).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    {item.is_upsell && (
                      <span className="sku-hint">
                        ✦ Added from Upsell Recommendation
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td>
                    <input
                      type="number"
                      min="1"
                      className="input-qty"
                      value={item.quantity || 1}
                      onChange={(e) => onUpdateLine(index, 'quantity', e.target.value)}
                    />
                  </td>

                  {/* Unit Price */}
                  <td>
                    <strong>{formatCurrency(item.unit_price)}</strong>
                    <span className="limit-hint">
                      List: {formatCurrency(item.list_price)}
                    </span>
                  </td>

                  {/* Discount % */}
                  <td>
                    <div className="discount-wrapper">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="input-discount"
                        value={item.discount_percentage ?? 0}
                        onChange={(e) => onUpdateLine(index, 'discount_percentage', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </td>

                  {/* Limit % */}
                  <td>
                    <span className="price-highlight">
                      {item.allowed_discount_percentage != null ? `${item.allowed_discount_percentage}%` : '—'}
                    </span>
                  </td>

                  {/* Status / Excess */}
                  <td>
                    {isOver ? (
                      <span className="risk-pill risk-pill--high" title="Discount exceeds tier/category ceiling">
                        OVER (+{excessPts}pt)
                      </span>
                    ) : (
                      <span className="risk-pill risk-pill--low">OK</span>
                    )}
                  </td>

                  {/* Remove Action */}
                  <td className="cell-centered">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(index)}
                      className="delete-item-btn"
                      title="Remove product line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {products.length > 0 && (
        <button
          type="button"
          className="df-quotation-detail__add-line-btn"
          onClick={handleOpenAddModal}
        >
          + Add Product Line
        </button>
      )}

      {/* Add Product Modal Drawer */}
      {isAddModalOpen && (
        <div className="df-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="df-quote-modal df-quotation-detail__add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="df-quote-modal__header">
              <h2>Add Product to Quotation</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <div className="df-quote-modal__body">
              <div className="df-quotation-detail__modal-field">
                <label>
                  Choose Product & Variant
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.product_variant_id} value={p.product_variant_id}>
                      {p.product_name} {p.variant_name ? `(${p.variant_name})` : ''} — ${Number(p.default_selling_price || p.base_price).toLocaleString()} (SKU: {p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="df-quotation-detail__modal-field">
                <label>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>

              {chosenPreview && (
                <div className="df-quotation-detail__modal-summary">
                  <div>
                    <div className="summary-label">Category / Max Discount Limit</div>
                    <div className="summary-limit">
                      {chosenPreview.category_name} ({chosenPreview.category_max_discount}% ceiling)
                    </div>
                  </div>
                  <div className="summary-price-col">
                    <div className="summary-label">Estimated Line Price</div>
                    <div className="summary-price-val">
                      {formatCurrency(Number(chosenPreview.default_selling_price || chosenPreview.base_price) * selectedQty)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="df-quote-modal__footer">
              <button
                type="button"
                className="df-quotations__toggle-view-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-quotations__btn-primary"
                onClick={handleConfirmAdd}
              >
                Add to Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationLineItemsTable;
