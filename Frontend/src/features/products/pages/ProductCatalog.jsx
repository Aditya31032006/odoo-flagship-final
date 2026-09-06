import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { productsApi } from '../services/products.api.js';
import { useDebounce } from '../../../shared/hooks/useDebounce.js';
import { useInfiniteScroll } from '../../../shared/hooks/useInfiniteScroll.js';
import InfiniteScrollSentinel from '../../../shared/components/InfiniteScrollSentinel.jsx';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import '../styles/products.scss';

function formatCurrency(val) {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

export const ProductCatalog = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    productsApi.getSummary().then(setSummary).catch(console.error);
  }, []);

  const {
    items: productsList,
    loadingInitial,
    loadingMore,
    hasMore,
    totalCount,
    sentinelRef,
  } = useInfiniteScroll({
    fetchFunction: async (page, limit) => {
      const res = await productsApi.getAllProducts({
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      return {
        data: res?.data || [],
        pagination: res?.pagination,
      };
    },
    dependencies: [debouncedSearch],
    limit: 12,
  });

  return (
    <div className="df-products">
      <div className="df-products__container">
        {/* Header matching Wireframe #16 with top-right actions */}
        <header className="df-products__header">
          <div className="df-products__title-group">
            <h1>Product catalog</h1>
            <p>Every product, variant and price list in one place.</p>
          </div>

          <div className="df-products__actions-row">
            <PermissionGate allowedRoles={['admin', 'sales_manager', 'operations']}>
              <Link to="/products/new" className="df-btn-primary df-products__btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="df-products__btn-icon">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                New Product
              </Link>
            </PermissionGate>

            <PermissionGate allowedRoles={['admin', 'sales_manager']}>
              <Link
                to="/discount-rules"
                className="df-btn-secondary df-products__btn-secondary"
              >
                Discount Tiers & Rules
              </Link>
            </PermissionGate>
          </div>
        </header>

        {/* 3 Summary Cards matching Wireframe #16 */}
        <div className="df-products__kpi-grid">
          <div className="df-products__kpi-card">
            <div className="kpi-title">Total Products</div>
            <div className="kpi-desc">
              {summary ? summary.active_products : totalCount ?? productsList.length} active, {summary ? summary.archived_products : 0} archived
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
        <div className="df-toolbar-row" style={{ margin: '2rem 0 1rem 0' }}>
          <h2 className="df-products__section-title" style={{ margin: 0 }}>Products</h2>
          <div className="df-search-wrap" style={{ width: '320px' }}>
            <span className="df-search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="df-search-input"
              placeholder="Search products by name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="df-search-clear" onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
              {loadingInitial ? (
                <tr>
                  <td colSpan="7" className="df-products__empty-cell">
                    Loading product catalog...
                  </td>
                </tr>
              ) : productsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="df-products__empty-cell">
                    {searchQuery ? 'No products match your search.' : 'No products found.'}
                  </td>
                </tr>
              ) : (
                productsList.map((p) => {
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

        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loading={loadingMore}
          hasMore={hasMore}
          count={productsList.length}
          total={totalCount}
          itemName="products"
        />
      </div>
    </div>
  );
};

export default ProductCatalog;
