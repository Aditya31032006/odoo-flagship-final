// ============================================================
// DEALFLOW360 - QUOTATION NEGOTIATION QUERIES
// ============================================================

export const GET_ACTIVE_NEGOTIATION = `
  SELECT 
    qn.id,
    qn.quotation_id,
    qn.status,
    qn.counter_discount_percentage,
    qn.requested_delivery_date,
    qn.created_by_user_id,
    u.name AS created_by_name,
    u.email AS created_by_email,
    u.role AS created_by_role,
    qn.created_at,
    qn.updated_at
  FROM quotation_negotiations qn
  JOIN users u ON qn.created_by_user_id = u.id
  WHERE qn.quotation_id = $1
  ORDER BY qn.created_at DESC
  LIMIT 1
`;

export const GET_NEGOTIATION_MESSAGES = `
  SELECT 
    nm.id,
    nm.negotiation_id,
    nm.quotation_item_id,
    qi.product_name_snapshot,
    qi.sku_snapshot,
    nm.sender_user_id,
    u.name AS sender_name,
    u.email AS sender_email,
    u.role AS sender_role,
    nm.sender_type,
    nm.message,
    nm.counter_discount_percentage,
    nm.requested_delivery_date,
    nm.message_type,
    nm.created_at
  FROM negotiation_messages nm
  JOIN users u ON nm.sender_user_id = u.id
  LEFT JOIN quotation_items qi ON nm.quotation_item_id = qi.id
  WHERE nm.negotiation_id = $1
  ORDER BY nm.created_at ASC
`;

export const CREATE_NEGOTIATION = `
  INSERT INTO quotation_negotiations (
    quotation_id,
    status,
    counter_discount_percentage,
    requested_delivery_date,
    created_by_user_id
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

export const UPDATE_NEGOTIATION_COUNTER = `
  UPDATE quotation_negotiations
  SET 
    counter_discount_percentage = $1,
    requested_delivery_date = $2,
    status = $3,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $4
  RETURNING *
`;

export const INSERT_NEGOTIATION_MESSAGE = `
  INSERT INTO negotiation_messages (
    negotiation_id,
    quotation_item_id,
    sender_user_id,
    sender_type,
    message,
    counter_discount_percentage,
    requested_delivery_date,
    message_type
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;

export const UPDATE_QUOTATION_STATUS = `
  UPDATE quotations
  SET 
    status = $1::quotation_status_enum,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $2
  RETURNING *
`;

export const CREATE_ORDER_FROM_QUOTATION = `
  INSERT INTO orders (
    order_number,
    quotation_id,
    customer_id,
    status
  )
  VALUES ($1, $2, $3, 'confirmed')
  ON CONFLICT (quotation_id) DO UPDATE 
  SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
  RETURNING *
`;

export const UPDATE_NEGOTIATION_STATUS_ACCEPTED = `
  UPDATE quotation_negotiations 
  SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
  WHERE id = $1;
`;

export const COUNT_ORDERS_TOTAL = `
  SELECT COUNT(*)::INT AS count FROM orders;
`;

export const GET_QUOTATION_ITEMS_ORDERED_BY_LINE = `
  SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY line_number ASC;
`;

export const INSERT_ORDER_ITEM_FROM_QUOTATION = `
  INSERT INTO order_items (
    order_id, quotation_item_id, product_variant_id, line_type,
    product_name_snapshot, sku_snapshot, quantity, unit_price,
    discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING id;
`;

export const GET_PRODUCT_ID_FROM_VARIANT = `
  SELECT product_id FROM product_variants WHERE id = $1;
`;

export const FIND_SUBSCRIPTION_PLAN_BY_NAME = `
  SELECT id, billing_cycle, price FROM subscription_plans WHERE name ILIKE $1 LIMIT 1;
`;

export const INSERT_DEFAULT_SUBSCRIPTION_PLAN = `
  INSERT INTO subscription_plans (product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund)
  VALUES ($1, $2, 'monthly', $3, true, true, true)
  RETURNING id, billing_cycle;
`;

export const INSERT_SUBSCRIPTION_FROM_ORDER = `
  INSERT INTO subscriptions (
    order_item_id, customer_id, subscription_plan_id, quantity, unit_price,
    billing_cycle, start_date, status
  ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'active')
  RETURNING id;
`;

export const INSERT_INITIAL_SUBSCRIPTION_BILLING_LINE = `
  INSERT INTO subscription_billing_lines (
    subscription_id, billing_period_start, billing_period_end, amount, is_prorated
  ) VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', $2, false);
`;

export const CHECK_NEGOTIATION_PRODUCT_VARIANT_IS_SUBSCRIPTION = `
  SELECT p.id AS product_id, p.name AS product_name, p.unit, sp.id AS plan_id, sp.billing_cycle
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  LEFT JOIN subscription_plans sp ON sp.product_id = p.id AND sp.is_active = TRUE
  WHERE pv.id = $1
  LIMIT 1;
`;

export const INSERT_NEGOTIATION_FALLBACK_SUBSCRIPTION_PLAN = `
  INSERT INTO subscription_plans (
    product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund, is_active
  ) VALUES ($1, $2, 'monthly', $3, true, true, true, true)
  RETURNING id, billing_cycle;
`;

