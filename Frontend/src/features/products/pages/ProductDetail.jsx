import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { productsApi } from '../services/products.api.js';
import '../styles/productDetail.scss';

export const ProductDetail = ({ isNew = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditingExisting = Boolean(id && id !== 'new');

  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [unit, setUnit] = useState('Each');
  const [description, setDescription] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('18');
  const [isSubscription, setIsSubscription] = useState(false);
  const [recurringCycle, setRecurringCycle] = useState('Monthly');
  const [quantityOnHand, setQuantityOnHand] = useState('10');

  // Editable & Deletable Product Variants matching Wireframe #17
  const [variants, setVariants] = useState([]);

  // Editable & Deletable Pricelists matching Wireframe #17
  const [pricelists, setPricelists] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    productsApi.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    });

    if (isEditingExisting) {
      setIsLoading(true);
      productsApi
        .getProductDetail(id)
        .then((p) => {
          if (p) {
            setName(p.name || '');
            setCategoryId(p.category_id || '');
            setBasePrice(p.base_price || '');
            setUnit(p.unit || 'Each');
            setDescription(p.description || '');
            setTaxPercentage(p.tax_percentage || '0');
            if (p.unit === 'Recurring') {
              setIsSubscription(true);
            }
            if (p.variants && p.variants.length > 0) {
              setVariants(
                p.variants.map((v, i) => ({
                  id: v.variant_id || v.id || i + 1,
                  attribute: v.variant_name || 'Standard',
                  values: v.sku || 'SKU-' + (i + 1),
                  extra_price: v.selling_price ? `$${v.selling_price}` : '0',
                  isEditing: false,
                }))
              );
            }
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load product details');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, isEditingExisting]);

  // ==========================================
  // VARIANT ADD / EDIT / DELETE HANDLERS
  // ==========================================
  const handleAddVariant = () => {
    const newVariant = {
      id: Date.now(),
      attribute: '',
      values: '',
      extra_price: '0',
      isEditing: true,
      isNew: true,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  const handleToggleEditVariant = (index, shouldEdit = true) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: shouldEdit };
      return copy;
    });
  };

  const handleUpdateVariantField = (index, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveVariantRow = (index) => {
    const v = variants[index];
    if (!v.attribute.trim()) {
      alert('Attribute name is required');
      return;
    }
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
  };

  const handleDeleteVariant = async (index) => {
    const v = variants[index];
    if (window.confirm(`Are you sure you want to delete the variant attribute "${v.attribute || 'this entry'}"?`)) {
      if (v.id && typeof v.id === 'number' && v.id < 1000000000000 && isEditingExisting) {
        try {
          await productsApi.deleteVariant(v.id);
        } catch (e) {
          console.warn('Variant deleted locally:', e.message);
        }
      }
      setVariants((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // ==========================================
  // PRICELIST ADD / EDIT / DELETE HANDLERS
  // ==========================================
  const handleAddPricelist = () => {
    const newRule = {
      id: Date.now(),
      tier: 'Silver',
      currency: 'INR',
      price_rule: 'Price minus 5 percent base',
      isEditing: true,
      isNew: true,
    };
    setPricelists((prev) => [...prev, newRule]);
  };

  const handleToggleEditPricelist = (index, shouldEdit = true) => {
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: shouldEdit };
      return copy;
    });
  };

  const handleUpdatePricelistField = (index, field, value) => {
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSavePricelistRow = (index) => {
    const pl = pricelists[index];
    if (!pl.price_rule.trim()) {
      alert('Price rule description is required');
      return;
    }
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
  };

  const handleDeletePricelist = (index) => {
    const pl = pricelists[index];
    if (window.confirm(`Delete pricelist rule for "${pl.tier}" tier?`)) {
      setPricelists((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // ==========================================
  // PRODUCT SAVE / UPDATE / DELETE HANDLERS
  // ==========================================
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        name: name.trim(),
        category_id: categoryId,
        base_price: Number(basePrice) || 0,
        unit: isSubscription ? 'Recurring' : unit,
        description,
        tax_percentage: Number(taxPercentage) || 0,
        variants: variants.map((v) => ({
          id: v.id,
          sku: `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)}-${v.attribute.toUpperCase().slice(0, 3)}-${Math.floor(Math.random() * 900 + 100)}`,
          variant_name: `${v.attribute}${v.values ? `: ${v.values}` : ''}`,
          selling_price: Number(basePrice) + (parseFloat(String(v.extra_price).replace(/[^0-9.]/g, '')) || 0),
        })),
        pricelists,
      };

      if (isEditingExisting) {
        await productsApi.updateProduct(id, payload);
        setSuccessMsg('Product updated successfully!');
      } else {
        await productsApi.createProduct(payload);
        navigate('/products');
      }
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await productsApi.deleteProduct(id);
      navigate('/products');
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="df-product-detail">
        <div className="df-product-detail__loading">
          Loading product information...
        </div>
      </div>
    );
  }

  if (isEditingExisting && error && !name) {
    return (
      <div className="df-product-detail">
        <div className="df-product-detail__container df-product-detail__container--centered">
          <div className="df-product-detail__not-found-card">
            <h2 className="df-product-detail__not-found-title">Product Not Found</h2>
            <p className="df-product-detail__not-found-text">
              The product you are trying to view does not exist or was deleted.
            </p>
            <div className="df-product-detail__not-found-actions">
              <Link to="/products" className="df-products__btn-secondary">
                Back to Product Catalog
              </Link>
              <Link to="/products/new" className="df-products__btn-primary">
                + Create New Product
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-product-detail">
      <div className="df-product-detail__container">
        <Link to="/products" className="df-product-detail__back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Product Catalog
        </Link>

        {/* Title matching Wireframe #17 */}
        <div className="df-product-detail__header-row">
          <h1>Product and pricelist</h1>
          {isEditingExisting && (
            <span className="df-product-detail__status-badge">
              Editing SKU #{id}
            </span>
          )}
        </div>

        {error && (
          <div className="df-product-detail__alert-error">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="df-product-detail__alert-success">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Section: General Info matching Wireframe #17 */}
          <div className="df-product-detail__panel">
            <h3>General Info</h3>

            <div className="df-product-detail__grid-2">
              {/* Left Column */}
              <div>
                <div className="df-product-detail__field">
                  <label>Product name</label>
                  <input
                    type="text"
                    placeholder="e.g. Laptop Pro 14"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="df-product-detail__field">
                  <label>Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="df-product-detail__field">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1200"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    required
                  />
                </div>

                <div className="df-product-detail__field">
                  <label>Unit</label>
                  <input
                    type="text"
                    placeholder="Each / Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>

                <div className="df-product-detail__field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Product specifications and details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="df-product-detail__field">
                  <label>Tax %</label>
                  <input
                    type="number"
                    placeholder="15"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                  />
                </div>

                <div className="df-product-detail__field">
                  <label>Subscription</label>
                  <div className="df-product-detail__toggle-group">
                    <button
                      type="button"
                      className={isSubscription ? 'active' : ''}
                      onClick={() => setIsSubscription(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={!isSubscription ? 'active' : ''}
                      onClick={() => setIsSubscription(false)}
                    >
                      NO
                    </button>
                  </div>
                  <span className="df-product-detail__hint-text">
                    If subscription yes then recurring will be visible
                  </span>
                </div>

                {isSubscription && (
                  <div className="df-product-detail__field">
                    <label>Recurring</label>
                    <select
                      value={recurringCycle}
                      onChange={(e) => setRecurringCycle(e.target.value)}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                )}

                <div className="df-product-detail__field">
                  <label>Quantity on hand (Integer field)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={quantityOnHand}
                    onChange={(e) => setQuantityOnHand(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Product Variants matching Wireframe #17 */}
          <div className="df-product-detail__panel">
            <div className="df-product-detail__panel-header">
              <h3>PRODUCT VARIANTS</h3>
              <button
                type="button"
                className="df-product-detail__add-sub-btn"
                onClick={handleAddVariant}
              >
                + Add Variant Attribute
              </button>
            </div>

            <table className="df-product-detail__subtable">
              <thead>
                <tr>
                  <th className="col-attribute">Attribute</th>
                  <th className="col-values">Values</th>
                  <th className="col-extra">Extra price</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="df-product-detail__empty-table">
                      No variants added. Click "+ Add Variant Attribute" to define custom attributes.
                    </td>
                  </tr>
                ) : (
                  variants.map((v, index) => (
                    <tr key={v.id || index} className={v.isEditing ? 'df-row-editing' : ''}>
                      {/* Attribute Column */}
                      <td>
                        {v.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. Color, RAM, Size"
                            value={v.attribute}
                            onChange={(e) => handleUpdateVariantField(index, 'attribute', e.target.value)}
                            className="df-table-input"
                            autoFocus
                          />
                        ) : (
                          <span className="df-variant-attribute-title">{v.attribute}</span>
                        )}
                      </td>

                      {/* Values Column */}
                      <td>
                        {v.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. Blue, Black or 4GB, 8GB"
                            value={v.values}
                            onChange={(e) => handleUpdateVariantField(index, 'values', e.target.value)}
                            className="df-table-input"
                          />
                        ) : (
                          <span className="df-variant-values-text">{v.values || '—'}</span>
                        )}
                      </td>

                      {/* Extra Price Column */}
                      <td>
                        {v.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. 0 or +30"
                            value={v.extra_price}
                            onChange={(e) => handleUpdateVariantField(index, 'extra_price', e.target.value)}
                            className="df-table-input df-table-input--extra"
                          />
                        ) : (
                          <span className="df-variant-extra-price">{v.extra_price || '0'}</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="cell-actions">
                        {v.isEditing ? (
                          <div className="df-action-btn-group">
                            <button
                              type="button"
                              onClick={() => handleSaveVariantRow(index)}
                              className="df-action-btn df-action-btn--save"
                              title="Save row"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (v.isNew) {
                                  setVariants((prev) => prev.filter((_, i) => i !== index));
                                } else {
                                  handleToggleEditVariant(index, false);
                                }
                              }}
                              className="df-action-btn df-action-btn--cancel"
                              title="Cancel editing"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="df-action-btn-group">
                            <button
                              type="button"
                              onClick={() => handleToggleEditVariant(index, true)}
                              className="df-action-btn df-action-btn--edit"
                              title="Edit attribute"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(index)}
                              className="df-action-btn df-action-btn--delete"
                              title="Delete variant"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section: Pricelists matching Wireframe #17 */}
          <div className="df-product-detail__panel">
            <div className="df-product-detail__panel-header">
              <h3>PRICELISTS</h3>
              <button
                type="button"
                className="df-product-detail__add-sub-btn"
                onClick={handleAddPricelist}
              >
                + Add Pricelist Rule
              </button>
            </div>

            <table className="df-product-detail__subtable">
              <thead>
                <tr>
                  <th className="col-tier">Tier</th>
                  <th className="col-currency">Currency</th>
                  <th className="col-rule">Price Rule</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricelists.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="df-product-detail__empty-table">
                      No tier price rules configured. Click "+ Add Pricelist Rule" to add one.
                    </td>
                  </tr>
                ) : (
                  pricelists.map((pl, index) => (
                    <tr key={pl.id || index} className={pl.isEditing ? 'df-row-editing' : ''}>
                      {/* Tier Column */}
                      <td>
                        {pl.isEditing ? (
                          <select
                            value={pl.tier}
                            onChange={(e) => handleUpdatePricelistField(index, 'tier', e.target.value)}
                            className="df-table-select"
                          >
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            
                          </select>
                        ) : (
                          <span className="df-pricelist-tier-title">{pl.tier}</span>
                        )}
                      </td>

                      {/* Currency Column */}
                      <td>
                        {pl.isEditing ? (
                          <select
                            value={pl.currency}
                            onChange={(e) => handleUpdatePricelistField(index, 'currency', e.target.value)}
                            className="df-table-select"
                          >
                            <option value="USD">USD</option>
                            <option value="USD/EUR">USD/EUR</option>
                            <option value="INR">INR</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        ) : (
                          <span className="df-pricelist-currency-text">{pl.currency}</span>
                        )}
                      </td>

                      {/* Price Rule Column */}
                      <td>
                        {pl.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. Price minus 10 percent base"
                            value={pl.price_rule}
                            onChange={(e) => handleUpdatePricelistField(index, 'price_rule', e.target.value)}
                            className="df-table-input"
                          />
                        ) : (
                          <span className="df-pricelist-rule-text">{pl.price_rule}</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="cell-actions">
                        {pl.isEditing ? (
                          <div className="df-action-btn-group">
                            <button
                              type="button"
                              onClick={() => handleSavePricelistRow(index)}
                              className="df-action-btn df-action-btn--save"
                              title="Save rule"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (pl.isNew) {
                                  setPricelists((prev) => prev.filter((_, i) => i !== index));
                                } else {
                                  handleToggleEditPricelist(index, false);
                                }
                              }}
                              className="df-action-btn df-action-btn--cancel"
                              title="Cancel editing"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="df-action-btn-group">
                            <button
                              type="button"
                              onClick={() => handleToggleEditPricelist(index, true)}
                              className="df-action-btn df-action-btn--edit"
                              title="Edit rule"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePricelist(index)}
                              className="df-action-btn df-action-btn--delete"
                              title="Delete rule"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Notice Banner matching Wireframe #17 */}
          <div className="df-product-detail__notice-banner">
            Product details should be filled.
            <br />
            Recurring order with this product will be invoiced at the beginning of the period.
          </div>

          {/* Action buttons */}
          <div className="df-product-detail__actions">
            {isEditingExisting && (
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="df-product-detail__delete-btn"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            )}

            <Link to="/products" className="df-products__btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="df-products__btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving Product...' : isEditingExisting ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductDetail;
