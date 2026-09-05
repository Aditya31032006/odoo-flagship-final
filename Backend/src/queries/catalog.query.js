// ============================================================
// DEALFLOW360 - CATALOG & LOOKUP QUERIES
// ============================================================

/**
 * Fetch all active customers along with their current assigned tier & max discount
 */
export const GET_ACTIVE_CUSTOMERS_WITH_TIER = `
  SELECT 
    c.id,
    c.company_name,
    c.gst_number,
    c.email,
    c.phone,
    c.billing_address,
    c.shipping_address,
    cta.tier_id,
    ct.name AS tier_name,
    COALESCE(ct.max_discount_percentage, 0)::NUMERIC(5,2) AS tier_max_discount
  FROM customers c
  LEFT JOIN customer_tier_assignments cta 
    ON c.id = cta.customer_id AND cta.is_current = TRUE
  LEFT JOIN customer_tiers ct 
    ON cta.tier_id = ct.id
  WHERE c.is_active = TRUE
  ORDER BY c.company_name ASC
`;

/**
 * Fetch active price lists, optionally filtered by tier
 */
export const GET_ACTIVE_PRICE_LISTS = `
  SELECT 
    pl.id,
    pl.name,
    pl.tier_id,
    ct.name AS tier_name,
    pl.currency,
    pl.adjustment_percentage
  FROM price_lists pl
  LEFT JOIN customer_tiers ct ON pl.tier_id = ct.id
  WHERE pl.is_active = TRUE
  ORDER BY pl.name ASC
`;

/**
 * Fetch all sellable product variants (SKUs) with product details,
 * category discount ceilings, and price list items
 */
export const GET_SELLABLE_PRODUCT_VARIANTS = `
  SELECT 
    pv.id AS product_variant_id,
    pv.product_id,
    pv.sku,
    pv.variant_name,
    pv.selling_price AS default_selling_price,
    p.name AS product_name,
    p.description AS product_description,
    p.unit,
    p.base_price,
    p.tax_percentage,
    p.category_id,
    pc.name AS category_name,
    COALESCE(cdc.max_discount_percentage, 100)::NUMERIC(5,2) AS category_max_discount
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN category_discount_ceilings cdc ON pc.id = cdc.category_id
  WHERE pv.is_active = TRUE AND p.is_active = TRUE
  ORDER BY p.name ASC, pv.variant_name ASC
`;

/**
 * Fetch price list items for a specific price list
 */
export const GET_PRICE_LIST_ITEMS_BY_PRICE_LIST = `
  SELECT 
    product_variant_id,
    price
  FROM price_list_items
  WHERE price_list_id = $1
`;

/**
 * Fetch upsell & cross-sell suggestions for a list of product IDs
 */
export const GET_UPSELL_RULES_FOR_PRODUCTS = `
  SELECT 
    ur.id AS rule_id,
    ur.source_product_id,
    ur.suggested_product_id,
    ur.minimum_margin_percentage,
    ur.priority,
    ur.is_promoted,
    p_sug.name AS suggested_product_name,
    p_sug.base_price AS suggested_base_price,
    p_sug.tax_percentage AS suggested_tax_percentage,
    pv_sug.id AS suggested_variant_id,
    pv_sug.sku AS suggested_sku,
    pv_sug.variant_name AS suggested_variant_name,
    pv_sug.selling_price AS suggested_selling_price,
    pc_sug.id AS category_id,
    pc_sug.name AS category_name,
    COALESCE(cdc.max_discount_percentage, 100)::NUMERIC(5,2) AS category_max_discount
  FROM upsell_rules ur
  JOIN products p_sug ON ur.suggested_product_id = p_sug.id
  JOIN product_categories pc_sug ON p_sug.category_id = pc_sug.id
  LEFT JOIN category_discount_ceilings cdc ON pc_sug.id = cdc.category_id
  JOIN product_variants pv_sug ON p_sug.id = pv_sug.product_id
  WHERE ur.is_active = TRUE 
    AND p_sug.is_active = TRUE 
    AND pv_sug.is_active = TRUE
    AND ur.source_product_id = ANY($1::BIGINT[])
  ORDER BY ur.priority DESC, ur.is_promoted DESC
`;

/**
 * Fetch active approval rules
 */
export const GET_ACTIVE_APPROVAL_RULES = `
  SELECT 
    id,
    name,
    min_risk_score,
    max_risk_score,
    requires_sales_manager,
    requires_finance
  FROM approval_rules
  WHERE is_active = TRUE
  ORDER BY min_risk_score ASC
`;
