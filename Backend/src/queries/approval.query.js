// ============================================================
// DEALFLOW360 - APPROVALS WORKFLOW QUERIES
// ============================================================

export const GET_APPROVALS_SUMMARY_COUNTS = `
  SELECT 
    COUNT(*) FILTER (WHERE q.status = 'pending_approval')::INT AS pending_count,
    COUNT(*) FILTER (WHERE q.status = 'draft' AND EXISTS (
      SELECT 1 FROM quotation_audit_logs qal WHERE qal.quotation_id = q.id AND qal.action = 'returned'
    ))::INT AS returned_count,
    COUNT(*) FILTER (WHERE q.status IN ('approved', 'confirmed', 'sent'))::INT AS approved_count,
    COUNT(*)::INT AS total_count
  FROM quotations q;
`;

export const GET_ALL_APPROVALS_LIST = `
  SELECT 
    q.id AS quotation_id,
    q.quotation_number,
    c.company_name AS customer_name,
    c.id AS customer_id,
    COALESCE(ct.name, 'Standard') AS customer_tier_name,
    q.blended_risk_score,
    UPPER(q.risk_level::TEXT) AS risk_level,
    q.status::TEXT AS status,
    CASE 
      WHEN q.status = 'pending_approval' THEN 
        COALESCE(
          (SELECT 
             CASE 
               WHEN ast.approver_role = 'sales_manager' THEN 'Sales Manager'
               WHEN ast.approver_role = 'finance' THEN 'Finance'
               WHEN ast.approver_role = 'operations' THEN 'Operations'
               WHEN ast.approver_role = 'admin' THEN 'Admin'
               ELSE INITCAP(REPLACE(ast.approver_role::TEXT, '_', ' '))
             END
           FROM approval_steps ast 
           JOIN approval_requests ar ON ast.approval_request_id = ar.id 
           WHERE ar.quotation_id = q.id AND ast.status = 'pending' 
           ORDER BY ast.step_number ASC LIMIT 1),
          'Sales Manager'
        )
      WHEN q.status = 'approved' OR q.status = 'confirmed' THEN 'Auto-Approved'
      WHEN q.status = 'rejected' THEN 'Rejected'
      WHEN q.status = 'draft' AND EXISTS (
        SELECT 1 FROM quotation_audit_logs qal WHERE qal.quotation_id = q.id AND qal.action = 'returned'
      ) THEN 'Returned for Revision'
      ELSE 'Draft'
    END AS stage,
    COALESCE(
      (SELECT u.name FROM users u 
       JOIN approval_steps ast ON ast.approver_user_id = u.id 
       JOIN approval_requests ar ON ast.approval_request_id = ar.id 
       WHERE ar.quotation_id = q.id AND ast.status = 'pending' 
       LIMIT 1),
      (SELECT u_sales.name FROM users u_sales WHERE u_sales.id = q.sales_rep_id),
      CASE 
        WHEN q.status IN ('approved', 'confirmed') THEN '-'
        ELSE 'M. Shah'
      END
    ) AS assigned_to,
    q.grand_total,
    q.created_at,
    q.updated_at
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  LEFT JOIN customer_tiers ct ON q.tier_id = ct.id
  WHERE q.status IN ('pending_approval', 'approved', 'confirmed', 'rejected') 
     OR (q.status = 'draft' AND EXISTS (
        SELECT 1 FROM quotation_audit_logs qal WHERE qal.quotation_id = q.id
     ))
     OR q.blended_risk_score > 0
  ORDER BY q.created_at DESC;
`;

export const GET_APPROVAL_DETAIL_HEADER = `
  SELECT 
    q.id AS quotation_id,
    q.quotation_number,
    c.company_name AS customer_name,
    c.id AS customer_id,
    COALESCE(ct.name, 'Standard') AS customer_tier_name,
    COALESCE(ct.max_discount_percentage, 15)::NUMERIC(5,2) AS tier_max_discount,
    q.blended_risk_score,
    UPPER(q.risk_level::TEXT) AS risk_level,
    q.status::TEXT AS status,
    q.subtotal,
    q.discount_total,
    q.tax_total,
    q.grand_total,
    q.created_at,
    q.updated_at,
    u.name AS created_by_name
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  LEFT JOIN customer_tiers ct ON q.tier_id = ct.id
  LEFT JOIN users u ON q.sales_rep_id = u.id
  WHERE q.id = $1;
`;

export const GET_APPROVAL_FLAGGED_LINES = `
  SELECT 
    qi.id AS line_id,
    qi.product_name_snapshot AS product_name,
    qi.sku_snapshot AS sku,
    COALESCE(pc.name, 'General') AS category_name,
    CONCAT(qi.product_name_snapshot, ' (', COALESCE(pc.name, 'General'), ')') AS line_display,
    qi.quantity,
    qi.unit_price,
    qi.list_price,
    qi.discount_percentage AS discount_given,
    qi.allowed_discount_percentage AS limit_allowed,
    COALESCE(qi.excess_discount_percentage, 0) AS excess_discount,
    CASE 
      WHEN COALESCE(qi.excess_discount_percentage, 0) > 0 
      THEN CONCAT(ROUND(qi.excess_discount_percentage::numeric, 0), ' pt - OVER')
      ELSE '0 pt - OK'
    END AS over_by_display,
    (COALESCE(qi.excess_discount_percentage, 0) > 0) AS is_over_limit,
    qi.line_total
  FROM quotation_items qi
  LEFT JOIN product_variants pv ON qi.product_variant_id = pv.id
  LEFT JOIN products p ON pv.product_id = p.id
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE qi.quotation_id = $1
  ORDER BY qi.line_number ASC;
`;

export const GET_APPROVAL_AUDIT_LOGS = `
  SELECT 
    qal.id,
    qal.quotation_id,
    COALESCE(u.name, 'System') AS user_name,
    COALESCE(u.role::TEXT, 'sales_rep') AS user_role,
    INITCAP(qal.action::TEXT) AS action,
    qal.reason AS note,
    qal.created_at,
    TO_CHAR(qal.created_at, 'Mon DD') AS formatted_date
  FROM quotation_audit_logs qal
  LEFT JOIN users u ON qal.user_id = u.id
  WHERE qal.quotation_id = $1
  ORDER BY qal.created_at ASC;
`;

export const GET_APPROVAL_REQUEST_STEPS = `
  SELECT 
    ar.id AS request_id,
    ar.status::TEXT AS request_status,
    ar.requested_at,
    ast.id AS step_id,
    ast.step_number,
    ast.approver_role::TEXT AS approver_role,
    ast.status::TEXT AS step_status,
    ast.comments,
    ast.acted_at AS decided_at,
    u.name AS approver_name
  FROM approval_requests ar
  LEFT JOIN approval_steps ast ON ar.id = ast.approval_request_id
  LEFT JOIN users u ON ast.approver_user_id = u.id
  WHERE ar.quotation_id = $1
  ORDER BY ast.step_number ASC;
`;

export const GET_LATEST_APPROVAL_REQUEST_FOR_QUOTATION = `
  SELECT id FROM approval_requests 
  WHERE quotation_id = $1 
  ORDER BY requested_at DESC 
  LIMIT 1;
`;

export const UPDATE_APPROVAL_REQUEST_STATUS = `
  UPDATE approval_requests 
  SET status = $1::approval_status_enum, completed_at = NOW() 
  WHERE id = $2;
`;

export const UPDATE_PENDING_APPROVAL_STEP = `
  UPDATE approval_steps 
  SET status = $1::approval_status_enum, comments = $2, acted_at = NOW(), approver_user_id = $3
  WHERE approval_request_id = $4 AND status = 'pending';
`;

export const INSERT_QUOTATION_AUDIT_LOG = `
  INSERT INTO quotation_audit_logs (
    quotation_id, user_id, action, reason, created_at
  ) VALUES ($1, $2, $3::approval_action_enum, $4, NOW())
  RETURNING *;
`;

export const UPDATE_QUOTATION_STATUS = `
  UPDATE quotations 
  SET status = $1::quotation_status_enum, updated_at = NOW() 
  WHERE id = $2
  RETURNING *;
`;


