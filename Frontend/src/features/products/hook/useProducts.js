import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductSummary, fetchAllProducts } from '../products.slice.js';
import { productsApi } from '../services/products.api.js';

export const useProducts = ({ id = null, isEditingExisting = false, autoFetch = true } = {}) => {
  const dispatch = useDispatch();
  const { summary, productsList, isLoading: isCatalogLoading, error: catalogError } = useSelector(
    (state) => state.products
  );

  // Detail / Form states
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [pricelists, setPricelists] = useState([]);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Catalog loading
  const loadCatalog = useCallback(() => {
    dispatch(fetchProductSummary());
    dispatch(fetchAllProducts());
  }, [dispatch]);

  useEffect(() => {
    if (autoFetch && !id) {
      loadCatalog();
    }
  }, [autoFetch, id, loadCatalog]);

  // 2. Detail / Form Data Loading
  const loadProductData = useCallback(
    async (resetFormCallback) => {
      try {
        const cats = await productsApi.getCategories();
        setCategories(cats || []);

        if (isEditingExisting && id) {
          setIsLoadingDetail(true);
          const p = await productsApi.getProductDetail(id);
          if (p) {
            if (resetFormCallback) {
              resetFormCallback({
                name: p.name || '',
                category_id: p.category_id || (cats?.[0]?.id || ''),
                base_price: p.base_price || '',
                unit: p.unit || 'Each',
                description: p.description || '',
                tax_percentage: p.tax_percentage || '0',
                is_subscription: p.unit === 'Recurring',
                recurring_cycle: 'Monthly',
                quantity_on_hand: '10',
              });
            }

            if (p.variants && p.variants.length > 0) {
              setVariants(
                p.variants.map((v, i) => {
                  let attribute = v.variant_name || 'Standard';
                  let values = '';
                  if (attribute.includes(':')) {
                    const colonIdx = attribute.indexOf(':');
                    values = attribute.substring(colonIdx + 1).trim();
                    attribute = attribute.substring(0, colonIdx).trim();
                  }
                  const baseNum = Number(p.base_price) || 0;
                  const sellNum = Number(v.selling_price) || baseNum;
                  const diff = sellNum - baseNum;
                  const extraPrice = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';

                  return {
                    id: v.variant_id || v.id || i + 1,
                    sku: v.sku || '',
                    attribute,
                    values,
                    extra_price: extraPrice,
                    isEditing: false,
                  };
                })
              );
            }
          }
        }
      } catch (err) {
        setFormError(err.message || 'Failed to load product information');
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [id, isEditingExisting]
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
      alert('Attribute name is required');
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
      alert('Price rule description is required');
      return false;
    }
    setPricelists((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEditing: false, isNew: false };
      return copy;
    });
    return true;
  };

  const deletePricelist = (index) => {
    const pl = pricelists[index];
    if (window.confirm(`Delete pricelist rule for "${pl.tier}" tier?`)) {
      setPricelists((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // 5. Product CRUD actions
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
        pricelists,
      };

      if (isEditingExisting) {
        await productsApi.updateProduct(id, payload);
        setSuccessMsg('Product updated successfully!');
        dispatch(fetchAllProducts());
        return { success: true, isUpdate: true };
      } else {
        const created = await productsApi.createProduct(payload);
        dispatch(fetchAllProducts());
        return { success: true, isUpdate: false, product: created };
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save product');
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (productName) => {
    if (!window.confirm(`Are you sure you want to delete product "${productName}"? This action cannot be undone.`)) {
      return { cancelled: true };
    }

    try {
      setIsDeleting(true);
      await productsApi.deleteProduct(id);
      dispatch(fetchAllProducts());
      return { success: true };
    } catch (err) {
      setFormError(err.message || 'Failed to delete product');
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
    saveProduct,
    deleteProduct,
  };
};

export default useProducts;
