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
  ORDER BY q.created_at DESC
`;

export const GET_QUOTATIONS_KANBAN_SUMMARY = `
  SELECT 
    q.status,
    COUNT(*)::INT AS count,
    COALESCE(SUM(q.grand_total), 0)::NUMERIC(15,2) AS total_amount
  FROM quotations q
  WHERE ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
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
  WHERE q.id = $1
`;
