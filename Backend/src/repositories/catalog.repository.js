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
} from '../queries/catalog.query.js';

export const getActiveCustomersRepo = async () => {
  const result = await pool.query(GET_ACTIVE_CUSTOMERS_WITH_TIER);
  return result.rows;
};

export const getActivePriceListsRepo = async () => {
  const result = await pool.query(GET_ACTIVE_PRICE_LISTS);
  return result.rows;
};

export const getSellableVariantsRepo = async () => {
  const result = await pool.query(GET_SELLABLE_PRODUCT_VARIANTS);
  return result.rows;
};

export const getPriceListItemsRepo = async (priceListId) => {
  const result = await pool.query(GET_PRICE_LIST_ITEMS_BY_PRICE_LIST, [priceListId]);
  return result.rows;
};

export const getUpsellRulesForProductsRepo = async (productIds = []) => {
  if (!productIds || productIds.length === 0) return [];
  const result = await pool.query(GET_UPSELL_RULES_FOR_PRODUCTS, [productIds]);
  return result.rows;
};

export const getActiveApprovalRulesRepo = async () => {
  const result = await pool.query(GET_ACTIVE_APPROVAL_RULES);
  return result.rows;
};

export const getProductCatalogSummaryRepo = async () => {
  const result = await pool.query(GET_PRODUCT_CATALOG_SUMMARY);
  return result.rows[0] || {
    active_products_count: 0,
    archived_products_count: 0,
    pricelists_count: 0,
    currencies_count: 0,
    total_variants_count: 0,
  };
};

export const getAllProductsRepo = async () => {
  const result = await pool.query(GET_ALL_PRODUCTS_WITH_VARIANTS_COUNT);
  return result.rows;
};

export const getProductCategoriesRepo = async () => {
  const result = await pool.query(GET_PRODUCT_CATEGORIES);
  return result.rows;
};

export const getProductDetailRepo = async (productId) => {
  const prodRes = await pool.query(GET_PRODUCT_BY_ID_FULL, [productId]);
  if (prodRes.rows.length === 0) return null;

  const variantsRes = await pool.query(GET_PRODUCT_VARIANTS_BY_PRODUCT_ID, [productId]);

  return {
    ...prodRes.rows[0],
    variants: variantsRes.rows,
  };
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
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let resolvedCategoryId = category_id;
    if (!resolvedCategoryId && category_name) {
      const catRes = await client.query(
        'INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [category_name]
      );
      resolvedCategoryId = catRes.rows[0].id;
    }

    const prodRes = await client.query(`
      INSERT INTO products (name, category_id, description, unit, base_price, tax_percentage, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `, [name, resolvedCategoryId, description, unit, base_price, tax_percentage, is_active]);
    const product = prodRes.rows[0];

    const createdVariants = [];
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const varRes = await client.query(`
          INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `, [product.id, v.sku, v.variant_name || null, v.selling_price || base_price, true]);
        createdVariants.push(varRes.rows[0]);
      }
    } else {
      // Create default base variant
      const defaultSku = `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}-STD`;
      const varRes = await client.query(`
        INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active)
        VALUES ($1, $2, 'Standard', $3, TRUE)
        RETURNING *;
      `, [product.id, defaultSku, base_price]);
      createdVariants.push(varRes.rows[0]);
    }

    await client.query('COMMIT');
    return {
      ...product,
      variants: createdVariants,
    };
  } catch (error) {
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
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateProdRes = await client.query(
      `UPDATE products 
       SET name = $1, category_id = $2, description = $3, unit = $4, base_price = $5, tax_percentage = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *;`,
      [name, category_id, description, unit, base_price, tax_percentage, is_active, productId]
    );

    if (updateProdRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const updatedProduct = updateProdRes.rows[0];

    // If variants were provided, sync them
    if (variants && variants.length > 0) {
      // Keep existing or insert new
      for (const v of variants) {
        if (v.id && typeof v.id === 'number' && v.id < 1000000000000) {
          // Existing variant ID
          await client.query(
            `UPDATE product_variants 
             SET variant_name = $1, selling_price = $2, is_active = TRUE
             WHERE id = $3 AND product_id = $4`,
            [v.variant_name, v.selling_price || base_price, v.id, productId]
          );
        } else {
          // New variant
          const sku = v.sku || `${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4)}-${Math.floor(Math.random() * 9000 + 1000)}`;
          await client.query(
            `INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active)
             VALUES ($1, $2, $3, $4, TRUE)`,
            [productId, sku, v.variant_name || 'Standard', v.selling_price || base_price]
          );
        }
      }
    }

    const finalVariants = await client.query(
      'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = TRUE ORDER BY sku ASC',
      [productId]
    );

    await client.query('COMMIT');
    return {
      ...updatedProduct,
      variants: finalVariants.rows,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteProductRepo = async (productId) => {
  const result = await pool.query(
    'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
    [productId]
  );
  return result.rows[0];
};

export const deleteProductVariantRepo = async (variantId) => {
  const result = await pool.query(
    'UPDATE product_variants SET is_active = FALSE WHERE id = $1 RETURNING id',
    [variantId]
  );
  return result.rows[0];
};

