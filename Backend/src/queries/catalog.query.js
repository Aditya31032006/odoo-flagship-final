// ============================================================
// DEALFLOW360 - CATALOG & LOOKUP QUERIES
// ============================================================

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

export const GET_PRICE_LIST_ITEMS_BY_PRICE_LIST = `
  SELECT 
    product_variant_id,
    price
  FROM price_list_items
  WHERE price_list_id = $1
`;

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
    COALESCE(cdc.max_discount_percentage, 100)::NUMERIC(5,2) AS category_max_discount,
    FALSE AS is_subscription,
    NULL AS billing_cycle,
    NULL AS subscription_plan_id
  FROM upsell_rules ur
  JOIN products p_sug ON ur.suggested_product_id = p_sug.id
  JOIN product_categories pc_sug ON p_sug.category_id = pc_sug.id
  LEFT JOIN category_discount_ceilings cdc ON pc_sug.id = cdc.category_id
  JOIN product_variants pv_sug ON p_sug.id = pv_sug.product_id
  WHERE ur.is_active = TRUE 
    AND p_sug.is_active = TRUE 
    AND pv_sug.is_active = TRUE
    AND ur.source_product_id = ANY($1::BIGINT[])
  
  UNION ALL

  SELECT
    sp.id AS rule_id,
    sp.product_id AS source_product_id,
    p.id AS suggested_product_id,
    0 AS minimum_margin_percentage,
    10 AS priority,
    TRUE AS is_promoted,
    (p.name || ' - ' || sp.name || ' (' || UPPER(sp.billing_cycle::text) || ')') AS suggested_product_name,
    sp.price AS suggested_base_price,
    p.tax_percentage AS suggested_tax_percentage,
    COALESCE(pv.id, 0) AS suggested_variant_id,
    COALESCE(pv.sku, (p.name || '-SUB')) AS suggested_sku,
    (sp.name || ' [' || UPPER(sp.billing_cycle::text) || ']') AS suggested_variant_name,
    sp.price AS suggested_selling_price,
    pc.id AS category_id,
    pc.name AS category_name,
    COALESCE(cdc.max_discount_percentage, 100)::NUMERIC(5,2) AS category_max_discount,
    TRUE AS is_subscription,
    sp.billing_cycle::text AS billing_cycle,
    sp.id AS subscription_plan_id
  FROM subscription_plans sp
  JOIN products p ON sp.product_id = p.id
  JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN category_discount_ceilings cdc ON pc.id = cdc.category_id
  LEFT JOIN LATERAL (
    SELECT id, sku FROM product_variants WHERE product_id = p.id AND is_active = TRUE ORDER BY id ASC LIMIT 1
  ) pv ON TRUE
  WHERE sp.is_active = TRUE
    AND p.is_active = TRUE
    AND sp.product_id = ANY($1::BIGINT[])

  ORDER BY priority DESC, is_promoted DESC;
`;

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

// ============================================================
// PRODUCT CATALOG DASHBOARD & CRUD QUERIES
// ============================================================

export const GET_PRODUCT_CATALOG_SUMMARY = `
  SELECT 
    (SELECT COUNT(*)::INT FROM products WHERE is_active = TRUE) AS active_products_count,
    (SELECT COUNT(*)::INT FROM products WHERE is_active = FALSE) AS archived_products_count,
    (SELECT COUNT(*)::INT FROM price_lists WHERE is_active = TRUE) AS pricelists_count,
    (SELECT COUNT(DISTINCT currency)::INT FROM price_lists WHERE is_active = TRUE) AS currencies_count,
    (SELECT COUNT(*)::INT FROM product_variants WHERE is_active = TRUE) AS total_variants_count
`;

export const GET_ALL_PRODUCTS_WITH_VARIANTS_COUNT = `
  SELECT 
    p.id,
    p.name,
    p.description,
    p.category_id,
    pc.name AS category_name,
    p.base_price,
    p.unit,
    p.tax_percentage,
    p.is_active,
    p.created_at,
    (
      SELECT COUNT(*)::INT 
      FROM product_variants pv 
      WHERE pv.product_id = p.id AND pv.is_active = TRUE
    ) AS variants_count,
    (
      SELECT pv.variant_name 
      FROM product_variants pv 
      WHERE pv.product_id = p.id AND pv.is_active = TRUE 
      LIMIT 1
    ) AS sample_variant_name
  FROM products p
  JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.is_active = TRUE
  ORDER BY p.name ASC
`;

export const GET_PRODUCT_CATEGORIES = `
  SELECT id, name, parent_category_id
  FROM product_categories
  ORDER BY name ASC
`;

export const GET_PRODUCT_BY_ID_FULL = `
  SELECT 
    p.id,
    p.name,
    p.category_id,
    pc.name AS category_name,
    p.description,
    p.unit,
    p.base_price,
    p.tax_percentage,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM products p
  JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.id = $1
`;

export const GET_PRODUCT_VARIANTS_BY_PRODUCT_ID = `
  SELECT 
    pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.variant_name,
    pv.selling_price,
    pv.is_active
  FROM product_variants pv
  WHERE pv.product_id = $1
  ORDER BY pv.sku ASC
`;

export const UPDATE_PRODUCT_BY_ID = `
  UPDATE products
  SET 
    name = $1,
    category_id = $2,
    description = $3,
    unit = $4,
    base_price = $5,
    tax_percentage = $6,
    is_active = $7,
    updated_at = NOW()
  WHERE id = $8
  RETURNING *;
`;

export const DELETE_PRODUCT_BY_ID = `
  DELETE FROM products
  WHERE id = $1
  RETURNING id;
`;

export const DELETE_PRODUCT_VARIANT_BY_ID = `
  DELETE FROM product_variants
  WHERE id = $1
  RETURNING id;
`;

export const UPSERT_PRODUCT_CATEGORY = `
  INSERT INTO product_categories (name) 
  VALUES ($1) 
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
  RETURNING id;
`;

export const INSERT_PRODUCT = `
  INSERT INTO products (name, category_id, description, unit, base_price, tax_percentage, is_active)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *;
`;

export const INSERT_PRODUCT_VARIANT = `
  INSERT INTO product_variants (product_id, sku, variant_name, selling_price, is_active)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *;
`;

export const DELETE_PRODUCT_VARIANTS_EXCLUDING_IDS = `
  DELETE FROM product_variants 
  WHERE product_id = $1 AND id != ALL($2::int[]);
`;

export const DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID = `
  DELETE FROM product_variants 
  WHERE product_id = $1;
`;

export const UPDATE_PRODUCT_VARIANT_BY_ID = `
  UPDATE product_variants 
  SET variant_name = $1, selling_price = $2, sku = COALESCE($5, sku), is_active = TRUE
  WHERE id = $3 AND product_id = $4;
`;

export const GET_ACTIVE_PRODUCT_VARIANTS_BY_PRODUCT_ID = `
  SELECT * FROM product_variants 
  WHERE product_id = $1 AND is_active = TRUE 
  ORDER BY id ASC;
`;

export const SOFT_DELETE_PRODUCT_BY_ID = `
  UPDATE products 
  SET is_active = FALSE, updated_at = NOW() 
  WHERE id = $1 
  RETURNING id;
`;

export const SOFT_DELETE_PRODUCT_VARIANTS_BY_PRODUCT_ID = `
  UPDATE product_variants 
  SET is_active = FALSE 
  WHERE product_id = $1;
`;

export const SOFT_DELETE_PRODUCT_VARIANT_BY_ID = `
  UPDATE product_variants 
  SET is_active = FALSE 
  WHERE id = $1 
  RETURNING id;
`;

export const GET_SUBSCRIPTION_PLANS_BY_PRODUCT_ID = `
  SELECT 
    id,
    name,
    billing_cycle,
    price,
    allow_proration,
    allow_cancellation,
    allow_partial_refund,
    is_active
  FROM subscription_plans
  WHERE product_id = $1 AND is_active = TRUE
  ORDER BY id ASC;
`;

export const INSERT_SUBSCRIPTION_PLAN_FOR_RECURRING_PRODUCT = `
  INSERT INTO subscription_plans (
    product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active
  ) VALUES ($1, $2, $3::subscription_cycle_enum, $4, true, true, true, true);
`;

export const INSERT_SUBSCRIPTION_PLAN_CUSTOM = `
  INSERT INTO subscription_plans (
    product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active
  ) VALUES ($1, $2, $3::subscription_cycle_enum, $4, $5, $6, $7, true)
  RETURNING *;
`;

export const FIND_SUBSCRIPTION_PLAN_BY_PRODUCT_ID = `
  SELECT id FROM subscription_plans 
  WHERE product_id = $1 
  LIMIT 1;
`;

export const UPDATE_SUBSCRIPTION_PLAN_BY_ID = `
  UPDATE subscription_plans
  SET 
    name = $1, 
    price = $2, 
    billing_cycle = $3::subscription_cycle_enum, 
    allow_proration = $4,
    allow_cancellation = $5,
    allow_partial_refund = $6,
    is_active = true
  WHERE id = $7 AND product_id = $8;
`;

export const DELETE_SUBSCRIPTION_PLANS_EXCLUDING_IDS = `
  UPDATE subscription_plans
  SET is_active = FALSE
  WHERE product_id = $1 AND id <> ALL($2::BIGINT[]);
`;

export const DEACTIVATE_ALL_SUBSCRIPTION_PLANS_FOR_PRODUCT = `
  UPDATE subscription_plans
  SET is_active = FALSE
  WHERE product_id = $1;
`;


