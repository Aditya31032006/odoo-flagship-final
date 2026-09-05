// ============================================================
// DEALFLOW360 - DISCOUNT TIERS & APPROVAL CHAINS QUERIES
// ============================================================

export const GET_ALL_CUSTOMER_TIERS = `
  SELECT 
    id, 
    name, 
    COALESCE(max_discount_percentage, 0)::NUMERIC(5,2) AS max_discount_percentage,
    created_at
  FROM customer_tiers
  ORDER BY id ASC;
`;

export const GET_ALL_CATEGORY_DISCOUNT_CEILINGS = `
  SELECT 
    pc.id AS category_id,
    pc.name AS category_name,
    cdc.id AS ceiling_id,
    COALESCE(cdc.max_discount_percentage, 0)::NUMERIC(5,2) AS max_discount_percentage
  FROM product_categories pc
  LEFT JOIN category_discount_ceilings cdc ON pc.id = cdc.category_id
  ORDER BY pc.id ASC;
`;

export const GET_ALL_APPROVAL_RULES = `
  SELECT 
    id,
    name,
    COALESCE(min_risk_score, 0)::NUMERIC(5,2) AS min_risk_score,
    COALESCE(max_risk_score, 0)::NUMERIC(5,2) AS max_risk_score,
    requires_sales_manager,
    requires_finance,
    is_active,
    created_at
  FROM approval_rules
  ORDER BY id ASC;
`;

export const UPDATE_CUSTOMER_TIER = `
  UPDATE customer_tiers
  SET max_discount_percentage = $1
  WHERE id = $2
  RETURNING id, name, max_discount_percentage;
`;

export const UPSERT_CATEGORY_DISCOUNT_CEILING = `
  INSERT INTO category_discount_ceilings (category_id, max_discount_percentage)
  VALUES ($1, $2)
  ON CONFLICT (category_id) 
  DO UPDATE SET max_discount_percentage = EXCLUDED.max_discount_percentage
  RETURNING id, category_id, max_discount_percentage;
`;

export const UPDATE_APPROVAL_RULE = `
  UPDATE approval_rules
  SET 
    name = $1,
    min_risk_score = $2,
    max_risk_score = $3,
    requires_sales_manager = $4,
    requires_finance = $5,
    is_active = $6
  WHERE id = $7
  RETURNING *;
`;
