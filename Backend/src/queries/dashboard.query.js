// ============================================================
// DEALFLOW360 - SALES DASHBOARD QUERIES
// ============================================================

export const GET_DASHBOARD_STATS = `
  SELECT 
    (
      SELECT COUNT(*)::INT 
      FROM approval_requests ar
      JOIN quotations q ON ar.quotation_id = q.id
      WHERE ar.status = 'pending'
      AND ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    ) AS pending_approvals_count,

    (
      SELECT COUNT(*)::INT 
      FROM quotations q
      WHERE q.status IN ('draft', 'pending_approval', 'approved', 'negotiating')
      AND ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    ) AS open_quotations_count,

    (
      SELECT COUNT(*)::INT 
      FROM deal_health_flags dhf
      JOIN quotations q ON dhf.quotation_id = q.id
      WHERE dhf.action = 'open'
      AND ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    ) AS at_risk_deals_count,

    (
      SELECT COUNT(*)::INT 
      FROM orders o
      JOIN quotations q ON o.quotation_id = q.id
      WHERE o.status = 'confirmed'
      AND ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    ) AS confirmed_orders_count,

    (
      SELECT COALESCE(SUM(q.grand_total), 0)::NUMERIC(15,2)
      FROM quotations q
      WHERE q.status IN ('draft', 'pending_approval', 'approved', 'negotiating')
      AND ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
    ) AS total_pipeline_value
`;

export const GET_RECENT_ACTIVITY_LOGS = `
  SELECT 
    qal.id,
    qal.quotation_id,
    qal.action,
    qal.reason,
    qal.changes,
    qal.created_at,
    q.quotation_number,
    q.grand_total,
    q.status AS quotation_status,
    c.id AS customer_id,
    c.company_name,
    u.id AS user_id,
    u.name AS user_name,
    u.role AS user_role
  FROM quotation_audit_logs qal
  JOIN quotations q ON qal.quotation_id = q.id
  JOIN customers c ON q.customer_id = c.id
  JOIN users u ON qal.user_id = u.id
  WHERE ($1::BIGINT IS NULL OR q.sales_rep_id = $1)
  ORDER BY qal.created_at DESC
  LIMIT $2
`;
