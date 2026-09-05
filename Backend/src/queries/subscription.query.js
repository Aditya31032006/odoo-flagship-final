export const GET_ALL_SUBSCRIPTIONS = `
  SELECT 
    s.id,
    s.order_item_id,
    s.customer_id,
    s.subscription_plan_id,
    s.quantity,
    s.unit_price,
    s.billing_cycle,
    s.start_date,
    s.end_date,
    s.status,
    s.created_at,
    s.updated_at,
    c.company_name AS customer_name,
    c.email AS customer_email,
    sp.name AS plan_name,
    sp.price AS plan_price,
    sp.allow_proration,
    sp.allow_cancellation,
    sp.allow_partial_refund,
    COALESCE(
      (
        SELECT sbl.billing_period_end
        FROM subscription_billing_lines sbl
        WHERE sbl.subscription_id = s.id
          AND sbl.billing_period_end >= CURRENT_DATE
        ORDER BY sbl.billing_period_end ASC
        LIMIT 1
      ),
      s.end_date,
      s.start_date + INTERVAL '1 month'
    ) AS next_bill_date
  FROM subscriptions s
  JOIN customers c ON s.customer_id = c.id
  JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
  ORDER BY s.created_at DESC;
`;

export const GET_SUBSCRIPTION_STATUS_COUNTS = `
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
    COUNT(*) FILTER (WHERE status = 'paused')::int AS paused_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count,
    COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_count,
    COUNT(*)::int AS total_count
  FROM subscriptions;
`;

export const GET_SUBSCRIPTION_BY_ID = `
  SELECT 
    s.id,
    s.order_item_id,
    s.customer_id,
    s.subscription_plan_id,
    s.quantity,
    s.unit_price,
    s.billing_cycle,
    s.start_date,
    s.end_date,
    s.status,
    s.created_at,
    s.updated_at,
    c.company_name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.billing_address AS customer_billing_address,
    sp.name AS plan_name,
    sp.billing_cycle AS default_plan_cycle,
    sp.price AS plan_price,
    sp.allow_proration,
    sp.allow_cancellation,
    sp.allow_partial_refund,
    oi.order_id,
    o.order_number,
    COALESCE(
      (
        SELECT sbl.billing_period_end
        FROM subscription_billing_lines sbl
        WHERE sbl.subscription_id = s.id
          AND sbl.billing_period_end >= CURRENT_DATE
        ORDER BY sbl.billing_period_end ASC
        LIMIT 1
      ),
      s.end_date,
      s.start_date + INTERVAL '1 month'
    ) AS next_bill_date
  FROM subscriptions s
  JOIN customers c ON s.customer_id = c.id
  JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
  JOIN order_items oi ON s.order_item_id = oi.id
  LEFT JOIN orders o ON oi.order_id = o.id
  WHERE s.id = $1;
`;

export const GET_ORIGINATING_ORDER_ONE_TIME_ITEMS = `
  SELECT 
    oi.id,
    oi.order_id,
    oi.product_name_snapshot AS product_name,
    oi.sku_snapshot AS sku,
    oi.quantity,
    oi.unit_price,
    oi.discount_percentage,
    oi.discount_amount,
    oi.tax_percentage,
    oi.tax_amount,
    oi.line_total,
    pv.sku AS variant_sku,
    pv.selling_price AS variant_price
  FROM order_items oi
  LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
  WHERE oi.order_id = $1 AND oi.line_type = 'one_time'
  ORDER BY oi.id ASC;
`;

export const GET_SUBSCRIPTION_BILLING_LINES = `
  SELECT 
    sbl.id,
    sbl.subscription_id,
    sbl.billing_period_start,
    sbl.billing_period_end,
    sbl.amount,
    sbl.is_prorated,
    sbl.invoice_id,
    sbl.credit_note_required,
    sbl.created_at,
    inv.invoice_number,
    inv.status AS invoice_status
  FROM subscription_billing_lines sbl
  LEFT JOIN invoices inv ON sbl.invoice_id = inv.id
  WHERE sbl.subscription_id = $1
  ORDER BY sbl.billing_period_start ASC;
`;

export const GET_ALL_SUBSCRIPTION_PLANS = `
  SELECT 
    sp.id,
    sp.product_id,
    sp.name,
    sp.billing_cycle,
    sp.price,
    sp.allow_proration,
    sp.allow_cancellation,
    sp.allow_partial_refund,
    sp.is_active,
    sp.created_at,
    p.name AS product_name,
    p.base_price AS product_base_price
  FROM subscription_plans sp
  JOIN products p ON sp.product_id = p.id
  WHERE sp.is_active = TRUE
  ORDER BY sp.name ASC;
`;

export const CREATE_SUBSCRIPTION_PLAN = `
  INSERT INTO subscription_plans (
    product_id,
    name,
    billing_cycle,
    price,
    allow_proration,
    allow_cancellation,
    allow_partial_refund,
    is_active
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
  RETURNING *;
`;

export const UPDATE_SUBSCRIPTION_CONFIG = `
  UPDATE subscriptions
  SET 
    subscription_plan_id = COALESCE($2, subscription_plan_id),
    billing_cycle = COALESCE($3, billing_cycle),
    unit_price = COALESCE($4, unit_price),
    quantity = COALESCE($5, quantity),
    status = COALESCE($6, status),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *;
`;

export const CANCEL_SUBSCRIPTION = `
  UPDATE subscriptions
  SET 
    status = 'cancelled',
    end_date = CURRENT_DATE,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *;
`;

export const CREATE_SUBSCRIPTION_BILLING_LINE = `
  INSERT INTO subscription_billing_lines (
    subscription_id,
    billing_period_start,
    billing_period_end,
    amount,
    is_prorated,
    credit_note_required
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

export const GET_SUBSCRIPTIONS_BY_STATUS = `
  SELECT 
    s.id,
    s.order_item_id,
    s.customer_id,
    s.subscription_plan_id,
    s.quantity,
    s.unit_price,
    s.billing_cycle,
    s.start_date,
    s.end_date,
    s.status,
    s.created_at,
    s.updated_at,
    c.company_name AS customer_name,
    c.email AS customer_email,
    sp.name AS plan_name,
    sp.price AS plan_price,
    sp.allow_proration,
    sp.allow_cancellation,
    sp.allow_partial_refund,
    COALESCE(
      (
        SELECT sbl.billing_period_end
        FROM subscription_billing_lines sbl
        WHERE sbl.subscription_id = s.id
          AND sbl.billing_period_end >= CURRENT_DATE
        ORDER BY sbl.billing_period_end ASC
        LIMIT 1
      ),
      s.end_date,
      s.start_date + INTERVAL '1 month'
    ) AS next_bill_date
  FROM subscriptions s
  JOIN customers c ON s.customer_id = c.id
  JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
  WHERE s.status = $1
  ORDER BY s.created_at DESC;
`;

export const GET_FIRST_PRODUCT_ID = `
  SELECT id FROM products LIMIT 1;
`;

export const GET_FIRST_PRODUCT_CATEGORY_ID = `
  SELECT id FROM product_categories LIMIT 1;
`;

export const INSERT_PRODUCT_CATEGORY = `
  INSERT INTO product_categories (name) VALUES ($1) RETURNING id;
`;

export const INSERT_PRODUCT_WITH_CATEGORY = `
  INSERT INTO products (name, category_id, base_price) VALUES ($1, $2, $3) RETURNING id;
`;

