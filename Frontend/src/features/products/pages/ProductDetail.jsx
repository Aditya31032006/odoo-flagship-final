import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import useProducts from '../hook/useProducts.js';
import '../styles/productDetail.scss';

export const ProductDetail = ({ isNew = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditingExisting = Boolean(id && id !== 'new' && !isNew);

  // React 4-Layer Architecture: Single Unified Hook
  const {
    categories,
    variants,
    pricelists,
    isLoading,
    isSaving,
    isDeleting,
    error,
    successMsg,
    loadProductData,
    addVariant,
    toggleEditVariant,
    updateVariantField,
    saveVariantRow,
    deleteVariant,
    addPricelist,
    toggleEditPricelist,
    updatePricelistField,
    savePricelistRow,
    deletePricelist,
    saveProduct,
    deleteProduct,
  } = useProducts({ id, isEditingExisting });

  // Presentation Layer: React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      category_id: '',
      base_price: '',
      unit: 'Each',
      description: '',
      tax_percentage: '18',
      is_subscription: false,
      recurring_cycle: 'Monthly',
      quantity_on_hand: '10',
    },
  });

  const isSubscription = watch('is_subscription');
  const productName = watch('name');

  // Initial load
  useEffect(() => {
    loadProductData(reset);
  }, [loadProductData, reset]);

  const onFormSubmit = async (formData) => {
    const res = await saveProduct(formData);
    if (res?.success) {
      navigate('/products');
    }
  };

  const onDeleteClick = async () => {
    const res = await deleteProduct(productName || 'Product');
    if (res?.success) {
      navigate('/products');
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

  if (isEditingExisting && error && !productName) {
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

        {/* React Hook Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
          {/* Section: General Info matching Wireframe #17 */}
          <div className="df-product-detail__panel">
            <h3>General Info</h3>

            <div className="df-product-detail__grid-2">
              {/* Left Column */}
              <div>
                <div className="df-product-detail__field">
                  <label htmlFor="name">Product name *</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. Laptop Pro 14"
                    {...register('name', {
                      required: 'Product name is required',
                      minLength: { value: 2, message: 'Must be at least 2 characters' },
                    })}
                  />
                  {errors.name && (
                    <span className="field-error">{errors.name.message}</span>
                  )}
                </div>

                <div className="df-product-detail__field">
                  <label htmlFor="category_id">Category *</label>
                  <select
                    id="category_id"
                    {...register('category_id', {
                      required: 'Please select a category',
                    })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <span className="field-error">{errors.category_id.message}</span>
                  )}
                </div>

                <div className="df-product-detail__field">
                  <label htmlFor="base_price">Price ($) *</label>
                  <input
                    id="base_price"
                    type="number"
                    step="0.01"
                    placeholder="1200"
                    {...register('base_price', {
                      required: 'Price is required',
                      min: { value: 0, message: 'Price cannot be negative' },
                    })}
                  />
                  {errors.base_price && (
                    <span className="field-error">{errors.base_price.message}</span>
                  )}
                </div>

                <div className="df-product-detail__field">
                  <label htmlFor="unit">Unit</label>
                  <input
                    id="unit"
                    type="text"
                    placeholder="Each / Unit"
                    {...register('unit')}
                  />
                </div>

                <div className="df-product-detail__field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Product specifications and details..."
                    {...register('description')}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="df-product-detail__field">
                  <label htmlFor="tax_percentage">Tax %</label>
                  <input
                    id="tax_percentage"
                    type="number"
                    placeholder="15"
                    {...register('tax_percentage', {
                      min: { value: 0, message: 'Tax cannot be negative' },
                      max: { value: 100, message: 'Tax cannot exceed 100%' },
                    })}
                  />
                  {errors.tax_percentage && (
                    <span className="field-error">{errors.tax_percentage.message}</span>
                  )}
                </div>

                <div className="df-product-detail__field">
                  <label>Subscription</label>
                  <div className="df-product-detail__toggle-group">
                    <button
                      type="button"
                      className={isSubscription ? 'active' : ''}
                      onClick={() => setValue('is_subscription', true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={!isSubscription ? 'active' : ''}
                      onClick={() => setValue('is_subscription', false)}
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
                    <label htmlFor="recurring_cycle">Recurring</label>
                    <select
                      id="recurring_cycle"
                      {...register('recurring_cycle')}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                )}

                <div className="df-product-detail__field">
                  <label htmlFor="quantity_on_hand">Quantity on hand (Integer field)</label>
                  <input
                    id="quantity_on_hand"
                    type="number"
                    min="0"
                    placeholder="100"
                    {...register('quantity_on_hand', {
                      min: { value: 0, message: 'Quantity cannot be negative' },
                    })}
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
                onClick={addVariant}
              >
                + Add Variant Attribute
              </button>
            </div>

            <table className="df-product-detail__subtable">
              <thead>
                <tr>
                  <th className="col-sku">SKU Code</th>
                  <th className="col-attribute">Attribute</th>
                  <th className="col-values">Values</th>
                  <th className="col-extra">Extra price</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="df-product-detail__empty-table">
                      No variants added. Click "+ Add Variant Attribute" to define custom attributes.
                    </td>
                  </tr>
                ) : (
                  variants.map((v, index) => (
                    <tr key={v.id || index} className={v.isEditing ? 'df-row-editing' : ''}>
                      {/* SKU Code Column */}
                      <td>
                        {v.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. LP14-16GB-SLV"
                            value={v.sku || ''}
                            onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                            className="df-table-input df-table-input--sku"
                            autoFocus
                          />
                        ) : (
                          <span className="df-variant-sku-tag">{v.sku || 'Auto-generated'}</span>
                        )}
                      </td>

                      {/* Attribute Column */}
                      <td>
                        {v.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. Color, RAM, Size"
                            value={v.attribute}
                            onChange={(e) => updateVariantField(index, 'attribute', e.target.value)}
                            className="df-table-input"
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
                            onChange={(e) => updateVariantField(index, 'values', e.target.value)}
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
                            onChange={(e) => updateVariantField(index, 'extra_price', e.target.value)}
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
                              onClick={() => saveVariantRow(index)}
                              className="df-action-btn df-action-btn--save"
                              title="Save row"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (v.isNew) {
                                  deleteVariant(index);
                                } else {
                                  toggleEditVariant(index, false);
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
                              onClick={() => toggleEditVariant(index, true)}
                              className="df-action-btn df-action-btn--edit"
                              title="Edit attribute"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteVariant(index)}
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
                onClick={addPricelist}
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
                            onChange={(e) => updatePricelistField(index, 'tier', e.target.value)}
                            className="df-table-select"
                          >
                            <option value="Bronze">Bronze</option>
                            <option value="Silver">Silver</option>
                            <option value="Gold">Gold</option>
                            <option value="Platinum">Platinum</option>
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
                            onChange={(e) => updatePricelistField(index, 'currency', e.target.value)}
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
                            onChange={(e) => updatePricelistField(index, 'price_rule', e.target.value)}
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
                              onClick={() => savePricelistRow(index)}
                              className="df-action-btn df-action-btn--save"
                              title="Save rule"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (pl.isNew) {
                                  deletePricelist(index);
                                } else {
                                  toggleEditPricelist(index, false);
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
                              onClick={() => toggleEditPricelist(index, true)}
                              className="df-action-btn df-action-btn--edit"
                              title="Edit rule"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePricelist(index)}
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
                onClick={onDeleteClick}
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
