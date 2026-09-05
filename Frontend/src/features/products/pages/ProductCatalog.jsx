import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import useProducts from '../hook/useProducts.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import '../styles/products.scss';

function formatCurrency(val) {
  return `$${Number(val || 0).toLocaleString()}`;
}

export const ProductCatalog = () => {
  const { summary, productsList, isLoading } = useProducts();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim()) return productsList;
    const q = debouncedSearch.trim().toLowerCase();
    return productsList.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.sample_variant_name?.toLowerCase().includes(q)
    );
  }, [productsList, debouncedSearch]);

  return (
    <div className="df-products">
      <div className="df-products__container">
        {/* Header matching Wireframe #16 */}
        <header className="df-products__header">
          <div className="df-products__title-group">
            <h1>Product catalog</h1>
            <p>Every product, variant and price list in one place.</p>
          </div>
        </header>

        {/* Buttons matching Wireframe #16 */}
        <div className="df-products__actions-row">
          <Link to="/products/new" className="df-products__btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="df-products__btn-icon">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
             New Product
          </Link>

          <Link
            to="/discount-rules"
            className="df-products__btn-secondary"
          >
            Discount Tiers & Rules
          </Link>
        </div>

        {/* 3 Summary Cards matching Wireframe #16 */}
        <div className="df-products__kpi-grid">
          <div className="df-products__kpi-card">
            <div className="kpi-title">Total Products</div>
            <div className="kpi-desc">
              {summary ? summary.active_products : productsList.length} active, {summary ? summary.archived_products : 0} archived
            </div>
          </div>

          <div className="df-products__kpi-card">
            <div className="kpi-title">Pricelists</div>
            <div className="kpi-desc">
              {summary?.pricelists ?? 0} tiers, {summary?.currencies ?? 0} Currencies
            </div>
          </div>

          <div className="df-products__kpi-card">
            <div className="kpi-title">Variants</div>
            <div className="kpi-desc">
              {summary?.total_variants ?? 0} SKUs across all products
            </div>
          </div>
        </div>

        {/* Products Section Header & Search Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1rem 0', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="df-products__section-title" style={{ margin: 0 }}>Products</h2>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search products by name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.6rem 2.2rem 0.6rem 0.9rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Products Table matching Wireframe #16 */}
        <div className="df-products__table-wrapper">
          <table className="df-products__table">
            <thead>
              <tr>
                <th>Product name</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Tax</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="df-products__empty-cell">
                    {isLoading ? 'Loading product catalog...' : searchQuery ? 'No products match your search.' : 'No products found.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const variantText = Number(p.variants_count) > 1
                    ? `${p.variants_count}(${p.sample_variant_name ? p.sample_variant_name.split(' ')[0] : 'variants'})`
                    : '—';

                  const displayPrice = p.unit === 'Recurring'
                    ? `${formatCurrency(p.base_price)}/month`
                    : formatCurrency(p.base_price);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      title="Click to view details"
                    >
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>{p.category_name || 'General'}</td>
                      <td>{variantText}</td>
                      <td>
                        <span className="df-products__price-highlight">{displayPrice}</span>
                      </td>
                      <td>{p.unit || 'Each'}</td>
                      <td>{Number(p.tax_percentage).toFixed(2)}%</td>
                      <td>
                        <span className={`status-badge status-badge--${p.is_active ? 'active' : 'inactive'}`}>
                          {p.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Banner matching Wireframe #16 */}
      
      </div>
    </div>
  );
};

export default ProductCatalog;
