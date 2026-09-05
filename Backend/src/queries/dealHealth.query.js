export const GET_DEAL_HEALTH_CONFIG = `
  SELECT 
    id,
    stalled_days,
    discount_anomaly_multiplier,
    delivery_slippage_days,
    is_active,
    created_at
  FROM deal_health_config
  WHERE is_active = TRUE
  ORDER BY id DESC
  LIMIT 1;
`;

export const UPDATE_DEAL_HEALTH_CONFIG = `
  UPDATE deal_health_config
  SET 
    stalled_days = COALESCE($1, stalled_days),
    discount_anomaly_multiplier = COALESCE($2, discount_anomaly_multiplier),
    delivery_slippage_days = COALESCE($3, delivery_slippage_days)
  WHERE is_active = TRUE
  RETURNING *;
`;

export const INSERT_DEAL_HEALTH_CONFIG_DEFAULT = `
  INSERT INTO deal_health_config (stalled_days, discount_anomaly_multiplier, delivery_slippage_days, is_active)
  VALUES (7, 1.5, 3, TRUE)
  RETURNING *;
`;

export const GET_ALL_DEAL_HEALTH_FLAGS = `
  SELECT 
    dhf.id,
    dhf.quotation_id,
    dhf.flag_type,
    dhf.detail,
    dhf.action,
    dhf.created_at,
    dhf.resolved_at,
    dhf.resolved_by_user_id,
    q.quotation_number,
    q.status AS quotation_status,
    q.grand_total,
    c.id AS customer_id,
    c.company_name AS customer_name,
    c.email AS customer_email,
    u.name AS sales_rep_name,
    ru.name AS resolved_by_name
  FROM deal_health_flags dhf
  JOIN quotations q ON dhf.quotation_id = q.id
  JOIN customers c ON q.customer_id = c.id
  LEFT JOIN users u ON q.sales_rep_id = u.id
  LEFT JOIN users ru ON dhf.resolved_by_user_id = ru.id
  ORDER BY 
    CASE 
      WHEN dhf.action = 'open' THEN 1
      WHEN dhf.action = 'acknowledged' THEN 2
      ELSE 3
    END,
    dhf.created_at DESC;
`;

export const GET_DEAL_HEALTH_FLAGS_BY_TYPE = `
  SELECT 
    dhf.id,
    dhf.quotation_id,
    dhf.flag_type,
    dhf.detail,
    dhf.action,
    dhf.created_at,
    dhf.resolved_at,
    dhf.resolved_by_user_id,
    q.quotation_number,
    q.status AS quotation_status,
    q.grand_total,
    c.id AS customer_id,
    c.company_name AS customer_name,
    c.email AS customer_email,
    u.name AS sales_rep_name,
    ru.name AS resolved_by_name
  FROM deal_health_flags dhf
  JOIN quotations q ON dhf.quotation_id = q.id
  JOIN customers c ON q.customer_id = c.id
  LEFT JOIN users u ON q.sales_rep_id = u.id
  LEFT JOIN users ru ON dhf.resolved_by_user_id = ru.id
  WHERE dhf.flag_type = $1
  ORDER BY 
    CASE 
      WHEN dhf.action = 'open' THEN 1
      WHEN dhf.action = 'acknowledged' THEN 2
      ELSE 3
    END,
    dhf.created_at DESC;
`;

export const GET_DEAL_HEALTH_SUMMARY_COUNTS = `
  SELECT 
    COUNT(*) FILTER (WHERE flag_type = 'stalled_deal' AND action <> 'resolved')::int AS stalled_count,
    COUNT(*) FILTER (WHERE flag_type = 'discount_anomaly' AND action <> 'resolved')::int AS discount_anomaly_count,
    COUNT(*) FILTER (WHERE flag_type = 'delivery_slippage' AND action <> 'resolved')::int AS delivery_slippage_count,
    COUNT(*) FILTER (WHERE action <> 'resolved')::int AS total_open_flags,
    COUNT(*)::int AS total_all_flags
  FROM deal_health_flags;
`;

export const UPDATE_DEAL_HEALTH_FLAG_ACTION = `
  UPDATE deal_health_flags
  SET 
    action = $2::deal_health_action_enum,
    detail = COALESCE($3, detail),
    resolved_at = CASE WHEN $2::deal_health_action_enum = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
    resolved_by_user_id = CASE WHEN $2::deal_health_action_enum = 'resolved' THEN $4 ELSE resolved_by_user_id END
  WHERE id = $1
  RETURNING *;
`;

export const INSERT_DEAL_HEALTH_FLAG = `
  INSERT INTO deal_health_flags (
    quotation_id,
    flag_type,
    detail,
    action
  )
  VALUES ($1, $2, $3, 'open')
  RETURNING *;
`;
