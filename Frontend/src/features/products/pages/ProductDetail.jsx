import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import useProducts from '../hook/useProducts.js';
import PermissionGate from '../../../shared/components/PermissionGate.jsx';
import BackButton from '../../../shared/components/BackButton.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/productDetail.scss';

export const ProductDetail = ({ isNew = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditingExisting = Boolean(id && id !== 'new' && !isNew);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState('');

  // React 4-Layer Architecture: Single Unified Hook
  const {
    categories,
    variants,
    pricelists,
    subscriptionPlans,
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
    addSubscriptionPlan,
    toggleEditSubscriptionPlan,
    updateSubscriptionPlanField,
    saveSubscriptionPlanRow,
    deleteSubscriptionPlan,
    createCategory,
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
    if (isEditingExisting && id) {
      loadProductData(id).then((data) => {
        if (data) {
          reset({
            name: data.name || '',
            category_id: data.category_id || '',
            base_price: data.base_price || '',
            unit: data.unit || 'Each',
            description: data.description || '',
            tax_percentage: data.tax_percentage || '18',
            is_subscription: Boolean(data.is_subscription),
            recurring_cycle: data.recurring_cycle || 'Monthly',
            quantity_on_hand: data.quantity_on_hand || '10',
          });
        }
      });
    }
  }, [id, isEditingExisting, loadProductData, reset]);

  const onFormSubmit = async (formData) => {
    const res = await saveProduct(formData);
    if (res?.success) {
      navigate('/products');
    }
  };

  const onFormError = (formErrors) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length === 0) return;

    const values = watch();
    const isAllEmpty = !values.name?.trim() && !values.category_id && (!values.base_price || String(values.base_price).trim() === '');

    if (isAllEmpty) {
      toast.error('All required fields are empty. Please fill in Product Name, Category, and Price.');
      return;
    }

    if (errorKeys.length > 1) {
      const fieldNames = errorKeys
        .map((k) => {
          if (k === 'name') return 'Product Name';
          if (k === 'category_id') return 'Category';
          if (k === 'base_price') return 'Price';
          return k;
        })
        .join(', ');
      toast.error(`Please complete all required fields: ${fieldNames}`);
    } else {
      const firstError = formErrors[errorKeys[0]];
      toast.error(firstError?.message || 'Please fill in the required field');
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
        {/* Uniform Back Navigation placed in Left Top Corner */}
        <BackButton to="/products" label="Back to Product Catalog" />

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
        <form onSubmit={handleSubmit(onFormSubmit, onFormError)} noValidate>
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
                  <div className="df-product-detail__category-header">
                    <label htmlFor="category_id">Category *</label>
                    <PermissionGate allowedRoles={['admin', 'sales_manager', 'operations']}>
                      <button
                        type="button"
                        className="df-product-detail__category-add-btn"
                        onClick={() => {
                          setCategoryModalError('');
                          setNewCategoryName('');
                          setIsCategoryModalOpen(true);
                        }}
                      >
                        + New Category
                      </button>
                    </PermissionGate>
                  </div>
                  <select
                    id="category_id"
                    {...register('category_id', {
                      required: 'Please select a category',
                    })}
                  >
                    <option value="" disabled>Select a category...</option>
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
                  <label htmlFor="base_price">Price (₹) *</label>
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



          {/* Section: Related Subscription Plans & Recurring Add-ons */}
          <div className="df-product-detail__panel">
            <div className="df-product-detail__panel-header">
              <div>
                <h3>RELATED SUBSCRIPTION PLANS & RECURRING ADD-ONS</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
                  Define warranty, care plans, or recurring service packages that can be attached and suggested in quotations.
                </p>
              </div>
              <button
                type="button"
                className="df-product-detail__add-sub-btn"
                onClick={() => addSubscriptionPlan('monthly', productName ? `${productName} Care Plan` : 'Care Plan')}
              >
                + Add Subscription Plan
              </button>
            </div>

            <table className="df-product-detail__subtable">
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Plan / Service Name</th>
                  <th style={{ width: '140px' }}>Billing Cycle</th>
                  <th style={{ width: '130px' }}>Price (₹)</th>
                  <th style={{ width: '160px' }}>Proration / Cancellation</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionPlans.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="df-product-detail__empty-table">
                      No subscription plans attached to this product yet. Click "+ Add Subscription Plan" to configure recurring warranty or service tiers.
                    </td>
                  </tr>
                ) : (
                  subscriptionPlans.map((plan, index) => (
                    <tr key={plan.id || index} className={plan.isEditing ? 'df-row-editing' : ''}>
                      {/* Plan Name Column */}
                      <td>
                        {plan.isEditing ? (
                          <input
                            type="text"
                            placeholder="e.g. 3-Year Comprehensive Care Plan"
                            value={plan.name}
                            onChange={(e) => updateSubscriptionPlanField(index, 'name', e.target.value)}
                            className="df-table-input"
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {plan.name || 'Unnamed Plan'}
                          </span>
                        )}
                      </td>

                      {/* Billing Cycle Column */}
                      <td>
                        {plan.isEditing ? (
                          <select
                            value={plan.billing_cycle}
                            onChange={(e) => updateSubscriptionPlanField(index, 'billing_cycle', e.target.value)}
                            className="df-table-input"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        ) : (
                          <span className="badge-role" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                            {plan.billing_cycle}
                          </span>
                        )}
                      </td>

                      {/* Price Column */}
                      <td>
                        {plan.isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 199.00"
                            value={plan.price}
                            onChange={(e) => updateSubscriptionPlanField(index, 'price', e.target.value)}
                            className="df-table-input"
                          />
                        ) : (
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                            ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Proration / Cancellation Column */}
                      <td>
                        {plan.isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(plan.allow_proration)}
                                onChange={(e) => updateSubscriptionPlanField(index, 'allow_proration', e.target.checked)}
                              />
                              Proration
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(plan.allow_cancellation)}
                                onChange={(e) => updateSubscriptionPlanField(index, 'allow_cancellation', e.target.checked)}
                              />
                              Cancelable
                            </label>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {plan.allow_proration ? '✓ Prorate' : '✕ No prorate'} • {plan.allow_cancellation ? '✓ Cancelable' : '✕ Lock-in'}
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="cell-actions">
                        {plan.isEditing ? (
                          <div className="df-action-btn-group">
                            <button
                              type="button"
                              onClick={() => saveSubscriptionPlanRow(index)}
                              className="df-action-btn df-action-btn--save"
                              title="Save plan"
                            >
                              ✓ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (plan.isNew) {
                                  deleteSubscriptionPlan(index);
                                } else {
                                  toggleEditSubscriptionPlan(index, false);
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
                              onClick={() => toggleEditSubscriptionPlan(index, true)}
                              className="df-action-btn df-action-btn--edit"
                              title="Edit plan"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSubscriptionPlan(index)}
                              className="df-action-btn df-action-btn--delete"
                              title="Delete plan"
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

          {/* Action buttons */}
          <div className="df-product-detail__actions">
            <PermissionGate allowedRoles={['admin', 'sales_manager', 'operations']}>
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
            </PermissionGate>

            <Link to="/products" className="df-products__btn-secondary">
              Cancel
            </Link>

            <PermissionGate allowedRoles={['admin', 'sales_manager', 'operations']}>
              <button
                type="submit"
                className="df-products__btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving Product...' : isEditingExisting ? 'Update Product' : 'Save Product'}
              </button>
            </PermissionGate>
          </div>
        </form>

        {/* New Category Modal Popup */}
        {isCategoryModalOpen && (
          <div className="df-product-detail__modal-overlay">
            <div className="df-product-detail__modal-card">
              <div className="df-product-detail__modal-header">
                <h3>Create New Category</h3>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  &times;
                </button>
              </div>

              {categoryModalError && (
                <div className="df-product-detail__modal-error">
                  {categoryModalError}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newCategoryName.trim()) {
                    setCategoryModalError('Please enter a category name');
                    toast.error('Please enter a category name');
                    return;
                  }
                  setIsSubmittingCategory(true);
                  const created = await createCategory(newCategoryName.trim());
                  setIsSubmittingCategory(false);
                  if (created) {
                    setValue('category_id', String(created.id));
                    setNewCategoryName('');
                    setIsCategoryModalOpen(false);
                  }
                }}
              >
                <div className="df-product-detail__field" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="new_cat_name" style={{ display: 'block', marginBottom: '0.4rem', color: '#cbd5e1' }}>
                    Category Name *
                  </label>
                  <input
                    id="new_cat_name"
                    type="text"
                    placeholder="e.g. Laptops, Workstations, Cloud Subscriptions"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (categoryModalError) setCategoryModalError('');
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="df-products__btn-secondary"
                    onClick={() => setIsCategoryModalOpen(false)}
                    disabled={isSubmittingCategory}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="df-products__btn-primary"
                    disabled={isSubmittingCategory || !newCategoryName.trim()}
                  >
                    {isSubmittingCategory ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
