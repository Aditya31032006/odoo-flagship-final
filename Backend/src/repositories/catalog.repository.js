import { pool } from '../config/database.js';
import {
  GET_ACTIVE_CUSTOMERS_WITH_TIER,
  GET_ACTIVE_PRICE_LISTS,
  GET_SELLABLE_PRODUCT_VARIANTS,
  GET_PRICE_LIST_ITEMS_BY_PRICE_LIST,
  GET_UPSELL_RULES_FOR_PRODUCTS,
  GET_ACTIVE_APPROVAL_RULES,
  GET_PRODUCT_CATALOG_SUMMARY,
  GET_ALL_PRODUCTS_WITH_VARIANTS_COUNT,
  GET_PRODUCT_CATEGORIES,
  GET_PRODUCT_BY_ID_FULL,
  GET_PRODUCT_VARIANTS_BY_PRODUCT_ID,
  UPDATE_PRODUCT_BY_ID,
  DELETE_PRODUCT_BY_ID,
  DELETE_PRODUCT_VARIANT_BY_ID,
  UPSERT_PRODUCT_CATEGORY,
  INSERT_PRODUCT,
  INSERT_PRODUCT_VARIANT,
  DELETE_PRODUCT_VARIANTS_EXCLUDING_IDS,
  DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID,
  UPDATE_PRODUCT_VARIANT_BY_ID,
  GET_ACTIVE_PRODUCT_VARIANTS_BY_PRODUCT_ID,
  SOFT_DELETE_PRODUCT_BY_ID,
  SOFT_DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID,
  SOFT_DELETE_PRODUCT_VARIANT_BY_ID,
} from '../queries/catalog.query.js';

export const getActiveCustomersRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_ACTIVE_CUSTOMERS_WITH_TIER);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getActiveCustomersRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getActivePriceListsRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_ACTIVE_PRICE_LISTS);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getActivePriceListsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getSellableVariantsRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_SELLABLE_PRODUCT_VARIANTS);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getSellableVariantsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getPriceListItemsRepo = async (priceListId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_PRICE_LIST_ITEMS_BY_PRICE_LIST, [priceListId]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getPriceListItemsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getUpsellRulesForProductsRepo = async (productIds = []) => {
  if (!productIds || productIds.length === 0) return [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_UPSELL_RULES_FOR_PRODUCTS, [productIds]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getUpsellRulesForProductsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getActiveApprovalRulesRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_ACTIVE_APPROVAL_RULES);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getActiveApprovalRulesRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getProductCatalogSummaryRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_PRODUCT_CATALOG_SUMMARY);
    await client.query('COMMIT');
    return result.rows[0] || {
      active_products_count: 0,
      archived_products_count: 0,
      pricelists_count: 0,
      currencies_count: 0,
      total_variants_count: 0,
    };
  } catch (error) {
    console.error('Error in getProductCatalogSummaryRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getAllProductsRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_ALL_PRODUCTS_WITH_VARIANTS_COUNT);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getAllProductsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getProductCategoriesRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_PRODUCT_CATEGORIES);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getProductCategoriesRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getProductDetailRepo = async (productId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prodRes = await client.query(GET_PRODUCT_BY_ID_FULL, [productId]);
    if (prodRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const variantsRes = await client.query(GET_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);
    await client.query('COMMIT');

    return {
      ...prodRes.rows[0],
      variants: variantsRes.rows,
    };
  } catch (error) {
    console.error('Error in getProductDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createProductRepo = async ({
  name,
  category_id,
  category_name = null,
  description = '',
  unit = 'Each',
  base_price = 0,
  tax_percentage = 0,
  is_active = true,
  variants = [],
  is_subscription = false,
  recurring_cycle = 'monthly',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let resolvedCategoryId = category_id;
    if (!resolvedCategoryId && category_name) {
      const catRes = await client.query(UPSERT_PRODUCT_CATEGORY, [category_name]);
      resolvedCategoryId = catRes.rows[0].id;
    }

    const prodRes = await client.query(INSERT_PRODUCT, [
      name,
      resolvedCategoryId,
      description,
      unit,
      base_price,
      tax_percentage,
      is_active,
    ]);
    const product = prodRes.rows[0];

    const createdVariants = [];
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const varRes = await client.query(INSERT_PRODUCT_VARIANT, [
          product.id,
          v.sku,
          v.variant_name || null,
          v.selling_price || base_price,
          true,
        ]);
        createdVariants.push(varRes.rows[0]);
      }
    } else {
      // Create default base variant
      const defaultSku = `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}-STD`;
      const varRes = await client.query(INSERT_PRODUCT_VARIANT, [
        product.id,
        defaultSku,
        'Standard',
        base_price,
        true,
      ]);
      createdVariants.push(varRes.rows[0]);
    }

    // If marked as recurring / subscription, automatically create active subscription plan
    if (unit === 'Recurring' || Boolean(is_subscription)) {
      let cycle = 'monthly';
      const c = String(recurring_cycle || '').toLowerCase();
      if (['monthly', 'quarterly', 'yearly'].includes(c)) {
        cycle = c;
      }
      await client.query(`
        INSERT INTO subscription_plans (
          product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active
        ) VALUES ($1, $2, $3::subscription_cycle_enum, $4, true, true, true, true)
      `, [product.id, name, cycle, base_price]);
    }

    await client.query('COMMIT');
    return {
      ...product,
      variants: createdVariants,
    };
  } catch (error) {
    console.error('Error in createProductRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateProductRepo = async (productId, {
  name,
  category_id,
  description = '',
  unit = 'Each',
  base_price = 0,
  tax_percentage = 0,
  is_active = true,
  variants = [],
  is_subscription = false,
  recurring_cycle = 'monthly',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateProdRes = await client.query(UPDATE_PRODUCT_BY_ID, [
      name,
      category_id,
      description,
      unit,
      base_price,
      tax_percentage,
      is_active,
      productId,
    ]);

    if (updateProdRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const updatedProduct = updateProdRes.rows[0];

    // If variants were provided, sync them
    if (variants && Array.isArray(variants)) {
      const existingVariantIds = variants
        .filter((v) => v.id && typeof v.id === 'number' && v.id < 1000000000000)
        .map((v) => v.id);

      if (existingVariantIds.length > 0) {
        // Delete variants that were removed from the product
        await client.query(DELETE_PRODUCT_VARIANTS_EXCLUDING_IDS, [productId, existingVariantIds]);
      } else if (variants.length > 0) {
        // All variants are newly added, remove all old variants for this product
        await client.query(DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);
      }

      // Upsert/Insert the current list of variants
      for (const v of variants) {
        if (v.id && typeof v.id === 'number' && v.id < 1000000000000) {
          // Update existing variant
          await client.query(UPDATE_PRODUCT_VARIANT_BY_ID, [
            v.variant_name || 'Standard',
            v.selling_price || base_price,
            v.id,
            productId,
            v.sku || null,
          ]);
        } else {
          // Insert new variant
          const sku = v.sku || `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`;
          await client.query(INSERT_PRODUCT_VARIANT, [
            productId,
            sku,
            v.variant_name || 'Standard',
            v.selling_price || base_price,
            true,
          ]);
        }
      }
    }

    // If marked as recurring / subscription, automatically create active subscription plan if missing
    if (unit === 'Recurring' || Boolean(is_subscription)) {
      let cycle = 'monthly';
      const c = String(recurring_cycle || '').toLowerCase();
      if (['monthly', 'quarterly', 'yearly'].includes(c)) {
        cycle = c;
      }
      const existingPlan = await client.query('SELECT id FROM subscription_plans WHERE product_id = $1 LIMIT 1', [productId]);
      if (existingPlan.rows.length === 0) {
        await client.query(`
          INSERT INTO subscription_plans (
            product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active
          ) VALUES ($1, $2, $3::subscription_cycle_enum, $4, true, true, true, true)
        `, [productId, name, cycle, base_price]);
      } else {
        await client.query(`
          UPDATE subscription_plans
          SET name = $1, price = $2, billing_cycle = $3::subscription_cycle_enum, is_active = true
          WHERE id = $4
        `, [name, base_price, cycle, existingPlan.rows[0].id]);
      }
    }

    const finalVariants = await client.query(GET_ACTIVE_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);

    await client.query('COMMIT');
    return {
      ...updatedProduct,
      variants: finalVariants.rows,
    };
  } catch (error) {
    console.error('Error in updateProductRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteProductRepo = async (productId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      await client.query(DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);
      const res = await client.query(DELETE_PRODUCT_BY_ID, [productId]);
      await client.query('COMMIT');
      return res.rows[0];
    } catch (fkErr) {
      await client.query('ROLLBACK');
      
      // Start fallback transaction for soft delete
      await client.query('BEGIN');
      const softRes = await client.query(SOFT_DELETE_PRODUCT_BY_ID, [productId]);
      await client.query(SOFT_DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);
      await client.query('COMMIT');
      return softRes.rows[0];
    }
  } catch (error) {
    console.error('Error in deleteProductRepo:', error);
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
};

export const deleteProductVariantRepo = async (variantId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const res = await client.query(DELETE_PRODUCT_VARIANT_BY_ID, [variantId]);
      await client.query('COMMIT');
      return res.rows[0];
    } catch (fkErr) {
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      const result = await client.query(SOFT_DELETE_PRODUCT_VARIANT_BY_ID, [variantId]);
      await client.query('COMMIT');
      return result.rows[0];
    }
  } catch (error) {
    console.error('Error in deleteProductVariantRepo:', error);
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
};
