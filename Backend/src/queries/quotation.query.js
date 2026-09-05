// ============================================================
// DEALFLOW360 - QUOTATION QUERIES
// ============================================================

export const GET_QUOTATIONS_LIST = `
  SELECT 
    q.id,
    q.quotation_number,
    q.customer_id,
    c.company_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    q.sales_rep_id,
    u.name AS sales_rep_name,
    u.email AS sales_rep_email,
    q.tier_id,
    ct.name AS tier_name,
    ct.max_discount_percentage AS tier_max_discount,
    q.price_list_id,
    q.status,
    q.blended_risk_score,
    q.risk_level,
    q.subtotal,
    q.discount_total,
    q.tax_total,
    q.grand_total,
    q.valid_until,
    q.created_at,
    q.updated_at,
    (
      SELECT COUNT(*)::INT 
      FROM quotation_items qi 
      WHERE qi.quotation_id = q.id
    ) AS item_count,
    (
      SELECT ar.status 
      FROM approval_requests ar 
      WHERE ar.quotation_id = q.id 
      ORDER BY ar.requested_at DESC 
      LIMIT 1
    ) AS approval_status,
    (
      SELECT ar.id 
      FROM approval_requests ar 
      WHERE ar.quotation_id = q.id 
      ORDER BY ar.requested_at DESC 
      LIMIT 1
    ) AS latest_approval_request_id,
    (
      SELECT qn.status 
      FROM quotation_negotiations qn 
      WHERE qn.quotation_id = q.id 
      ORDER BY qn.created_at DESC 
      LIMIT 1
    ) AS negotiation_status,
    (
      SELECT qn.counter_discount_percentage 
      FROM quotation_negotiations qn 
      WHERE qn.quotation_id = q.id 
      ORDER BY qn.created_at DESC 
      LIMIT 1
    ) AS counter_discount_percentage
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  JOIN users u ON q.sales_rep_id = u.id
  LEFT JOIN customer_tiers ct ON q.tier_id = ct.id
  WHERE ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    AND ($2::TEXT IS NULL OR q.status = $2::quotation_status_enum)
    AND (
      $3::TEXT IS NULL 
      OR c.company_name ILIKE '%' || $3 || '%' 
      OR q.quotation_number ILIKE '%' || $3 || '%'
      OR u.name ILIKE '%' || $3 || '%'
    )
    AND ($4::BIGINT IS NULL OR q.customer_id = $4)
  ORDER BY q.created_at DESC
`;

export const GET_QUOTATIONS_KANBAN_SUMMARY = `
  SELECT 
    q.status,
    COUNT(*)::INT AS count,
    COALESCE(SUM(q.grand_total), 0)::NUMERIC(15,2) AS total_amount
  FROM quotations q
  WHERE ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    AND ($2::BIGINT IS NULL OR q.customer_id = $2)
  GROUP BY q.status
`;

export const GET_QUOTATION_BY_ID = `
  SELECT 
    q.id,
    q.quotation_number,
    q.customer_id,
    c.company_name,
    c.gst_number,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.billing_address,
    c.shipping_address,
    q.sales_rep_id,
    u.name AS sales_rep_name,
    u.email AS sales_rep_email,
    q.tier_id,
    ct.name AS tier_name,
    ct.max_discount_percentage AS tier_max_discount,
    q.price_list_id,
    pl.name AS price_list_name,
    q.status,
    q.blended_risk_score,
    q.risk_level,
    q.subtotal,
    q.discount_total,
    q.tax_total,
    q.grand_total,
    q.valid_until,
    q.created_at,
    q.updated_at
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  JOIN users u ON q.sales_rep_id = u.id
  LEFT JOIN customer_tiers ct ON q.tier_id = ct.id
  LEFT JOIN price_lists pl ON q.price_list_id = pl.id
  WHERE q.id = $1
`;

export const GET_QUOTATION_ITEMS = `
  SELECT 
    qi.id,
    qi.quotation_id,
    qi.product_variant_id,
    qi.line_number,
    qi.product_name_snapshot,
    qi.sku_snapshot,
    qi.quantity,
    qi.list_price,
    qi.unit_price,
    qi.discount_percentage,
    qi.discount_amount,
    qi.tax_percentage,
    qi.tax_amount,
    qi.allowed_discount_percentage,
    qi.excess_discount_percentage,
    qi.line_total,
    qi.is_upsell,
    pv.product_id,
    p.category_id,
    pc.name AS category_name,
    COALESCE(cdc.max_discount_percentage, 100)::NUMERIC(5,2) AS category_max_discount
  FROM quotation_items qi
  JOIN product_variants pv ON qi.product_variant_id = pv.id
  JOIN products p ON pv.product_id = p.id
  JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN category_discount_ceilings cdc ON pc.id = cdc.category_id
  WHERE qi.quotation_id = $1
  ORDER BY qi.line_number ASC
`;

export const CREATE_QUOTATION = `
  INSERT INTO quotations (
    quotation_number,
    customer_id,
    sales_rep_id,
    tier_id,
    price_list_id,
    status,
    blended_risk_score,
    risk_level,
    subtotal,
    discount_total,
    tax_total,
    grand_total,
    valid_until
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
  )
  RETURNING *
`;

export const UPDATE_QUOTATION = `
  UPDATE quotations SET
    customer_id = $2,
    tier_id = $3,
    price_list_id = $4,
    status = $5,
    blended_risk_score = $6,
    risk_level = $7,
    subtotal = $8,
    discount_total = $9,
    tax_total = $10,
    grand_total = $11,
    valid_until = $12,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *
`;

export const DELETE_QUOTATION_ITEMS = `
  DELETE FROM quotation_items WHERE quotation_id = $1
`;

export const INSERT_QUOTATION_ITEM = `
  INSERT INTO quotation_items (
    quotation_id,
    product_variant_id,
    line_number,
    product_name_snapshot,
    sku_snapshot,
    quantity,
    list_price,
    unit_price,
    discount_percentage,
    discount_amount,
    tax_percentage,
    tax_amount,
    allowed_discount_percentage,
    excess_discount_percentage,
    line_total,
    is_upsell
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
  )
  RETURNING *
`;

export const CREATE_APPROVAL_REQUEST = `
  INSERT INTO approval_requests (
    quotation_id,
    status,
    requested_by_user_id
  ) VALUES (
    $1, 'pending', $2
  )
  RETURNING *
`;

export const CREATE_APPROVAL_STEP = `
  INSERT INTO approval_steps (
    approval_request_id,
    step_number,
    approver_role,
    status
  ) VALUES (
    $1, $2, $3, 'pending'
  )
`;

export const INSERT_QUOTATION_AUDIT_LOG = `
  INSERT INTO quotation_audit_logs (
    quotation_id,
    user_id,
    action,
    reason,
    changes
  ) VALUES (
    $1, $2, $3, $4, $5
  )
`;
