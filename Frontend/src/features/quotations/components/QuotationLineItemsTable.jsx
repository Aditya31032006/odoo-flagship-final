import React from 'react';

function formatCurrency(val) {
  return `$${Number(val || 0).toLocaleString()}`;
}

export const QuotationLineItemsTable = ({
  lineItems = [],
  products = [],
  tierMaxDiscount = 15,
  onUpdateLine,
  onRemoveLine,
  onAddLine,
}) => {
  return (
    <div className="df-quotation-detail__table-wrapper">
      <table className="df-quotation-detail__items-table">
        <thead>
          <tr>
            <th style={{ width: '32%' }}>Product / Sellable Variant</th>
            <th style={{ width: '10%' }}>Qty</th>
            <th style={{ width: '14%' }}>Price</th>
            <th style={{ width: '12%' }}>Discount</th>
            <th style={{ width: '10%' }}>Limit</th>
            <th style={{ width: '14%' }}>Status</th>
            <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
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
                      style={{ width: '100%' }}
                      value={item.product_variant_id || ''}
                      onChange={(e) => onUpdateLine(index, 'product_variant_id', e.target.value)}
                    >
                      <option value="" disabled>
                        Select a product / SKU...
                      </option>
                      {products.map((p) => (
                        <option key={p.product_variant_id} value={p.product_variant_id}>
                          {p.product_name} {p.variant_name ? `(${p.variant_name})` : ''} — SKU: {p.sku}
                        </option>
                      ))}
                    </select>
                    {item.is_upsell && (
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem', display: 'block' }}>
                        ✦ Added from Upsell Recommendation
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td>
                    <input
                      type="number"
                      min="1"
                      style={{ width: '70px', textAlign: 'center' }}
                      value={item.quantity || 1}
                      onChange={(e) => onUpdateLine(index, 'quantity', e.target.value)}
                    />
                  </td>

                  {/* Unit Price */}
                  <td>
                    <strong>{formatCurrency(item.unit_price)}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>
                      List: {formatCurrency(item.list_price)}
                    </span>
                  </td>

                  {/* Discount % */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        style={{ width: '65px', textAlign: 'center' }}
                        value={item.discount_percentage ?? 0}
                        onChange={(e) => onUpdateLine(index, 'discount_percentage', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </td>

                  {/* Limit % */}
                  <td>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
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
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '0.3rem 0.5rem',
                        borderRadius: '4px',
                      }}
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
          onClick={() => onAddLine(products[0])}
        >
          + Add Product Line
        </button>
      )}
    </div>
  );
};

export default QuotationLineItemsTable;
