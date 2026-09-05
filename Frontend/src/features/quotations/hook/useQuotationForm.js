import { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogApi } from '../services/catalog.api.js';
import { quotationApi } from '../services/quotation.api.js';

export const useQuotationForm = ({ quotationId = null } = {}) => {
  // Catalog lookups
  const [customers, setCustomers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [approvalRules, setApprovalRules] = useState([]);
  const [upsellSuggestions, setUpsellSuggestions] = useState([]);
  const [priceListMap, setPriceListMap] = useState({}); // { [priceListId]: { [variantId]: price } }

  // Form State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [priceListId, setPriceListId] = useState('');
  const [status, setStatus] = useState('approved');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [lineItems, setLineItems] = useState([]);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // 1. Initial Load of Catalog Data & Existing Quotation (if editing)
  useEffect(() => {
    let isMounted = true;

    async function initCatalog() {
      try {
        setIsLoading(true);
        const [custList, plList, prodList, rulesList] = await Promise.all([
          catalogApi.getCustomers(),
          catalogApi.getPriceLists(),
          catalogApi.getProducts(),
          catalogApi.getApprovalRules(),
        ]);

        if (!isMounted) return;

        setCustomers(custList);
        setPriceLists(plList);
        setProducts(prodList);
        setApprovalRules(rulesList);

        if (quotationId && quotationId !== 'new') {
          const quote = await quotationApi.getQuotationById(quotationId);
          if (quote && isMounted) {
            setQuotationNumber(quote.quotation_number);
            setCustomerId(quote.customer_id);
            const foundCust = custList.find((c) => String(c.id) === String(quote.customer_id));
            setSelectedCustomer(foundCust || null);
            setPriceListId(quote.price_list_id || '');
            setStatus(quote.status || 'draft');
            if (quote.valid_until) {
              setValidUntil(new Date(quote.valid_until).toISOString().split('T')[0]);
            }
            if (Array.isArray(quote.items)) {
              setLineItems(
                quote.items.map((it) => ({
                  ...it,
                  key: `item-${it.id || Math.random()}`,
                }))
              );
            }
          }
        }
      } catch (err) {
        if (isMounted) setError(err.customMessage || 'Failed to initialize quotation catalog');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initCatalog();
    return () => {
      isMounted = false;
    };
  }, [quotationId]);

  // 2. When Customer is selected, resolve their tier & tier maximum discount
  const handleCustomerChange = useCallback(
    (newCustId) => {
      setCustomerId(newCustId);
      const cust = customers.find((c) => String(c.id) === String(newCustId));
      setSelectedCustomer(cust || null);

      // Auto-match price list for customer tier if available
      if (cust?.tier_id) {
        const matchingPl = priceLists.find((pl) => String(pl.tier_id) === String(cust.tier_id));
        if (matchingPl) {
          setPriceListId(matchingPl.id);
        }
      }
    },
    [customers, priceLists]
  );

  // 3. When Price List changes, fetch items price map
  useEffect(() => {
    if (!priceListId) return;
    async function loadPriceListPrices() {
      try {
        const items = await catalogApi.getPriceListItems(priceListId);
        const map = {};
        items.forEach((item) => {
          map[item.product_variant_id] = Number(item.price);
        });
        setPriceListMap((prev) => ({ ...prev, [priceListId]: map }));
      } catch (e) {
        console.warn('Failed to load price list items', e);
      }
    }
    if (!priceListMap[priceListId]) {
      loadPriceListPrices();
    }
  }, [priceListId, priceListMap]);

  // 4. Update Upsell Suggestions whenever product list in cart changes
  useEffect(() => {
    const productIds = Array.from(
      new Set(lineItems.map((item) => item.product_id).filter(Boolean))
    );
    if (productIds.length === 0) {
      setUpsellSuggestions([]);
      return;
    }

    let active = true;
    catalogApi.getUpsells(productIds).then((suggestions) => {
      if (active) {
        // Filter out products already present in line items
        const existingVariantIds = new Set(lineItems.map((i) => i.product_variant_id));
        const filtered = suggestions.filter((s) => !existingVariantIds.has(s.suggested_variant_id));
        setUpsellSuggestions(filtered.slice(0, 4));
      }
    });

    return () => {
      active = false;
    };
  }, [lineItems]);

  // Helper to re-evaluate line item calculations & limits
  const calculateLineItem = useCallback(
    (item, tierMaxDiscount) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(item.unit_price) || 0;
      const listPrice = Number(item.list_price) || unitPrice;
      const discountPct = Math.min(100, Math.max(0, Number(item.discount_percentage) || 0));
      const taxPct = Number(item.tax_percentage) || 0;

      // Calculate discount limit: min(tier limit, category limit)
      const tierLimit = tierMaxDiscount != null ? Number(tierMaxDiscount) : 100;
      const categoryLimit = item.category_max_discount != null ? Number(item.category_max_discount) : 100;
      const allowedDiscount = Math.min(tierLimit, categoryLimit);

      // Excess discount percentage
      const excessDiscount = Math.max(0, discountPct - allowedDiscount);

      const grossAmount = unitPrice * qty;
      const discountAmount = grossAmount * (discountPct / 100);
      const taxableAmount = Math.max(0, grossAmount - discountAmount);
      const taxAmount = taxableAmount * (taxPct / 100);
      const lineTotal = taxableAmount + taxAmount;

      return {
        ...item,
        quantity: qty,
        unit_price: unitPrice,
        list_price: listPrice,
        discount_percentage: discountPct,
        discount_amount: Number(discountAmount.toFixed(2)),
        tax_percentage: taxPct,
        tax_amount: Number(taxAmount.toFixed(2)),
        allowed_discount_percentage: Number(allowedDiscount.toFixed(2)),
        excess_discount_percentage: Number(excessDiscount.toFixed(2)),
        line_total: Number(lineTotal.toFixed(2)),
      };
    },
    []
  );

  // Recalculate all lines when customer's tier or priceList changes
  const tierMaxDiscount = selectedCustomer?.tier_max_discount ?? 15;

  // Add a new product variant line
  const addProductLine = useCallback(
    (variant) => {
      const customPrice = priceListMap[priceListId]?.[variant.product_variant_id];
      const initialPrice = customPrice != null ? customPrice : Number(variant.default_selling_price || variant.base_price);

      const newLine = calculateLineItem(
        {
          key: `line-${Date.now()}-${Math.random()}`,
          product_variant_id: variant.product_variant_id,
          product_id: variant.product_id,
          product_name: variant.product_name,
          product_name_snapshot: variant.product_name,
          variant_name: variant.variant_name,
          sku: variant.sku,
          sku_snapshot: variant.sku,
          category_id: variant.category_id,
          category_name: variant.category_name,
          category_max_discount: variant.category_max_discount,
          unit_price: initialPrice,
          list_price: initialPrice,
          quantity: 1,
          discount_percentage: 0,
          tax_percentage: Number(variant.tax_percentage || 0),
          is_upsell: Boolean(variant.is_upsell),
        },
        tierMaxDiscount
      );

      setLineItems((prev) => [...prev, newLine]);
    },
    [calculateLineItem, priceListId, priceListMap, tierMaxDiscount]
  );

  // Update specific field on line item (qty, discount, price, variant)
  const updateLineItem = useCallback(
    (index, field, value) => {
      setLineItems((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return prev;

        const modified = { ...current, [field]: value };

        // If product variant changed
        if (field === 'product_variant_id') {
          const variant = products.find((p) => String(p.product_variant_id) === String(value));
          if (variant) {
            const customPrice = priceListMap[priceListId]?.[variant.product_variant_id];
            const initialPrice = customPrice != null ? customPrice : Number(variant.default_selling_price || variant.base_price);
            modified.product_id = variant.product_id;
            modified.product_name = variant.product_name;
            modified.product_name_snapshot = variant.product_name;
            modified.variant_name = variant.variant_name;
            modified.sku = variant.sku;
            modified.sku_snapshot = variant.sku;
            modified.category_id = variant.category_id;
            modified.category_name = variant.category_name;
            modified.category_max_discount = variant.category_max_discount;
            modified.unit_price = initialPrice;
            modified.list_price = initialPrice;
            modified.tax_percentage = Number(variant.tax_percentage || 0);
          }
        }

        updated[index] = calculateLineItem(modified, tierMaxDiscount);
        return updated;
      });
    },
    [calculateLineItem, priceListId, priceListMap, products, tierMaxDiscount]
  );

  // Remove a line item
  const removeLineItem = useCallback((index) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  // Add an upsell suggestion directly as a line item
  const addUpsellSuggestion = useCallback(
    (sug) => {
      addProductLine({
        product_variant_id: sug.suggested_variant_id,
        product_id: sug.suggested_product_id,
        product_name: sug.suggested_product_name,
        variant_name: sug.suggested_variant_name,
        sku: sug.suggested_sku,
        category_id: sug.category_id,
        category_name: sug.category_name,
        category_max_discount: sug.category_max_discount,
        default_selling_price: sug.suggested_selling_price,
        base_price: sug.suggested_base_price,
        tax_percentage: sug.suggested_tax_percentage,
        is_upsell: true,
      });
    },
    [addProductLine]
  );

  // 5. Compute Grand Totals & Blended Risk Assessment
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    let totalExcessPoints = 0;
    let hasExcess = false;

    lineItems.forEach((item) => {
      const gross = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
      subtotal += gross;
      discountTotal += Number(item.discount_amount) || 0;
      taxTotal += Number(item.tax_amount) || 0;
      grandTotal += Number(item.line_total) || 0;

      const excess = Number(item.excess_discount_percentage) || 0;
      if (excess > 0) {
        hasExcess = true;
        totalExcessPoints += excess;
      }
    });

    const itemCount = lineItems.length;
    const blendedRiskScore = itemCount > 0 ? Number((totalExcessPoints / itemCount).toFixed(2)) : 0;

    let riskLevel = 'low';
    if (blendedRiskScore > 10) {
      riskLevel = 'high';
    } else if (blendedRiskScore > 0 || hasExcess) {
      riskLevel = 'medium';
    }

    // Determine approval requirements based on active rules
    const matchingRule = approvalRules.find((r) => {
      const min = Number(r.min_risk_score);
      const max = r.max_risk_score != null ? Number(r.max_risk_score) : Infinity;
      return blendedRiskScore >= min && blendedRiskScore <= max;
    }) || {
      requires_sales_manager: hasExcess,
      requires_finance: riskLevel === 'high',
    };

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      blendedRiskScore,
      riskLevel,
      hasExcess,
      matchingRule,
    };
  }, [approvalRules, lineItems]);

  // 6. Action: Save Draft
  const saveDraft = async () => {
    if (!customerId) {
      setError('Please select a customer.');
      return false;
    }
    if (lineItems.length === 0) {
      setError('Please add at least one product line item.');
      return false;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        customer_id: customerId,
        tier_id: selectedCustomer?.tier_id || null,
        price_list_id: priceListId || null,
        status: 'draft',
        blended_risk_score: calculatedTotals.blendedRiskScore,
        risk_level: calculatedTotals.riskLevel,
        subtotal: calculatedTotals.subtotal,
        discount_total: calculatedTotals.discountTotal,
        tax_total: calculatedTotals.taxTotal,
        grand_total: calculatedTotals.grandTotal,
        valid_until: validUntil,
        items: lineItems,
      };

      let result;
      if (quotationId && quotationId !== 'new') {
        result = await quotationApi.updateQuotation(quotationId, payload);
      } else {
        result = await quotationApi.createQuotation(payload);
      }

      setSuccessMessage('Quotation draft saved successfully!');
      return result;
    } catch (err) {
      setError(err.customMessage || 'Failed to save draft');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Action: Submit for Approval
  const submitForApproval = async () => {
    if (!customerId) {
      setError('Please select a customer.');
      return false;
    }
    if (lineItems.length === 0) {
      setError('Please add at least one product line item.');
      return false;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        customer_id: customerId,
        tier_id: selectedCustomer?.tier_id || null,
        price_list_id: priceListId || null,
        blended_risk_score: calculatedTotals.blendedRiskScore,
        risk_level: calculatedTotals.riskLevel,
        subtotal: calculatedTotals.subtotal,
        discount_total: calculatedTotals.discountTotal,
        tax_total: calculatedTotals.taxTotal,
        grand_total: calculatedTotals.grandTotal,
        valid_until: validUntil,
        items: lineItems,
        action_reason: 'Submitted for approval by Sales Representative',
      };

      const targetId = quotationId && quotationId !== 'new' ? quotationId : 'new';
      const result = await quotationApi.submitForApproval(targetId, payload);

      setSuccessMessage('Quotation submitted for approval successfully!');
      setStatus('pending_approval');
      return result;
    } catch (err) {
      setError(err.customMessage || 'Failed to submit quotation for approval');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Lookups
    customers,
    priceLists,
    products,
    upsellSuggestions,
    selectedCustomer,
    tierMaxDiscount,

    // Form fields
    quotationNumber,
    customerId,
    priceListId,
    status,
    validUntil,
    lineItems,
    calculatedTotals,

    // Setters / Handlers
    setPriceListId,
    setValidUntil,
    handleCustomerChange,
    addProductLine,
    updateLineItem,
    removeLineItem,
    addUpsellSuggestion,

    // State & Actions
    isLoading,
    isSaving,
    error,
    successMessage,
    clearError: () => setError(null),
    saveDraft,
    submitForApproval,
  };
};

export default useQuotationForm;
