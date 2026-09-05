/**
 * Summary KPI Metrics for Executive Reporting
 * Computes Quotes created, Pipeline Value, Confirmed Orders, Win Rate %, and Average Discount %
 */
export const GET_REPORT_SUMMARY_KPIS = `
  WITH date_filtered_quotes AS (
    SELECT 
      q.id,
      q.status,
      q.grand_total,
      q.created_at,
      q.sales_rep_id
    FROM quotations q
    WHERE 
      ($1::TEXT IS NULL OR $1 = 'all' OR 
        ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
        ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
        ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
        ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
        ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE))
      )
      AND ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
      AND ($3::TEXT IS NULL OR $3 = 'all' OR q.status::TEXT = $3)
  ),
  prev_date_filtered_quotes AS (
    SELECT 
      q.id,
      q.grand_total
    FROM quotations q
    WHERE 
      ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '14 days' AND q.created_at < CURRENT_DATE - INTERVAL '7 days') OR
      ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '60 days' AND q.created_at < CURRENT_DATE - INTERVAL '30 days') OR
      ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND q.created_at < DATE_TRUNC('month', CURRENT_DATE)) OR
      ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE) - INTERVAL '3 months' AND q.created_at < DATE_TRUNC('quarter', CURRENT_DATE)) OR
      ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year' AND q.created_at < DATE_TRUNC('year', CURRENT_DATE))
  ),
  discount_metrics AS (
    SELECT 
      COALESCE(AVG(qi.discount_percentage), 0)::NUMERIC(5,2) AS avg_discount_pct
    FROM quotation_items qi
    JOIN date_filtered_quotes dfq ON qi.quotation_id = dfq.id
    WHERE qi.discount_percentage > 0
  )
  SELECT 
    COUNT(dfq.id)::INT AS quotes_created_count,
    COALESCE(SUM(dfq.grand_total), 0)::NUMERIC(15,2) AS total_pipeline_value,
    COALESCE(SUM(CASE WHEN dfq.status IN ('approved', 'confirmed') THEN dfq.grand_total ELSE 0 END), 0)::NUMERIC(15,2) AS confirmed_revenue_value,
    COUNT(CASE WHEN dfq.status IN ('approved', 'confirmed') THEN 1 END)::INT AS confirmed_deals_count,
    ROUND(
      CASE 
        WHEN COUNT(dfq.id) > 0 
        THEN (COUNT(CASE WHEN dfq.status IN ('approved', 'confirmed') THEN 1 END)::NUMERIC / COUNT(dfq.id)::NUMERIC) * 100 
        ELSE 0 
      END, 1
    )::NUMERIC(5,1) AS win_rate_percentage,
    (SELECT avg_discount_pct FROM discount_metrics) AS avg_discount_percentage,
    (SELECT COUNT(id)::INT FROM prev_date_filtered_quotes) AS prev_period_quotes_count,
    (SELECT COALESCE(SUM(grand_total), 0)::NUMERIC(15,2) FROM prev_date_filtered_quotes) AS prev_period_pipeline_value
  FROM date_filtered_quotes dfq;
`;

/**
 * Approval Turnaround & Bottlenecks Analysis
 * Computes average hours taken to approve, sales manager turnaround, finance turnaround, and escalation rate
 */
export const GET_APPROVAL_BOTTLENECK_METRICS = `
  WITH relevant_requests AS (
    SELECT 
      ar.id,
      ar.quotation_id,
      ar.status,
      ar.requested_at,
      ar.completed_at,
      EXTRACT(EPOCH FROM (COALESCE(ar.completed_at, CURRENT_TIMESTAMP) - ar.requested_at)) / 3600.0 AS duration_hours
    FROM approval_requests ar
    JOIN quotations q ON ar.quotation_id = q.id
    WHERE 
      ($1::TEXT IS NULL OR $1 = 'all' OR 
        ($1 = '7d' AND ar.requested_at >= CURRENT_DATE - INTERVAL '7 days') OR
        ($1 = '30d' AND ar.requested_at >= CURRENT_DATE - INTERVAL '30 days') OR
        ($1 = 'this_month' AND ar.requested_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
        ($1 = 'quarter' AND ar.requested_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
        ($1 = 'year' AND ar.requested_at >= DATE_TRUNC('year', CURRENT_DATE))
      )
      AND ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
  ),
  step_metrics AS (
    SELECT 
      ast.approver_role,
      AVG(EXTRACT(EPOCH FROM (COALESCE(ast.acted_at, rr.completed_at, CURRENT_TIMESTAMP) - rr.requested_at)) / 3600.0) AS avg_step_hours
    FROM approval_steps ast
    JOIN relevant_requests rr ON ast.approval_request_id = rr.id
    WHERE ast.acted_at IS NOT NULL
    GROUP BY ast.approver_role
  )
  SELECT 
    COUNT(rr.id)::INT AS total_approvals_requested,
    COUNT(CASE WHEN rr.status = 'approved' THEN 1 END)::INT AS total_approved_count,
    COUNT(CASE WHEN rr.status = 'rejected' THEN 1 END)::INT AS total_rejected_count,
    COUNT(CASE WHEN rr.status = 'returned' THEN 1 END)::INT AS total_returned_count,
    COALESCE(ROUND(AVG(rr.duration_hours)::NUMERIC, 1), 0)::NUMERIC(6,1) AS avg_approval_hours,
    COALESCE(ROUND((SELECT avg_step_hours FROM step_metrics WHERE approver_role = 'sales_manager')::NUMERIC, 1), 0)::NUMERIC(6,1) AS manager_avg_hours,
    COALESCE(ROUND((SELECT avg_step_hours FROM step_metrics WHERE approver_role = 'finance')::NUMERIC, 1), 0)::NUMERIC(6,1) AS finance_avg_hours,
    ROUND(
      CASE 
        WHEN COUNT(rr.id) > 0 
        THEN (COUNT(CASE WHEN rr.status = 'approved' THEN 1 END)::NUMERIC / COUNT(rr.id)::NUMERIC) * 100 
        ELSE 0 
      END, 1
    )::NUMERIC(5,1) AS approval_rate_pct
  FROM relevant_requests rr;
`;

/**
 * Top Products and Upsell Attach Performance
 */
export const GET_TOP_UPSELL_AND_PRODUCT_METRICS = `
  WITH filtered_quotations AS (
    SELECT q.id, q.status, q.created_at, q.sales_rep_id
    FROM quotations q
    WHERE 
      ($1::TEXT IS NULL OR $1 = 'all' OR 
        ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
        ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
        ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
        ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
        ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE))
      )
      AND ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
      AND ($3::TEXT IS NULL OR $3 = 'all' OR q.status::TEXT = $3)
  ),
  product_sales AS (
    SELECT 
      qi.product_name_snapshot AS product_name,
      qi.sku_snapshot AS sku,
      COALESCE(pc.name, 'General') AS category_name,
      COUNT(qi.id)::INT AS units_sold,
      SUM(qi.line_total)::NUMERIC(15,2) AS total_revenue,
      SUM(CASE WHEN qi.is_upsell = TRUE THEN 1 ELSE 0 END)::INT AS upsell_count,
      SUM(CASE WHEN qi.is_upsell = TRUE THEN qi.line_total ELSE 0 END)::NUMERIC(15,2) AS upsell_revenue
    FROM quotation_items qi
    JOIN filtered_quotations fq ON qi.quotation_id = fq.id
    LEFT JOIN product_variants pv ON qi.product_variant_id = pv.id
    LEFT JOIN products p ON pv.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE ($4::BIGINT IS NULL OR p.category_id = $4 OR p.id = $4)
    GROUP BY qi.product_name_snapshot, qi.sku_snapshot, pc.name
  )
  SELECT 
    product_name,
    sku,
    category_name,
    units_sold,
    total_revenue,
    upsell_count,
    upsell_revenue,
    ROUND(
      CASE 
        WHEN units_sold > 0 
        THEN (upsell_count::NUMERIC / units_sold::NUMERIC) * 100 
        ELSE 0 
      END, 1
    )::NUMERIC(5,1) AS upsell_attach_rate_pct
  FROM product_sales
  ORDER BY total_revenue DESC
  LIMIT 8;
`;

/**
 * Revenue Mix: One-Time Hardware/Products vs Recurring Subscriptions
 */
export const GET_REVENUE_MIX_DISTRIBUTION = `
  WITH filtered_quotations AS (
    SELECT q.id, q.status, q.created_at, q.sales_rep_id
    FROM quotations q
    WHERE 
      ($1::TEXT IS NULL OR $1 = 'all' OR 
        ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
        ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
        ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
        ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
        ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE))
      )
      AND ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
  )
  SELECT 
    COALESCE(SUM(CASE 
      WHEN qi.product_name_snapshot ILIKE '%plan%' 
        OR qi.product_name_snapshot ILIKE '%sla%' 
        OR qi.product_name_snapshot ILIKE '%subscription%' 
        OR qi.product_name_snapshot ILIKE '%amc%' 
        OR qi.product_name_snapshot ILIKE '%care%' 
      THEN qi.line_total 
      ELSE 0 
    END), 0)::NUMERIC(15,2) AS recurring_revenue,
    COALESCE(SUM(CASE 
      WHEN NOT (
        qi.product_name_snapshot ILIKE '%plan%' 
        OR qi.product_name_snapshot ILIKE '%sla%' 
        OR qi.product_name_snapshot ILIKE '%subscription%' 
        OR qi.product_name_snapshot ILIKE '%amc%' 
        OR qi.product_name_snapshot ILIKE '%care%'
      ) 
      THEN qi.line_total 
      ELSE 0 
    END), 0)::NUMERIC(15,2) AS onetime_revenue
  FROM quotation_items qi
  JOIN filtered_quotations fq ON qi.quotation_id = fq.id;
`;

/**
 * Sales & Pipeline Revenue Time-Series Trend
 */
export const GET_SALES_REVENUE_TRENDS = `
  WITH date_series AS (
    SELECT generate_series(
      CASE 
        WHEN $1 = '7d' THEN CURRENT_DATE - INTERVAL '6 days'
        WHEN $1 = '30d' THEN CURRENT_DATE - INTERVAL '29 days'
        WHEN $1 = 'quarter' THEN DATE_TRUNC('quarter', CURRENT_DATE)
        WHEN $1 = 'year' THEN DATE_TRUNC('year', CURRENT_DATE)
        ELSE DATE_TRUNC('month', CURRENT_DATE)
      END,
      CURRENT_DATE,
      CASE 
        WHEN $1 IN ('7d', '30d', 'this_month') THEN INTERVAL '1 day'
        WHEN $1 = 'quarter' THEN INTERVAL '1 week'
        ELSE INTERVAL '1 month'
      END
    )::DATE AS period_date
  ),
  grouped_quotes AS (
    SELECT 
      DATE_TRUNC(
        CASE 
          WHEN $1 IN ('7d', '30d', 'this_month') THEN 'day'
          WHEN $1 = 'quarter' THEN 'week'
          ELSE 'month'
        END, 
        q.created_at
      )::DATE AS quote_bucket,
      COALESCE(SUM(q.grand_total), 0)::NUMERIC(15,2) AS pipeline_value,
      COALESCE(SUM(CASE WHEN q.status IN ('approved', 'confirmed') THEN q.grand_total ELSE 0 END), 0)::NUMERIC(15,2) AS confirmed_value,
      COUNT(q.id)::INT AS quotes_count
    FROM quotations q
    WHERE ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
    GROUP BY quote_bucket
  )
  SELECT 
    TO_CHAR(ds.period_date, 
      CASE 
        WHEN $1 IN ('7d', '30d', 'this_month') THEN 'Mon DD'
        WHEN $1 = 'quarter' THEN 'Mon DD'
        ELSE 'Mon YYYY'
      END
    ) AS label,
    ds.period_date,
    COALESCE(gq.pipeline_value, 0)::NUMERIC(15,2) AS pipeline_value,
    COALESCE(gq.confirmed_value, 0)::NUMERIC(15,2) AS confirmed_value,
    COALESCE(gq.quotes_count, 0)::INT AS quotes_count
  FROM date_series ds
  LEFT JOIN grouped_quotes gq ON ds.period_date = gq.quote_bucket
  ORDER BY ds.period_date ASC;
`;

/**
 * Sales Rep Performance Leaderboard
 */
export const GET_SALES_REP_LEADERBOARD = `
  WITH rep_quotes AS (
    SELECT 
      q.sales_rep_id,
      COUNT(q.id)::INT AS total_quotes,
      COUNT(CASE WHEN q.status IN ('approved', 'confirmed') THEN 1 END)::INT AS deals_closed,
      COALESCE(SUM(CASE WHEN q.status IN ('approved', 'confirmed') THEN q.grand_total ELSE 0 END), 0)::NUMERIC(15,2) AS total_revenue,
      COALESCE(AVG(qi.discount_percentage), 0)::NUMERIC(5,2) AS avg_discount_pct
    FROM quotations q
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    WHERE 
      ($1::TEXT IS NULL OR $1 = 'all' OR 
        ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
        ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
        ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
        ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
        ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE))
      )
    GROUP BY q.sales_rep_id
  )
  SELECT 
    u.id AS rep_id,
    u.name AS rep_name,
    u.email AS rep_email,
    COALESCE(rq.total_quotes, 0) AS total_quotes,
    COALESCE(rq.deals_closed, 0) AS deals_closed,
    COALESCE(rq.total_revenue, 0)::NUMERIC(15,2) AS total_revenue,
    COALESCE(rq.avg_discount_pct, 0)::NUMERIC(5,2) AS avg_discount_pct,
    ROUND(
      CASE 
        WHEN COALESCE(rq.total_quotes, 0) > 0 
        THEN (COALESCE(rq.deals_closed, 0)::NUMERIC / rq.total_quotes::NUMERIC) * 100 
        ELSE 0 
      END, 1
    )::NUMERIC(5,1) AS win_rate_pct
  FROM users u
  LEFT JOIN rep_quotes rq ON u.id = rq.sales_rep_id
  WHERE u.role IN ('sales_rep', 'sales_manager', 'admin')
  ORDER BY total_revenue DESC, deals_closed DESC
  LIMIT 10;
`;

/**
 * Filter Metadata (Sales Reps, Categories, Approval Statuses)
 */
export const GET_REPORT_FILTER_METADATA = `
  SELECT 
    (
      SELECT json_agg(json_build_object('id', id, 'name', name, 'email', email))
      FROM users
      WHERE role IN ('sales_rep', 'sales_manager', 'admin') AND is_active = TRUE
    ) AS sales_reps,
    (
      SELECT json_agg(json_build_object('id', id, 'name', name))
      FROM product_categories
    ) AS categories;
`;

/**
 * Raw Export Data for CSV/Excel Generation
 */
export const GET_REPORT_RAW_EXPORT_DATA = `
  SELECT 
    q.quotation_number,
    c.company_name AS customer_name,
    u.name AS sales_rep_name,
    q.status,
    q.subtotal,
    q.discount_total,
    q.tax_total,
    q.grand_total,
    q.blended_risk_score,
    q.risk_level,
    q.created_at::DATE AS date_created,
    q.updated_at::DATE AS last_updated
  FROM quotations q
  JOIN customers c ON q.customer_id = c.id
  LEFT JOIN users u ON q.sales_rep_id = u.id
  WHERE 
    ($1::TEXT IS NULL OR $1 = 'all' OR 
      ($1 = '7d' AND q.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
      ($1 = '30d' AND q.created_at >= CURRENT_DATE - INTERVAL '30 days') OR
      ($1 = 'this_month' AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)) OR
      ($1 = 'quarter' AND q.created_at >= DATE_TRUNC('quarter', CURRENT_DATE)) OR
      ($1 = 'year' AND q.created_at >= DATE_TRUNC('year', CURRENT_DATE))
    )
    AND ($2::BIGINT IS NULL OR q.sales_rep_id = $2)
    AND ($3::TEXT IS NULL OR $3 = 'all' OR q.status::TEXT = $3)
  ORDER BY q.created_at DESC;
`;
