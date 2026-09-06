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
  WHERE q.status::TEXT NOT IN ('payment')
    AND NOT EXISTS (
      SELECT 1 FROM orders ord 
      JOIN invoices inv ON inv.order_id = ord.id 
      WHERE ord.quotation_id = q.id AND inv.status = 'paid'
    )
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
    AND q.status::TEXT NOT IN ('payment')
    AND NOT EXISTS (
      SELECT 1 FROM orders ord 
      JOIN invoices inv ON inv.order_id = ord.id 
      WHERE ord.quotation_id = q.id AND inv.status = 'paid'
    )
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
    COUNT(*) FILTER (WHERE dhf.flag_type = 'stalled_deal' AND dhf.action <> 'resolved')::int AS stalled_count,
    COUNT(*) FILTER (WHERE dhf.flag_type = 'discount_anomaly' AND dhf.action <> 'resolved')::int AS discount_anomaly_count,
    COUNT(*) FILTER (WHERE dhf.flag_type = 'delivery_slippage' AND dhf.action <> 'resolved')::int AS delivery_slippage_count,
    COUNT(*) FILTER (WHERE dhf.action <> 'resolved')::int AS total_open_flags,
    COUNT(*)::int AS total_all_flags
  FROM deal_health_flags dhf
  JOIN quotations q ON dhf.quotation_id = q.id
  WHERE q.status::TEXT NOT IN ('payment')
    AND NOT EXISTS (
      SELECT 1 FROM orders ord 
      JOIN invoices inv ON inv.order_id = ord.id 
      WHERE ord.quotation_id = q.id AND inv.status = 'paid'
    );
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

export const FIND_STALLED_QUOTATIONS = `
  SELECT 
    q.id,
    q.quotation_number,
    q.updated_at,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - q.updated_at))::int AS idle_days
  FROM quotations q
  WHERE q.status::TEXT IN ('draft', 'sent', 'negotiating', 'pending_approval')
    AND q.updated_at <= CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM deal_health_flags dhf 
      WHERE dhf.quotation_id = q.id 
        AND dhf.flag_type = 'stalled_deal' 
        AND dhf.action <> 'resolved'
    );
`;

export const GET_AVERAGE_ITEM_DISCOUNT = `
  SELECT COALESCE(AVG(discount_percentage), 8.0)::numeric(5,2) AS avg_discount 
  FROM quotation_items 
  WHERE discount_percentage > 0;
`;

export const FIND_DISCOUNT_ANOMALIES = `
  SELECT 
    qi.quotation_id,
    MAX(qi.discount_percentage)::numeric(5,2) AS max_discount,
    MAX(qi.excess_discount_percentage)::numeric(5,2) AS max_excess
  FROM quotation_items qi
  JOIN quotations q ON qi.quotation_id = q.id
  WHERE (qi.discount_percentage >= $1 OR qi.excess_discount_percentage > 0)
    AND q.status::TEXT NOT IN ('rejected', 'expired', 'cancelled', 'payment')
    AND NOT EXISTS (
      SELECT 1 FROM orders ord 
      JOIN invoices inv ON inv.order_id = ord.id 
      WHERE ord.quotation_id = q.id AND inv.status = 'paid'
    )
    AND NOT EXISTS (
      SELECT 1 FROM deal_health_flags dhf 
      WHERE dhf.quotation_id = qi.quotation_id 
        AND dhf.flag_type = 'discount_anomaly' 
        AND dhf.action <> 'resolved'
    )
  GROUP BY qi.quotation_id;
`;

export const FIND_DELIVERY_SLIPPAGE_DEALS = `
  SELECT 
    o.quotation_id,
    fs.id AS split_id,
    fs.estimated_shipment_date,
    (CURRENT_DATE - fs.estimated_shipment_date)::int AS overdue_days
  FROM fulfillment_splits fs
  JOIN order_items oi ON fs.order_item_id = oi.id
  JOIN orders o ON oi.order_id = o.id
  JOIN quotations q ON o.quotation_id = q.id
  WHERE fs.status IN ('pending', 'allocated', 'processing')
    AND fs.estimated_shipment_date < CURRENT_DATE - ($1 || ' days')::INTERVAL
    AND o.quotation_id IS NOT NULL
    AND q.status::TEXT NOT IN ('payment')
    AND NOT EXISTS (
      SELECT 1 FROM orders ord 
      JOIN invoices inv ON inv.order_id = ord.id 
      WHERE ord.quotation_id = q.id AND inv.status = 'paid'
    )
    AND NOT EXISTS (
      SELECT 1 FROM deal_health_flags dhf 
      WHERE dhf.quotation_id = o.quotation_id 
        AND dhf.flag_type = 'delivery_slippage' 
        AND dhf.action <> 'resolved'
    );
`;

