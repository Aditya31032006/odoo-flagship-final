import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductSummary, fetchAllProducts } from '../products.slice.js';
import { productsApi } from '../services/products.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';

export const useProducts = ({ id = null, isEditingExisting = false, autoFetch = true } = {}) => {
  const dispatch = useDispatch();
  const { toast, confirm } = useToast();
  const { summary, productsList, isLoading: isCatalogLoading, isInitialized, error: catalogError } = useSelector(
    (state) => state.products
  );

  // Detail / Form states
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [pricelists, setPricelists] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Catalog loading (cached via Redux store)
  const loadCatalog = useCallback((force = false) => {
    if (force || !isInitialized) {
      dispatch(fetchProductSummary());
      dispatch(fetchAllProducts());
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (autoFetch && !id && !isInitialized) {
      loadCatalog();
    }
  }, [autoFetch, id, isInitialized, loadCatalog]);

  // Fetch categories for forms
  const loadCategories = useCallback(async () => {
    try {
      const cats = await productsApi.getCategories();
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategory = useCallback(
    async (name) => {
      try {
        const newCat = await productsApi.createCategory(name);
        if (newCat) {
          setCategories((prev) => {
            if (prev.some((c) => String(c.id) === String(newCat.id))) return prev;
            return [...prev, newCat];
          });
          toast.success(`Category "${newCat.name}" created successfully`);
          return newCat;
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.message || 'Failed to create category');
        return null;
      }
    },
    [toast]
  );

  // 2. Product Detail loading
  const loadProductData = useCallback(
    async (productIdParam) => {
      // Guard against function or object being accidentally passed in
      const targetId =
        (typeof productIdParam === 'number' || (typeof productIdParam === 'string' && productIdParam !== 'new' && !isNaN(Number(productIdParam))))
          ? productIdParam
          : (id && id !== 'new' && !isNaN(Number(id)))
          ? id
          : null;

      if (!targetId) return null;
      try {
        setIsLoadingDetail(true);
        setFormError(null);
        const data = await productsApi.getProductDetail(targetId);
        if (data) {
          if (data.categories) setCategories(data.categories);
          if (data.variants) {
            setVariants(
              data.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                attribute: v.variant_name?.split(':')[0]?.trim() || '',
                values: v.variant_name?.split(':')[1]?.trim() || '',
                extra_price: v.selling_price || '0',
                isEditing: false,
                isNew: false,
              }))
            );
          }
          if (data.subscription_plans) {
            setSubscriptionPlans(
              data.subscription_plans.map((sp) => ({
                id: sp.id,
                name: sp.name || '',
                billing_cycle: sp.billing_cycle || 'monthly',
                price: sp.price !== undefined ? String(sp.price) : '0',
                allow_proration: sp.allow_proration !== undefined ? Boolean(sp.allow_proration) : true,
                allow_cancellation: sp.allow_cancellation !== undefined ? Boolean(sp.allow_cancellation) : true,
                allow_partial_refund: sp.allow_partial_refund !== undefined ? Boolean(sp.allow_partial_refund) : false,
                isEditing: false,
                isNew: false,
              }))
            );
          }
          if (data.pricelists) {
            setPricelists(
              data.pricelists.map((p) => ({
                id: p.id,
                tier: p.tier_name || 'Silver',
                currency: p.currency || 'INR',
                price_rule: p.rule_description || '',
                isEditing: false,
                isNew: false,
              }))
            );
          }
        }
        return data;
      } catch (err) {
        setFormError(err.message || 'Failed to load product details');
        return null;
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [id]
  );

  // 3. Variant operations
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: Date.now(),
        sku: '',
        attribute: '',
        values: '',
        extra_price: '0',
        isEditing: true,
        isNew: true,
      },
    ]);
  };

  const toggleEditVariant = (index, shouldEdit = true) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: shouldEdit };
      return copy;
    });
  };

  const updateVariantField = (index, field, value) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveVariantRow = (index) => {
    const v = variants[index];
    if (!v.attribute.trim()) {
      toast.error('Attribute name is required');
      return false;
    }
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
    return true;
  };

  const deleteVariant = async (index) => {
    const v = variants[index];
    const ok = await confirm({
      title: 'Delete Variant Attribute',
      message: `Are you sure you want to delete the variant attribute "${v.attribute || 'this entry'}"?`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (ok) {
      if (v.id && typeof v.id === 'number' && v.id < 1000000000000 && isEditingExisting) {
        try {
          await productsApi.deleteVariant(v.id);
        } catch (e) {
          console.warn('Variant deleted locally:', e.message);
        }
      }
      setVariants((prev) => prev.filter((_, i) => i !== index));
      toast.success('Variant removed');
    }
  };

  // 4. Pricelist operations
  const addPricelist = () => {
    setPricelists((prev) => [
      ...prev,
      {
        id: Date.now(),
        tier: 'Silver',
        currency: 'INR',
        price_rule: 'Price minus 5 percent base',
        isEditing: true,
        isNew: true,
      },
    ]);
  };

  const toggleEditPricelist = (index, shouldEdit = true) => {
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: shouldEdit };
      return copy;
    });
  };

  const updatePricelistField = (index, field, value) => {
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const savePricelistRow = (index) => {
    const pl = pricelists[index];
    if (!pl.price_rule.trim()) {
      toast.error('Price rule description is required');
      return false;
    }
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
    return true;
  };

  const deletePricelist = async (index) => {
    const pl = pricelists[index];
    const ok = await confirm({
      title: 'Delete Pricelist Rule',
      message: `Delete pricelist rule for "${pl.tier}" tier?`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (ok) {
      setPricelists((prev) => prev.filter((_, i) => i !== index));
      toast.success('Pricelist rule removed');
    }
  };

  // 5. Subscription Plan operations
  const addSubscriptionPlan = (defaultCycle = 'monthly', defaultName = '') => {
    setSubscriptionPlans((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: defaultName || '',
        billing_cycle: defaultCycle,
        price: '',
        allow_proration: true,
        allow_cancellation: true,
        allow_partial_refund: false,
        isEditing: true,
        isNew: true,
      },
    ]);
  };

  const toggleEditSubscriptionPlan = (index, shouldEdit = true) => {
    setSubscriptionPlans((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: shouldEdit };
      return copy;
    });
  };

  const updateSubscriptionPlanField = (index, field, value) => {
    setSubscriptionPlans((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveSubscriptionPlanRow = (index) => {
    const plan = subscriptionPlans[index];
    if (!plan.name.trim()) {
      toast.error('Subscription plan name is required');
      return false;
    }
    setSubscriptionPlans((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
    return true;
  };

  const deleteSubscriptionPlan = async (index) => {
    const plan = subscriptionPlans[index];
    const ok = await confirm({
      title: 'Remove Subscription Plan',
      message: `Are you sure you want to remove plan "${plan.name || 'this plan'}"?`,
      confirmText: 'Remove',
      type: 'danger',
    });
    if (ok) {
      setSubscriptionPlans((prev) => prev.filter((_, i) => i !== index));
      toast.success('Subscription plan removed');
    }
  };

  // 6. Product CRUD actions
  const saveProduct = async (formData) => {
    try {
      setIsSaving(true);
      setFormError(null);
      setSuccessMsg(null);

      const payload = {
        name: formData.name.trim(),
        category_id: formData.category_id,
        base_price: Number(formData.base_price) || 0,
        unit: formData.is_subscription ? 'Recurring' : (formData.unit || 'Each'),
        is_subscription: Boolean(formData.is_subscription),
        recurring_cycle: (formData.recurring_cycle || 'monthly').toLowerCase(),
        description: formData.description || '',
        tax_percentage: Number(formData.tax_percentage) || 0,
        variants: variants.map((v) => {
          const attr = (v.attribute || '').trim();
          const val = (v.values || '').trim();
          const variantName = val ? `${attr}: ${val}` : attr || 'Standard';
          const extraPriceNum = parseFloat(String(v.extra_price).replace(/[^0-9.-]/g, '')) || 0;
          const baseNum = Number(formData.base_price) || 0;
          const sellingPrice = baseNum + extraPriceNum;
          const autoSku = `${formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)}-${attr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3) || 'VAR'}-${Math.floor(Math.random() * 900 + 100)}`;

          return {
            id: v.id,
            sku: (v.sku && v.sku.trim()) || autoSku,
            variant_name: variantName,
            selling_price: sellingPrice,
          };
        }),
        subscription_plans: subscriptionPlans.map((sp) => ({
          id: sp.id,
          name: (sp.name || '').trim() || `${formData.name} ${sp.billing_cycle}`,
          billing_cycle: sp.billing_cycle || 'monthly',
          price: sp.price !== '' ? Number(sp.price) : Number(formData.base_price) || 0,
          allow_proration: Boolean(sp.allow_proration),
          allow_cancellation: Boolean(sp.allow_cancellation),
          allow_partial_refund: Boolean(sp.allow_partial_refund),
        })),
        pricelists,
      };

      if (isEditingExisting) {
        await productsApi.updateProduct(id, payload);
        setSuccessMsg('Product updated successfully!');
        toast.success('Product updated successfully!');
        dispatch(fetchAllProducts());
        return { success: true, isUpdate: true };
      } else {
        const created = await productsApi.createProduct(payload);
        toast.success('Product created successfully!');
        dispatch(fetchAllProducts());
        return { success: true, isUpdate: false, product: created };
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save product');
      toast.error(err.message || 'Failed to save product');
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (productName) => {
    const ok = await confirm({
      title: 'Delete Product SKU',
      message: `Are you sure you want to delete product "${productName}"? This action cannot be undone.`,
      confirmText: 'Delete Product',
      type: 'danger',
    });
    if (!ok) {
      return { cancelled: true };
    }

    try {
      setIsDeleting(true);
      await productsApi.deleteProduct(id);
      toast.success(`Product "${productName}" deleted successfully`);
      dispatch(fetchAllProducts());
      return { success: true };
    } catch (err) {
      setFormError(err.message || 'Failed to delete product');
      toast.error(err.message || 'Failed to delete product');
      return { success: false, error: err.message };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    // Catalog state
    summary,
    productsList,
    isCatalogLoading,
    catalogError,
    refreshCatalog: loadCatalog,

    // Form & Detail state
    categories,
    variants,
    pricelists,
    subscriptionPlans,
    isLoading: isLoadingDetail || isCatalogLoading,
    isSaving,
    isDeleting,
    error: formError || catalogError,
    successMsg,
    setFormError,
    setSuccessMsg,

    // Form handlers
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
    createCategory: handleCreateCategory,
    saveProduct,
    deleteProduct,
  };
};

export default useProducts;
