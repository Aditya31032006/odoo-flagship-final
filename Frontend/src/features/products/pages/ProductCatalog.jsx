import { Link, useNavigate } from 'react-router';
import useProducts from '../hook/useProducts.js';
import '../styles/products.scss';

function formatCurrency(val) {
  return `$${Number(val || 0).toLocaleString()}`;
}

export const ProductCatalog = () => {
  const { summary, productsList, isLoading } = useProducts();
  const navigate = useNavigate();

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

          <button
            type="button"
            className="df-products__btn-secondary"
            onClick={() => alert('Price list management panel')}
          >
            Manage Price fields
          </button>
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


        {/* Products Section Header matching Wireframe #16 */}
        <h2 className="df-products__section-title">Products</h2>

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
              {productsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="df-products__empty-cell">
                    {isLoading ? 'Loading product catalog...' : 'No products found.'}
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

        {/* Bottom Banner matching Wireframe #16 */}
        <div className="df-products__notice-banner">
          Click a product row to open general info, variants and tier/currency price lists.
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;
