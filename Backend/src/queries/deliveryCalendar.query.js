// ============================================================
// DEALFLOW360 - DELIVERY OPERATIONS CALENDAR QUERIES
// ============================================================

export const GET_DELIVERY_CALENDAR_EVENTS_ALL = `
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.status::TEXT AS order_status,
    o.created_at AS order_date,
    c.id AS customer_id,
    c.company_name AS customer_name,
    c.email AS customer_email,
    q.quotation_number,
    COALESCE(q.grand_total, 0) AS grand_total,
    COALESCE(
      (
        SELECT MAX(COALESCE(ws.lead_time_days, 2))
        FROM order_items oi
        LEFT JOIN warehouse_stock ws ON oi.product_variant_id = ws.product_variant_id
        WHERE oi.order_id = o.id
      ),
      2
    ) AS max_lead_time_days,
    (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'order_item_id', oi.id,
          'product_name', oi.product_name_snapshot,
          'sku', oi.sku_snapshot,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'line_total', oi.line_total,
          'lead_time_days', COALESCE((
            SELECT MIN(ws.lead_time_days)
            FROM warehouse_stock ws
            WHERE ws.product_variant_id = oi.product_variant_id
          ), 2)
        )
      )
      FROM order_items oi
      WHERE oi.order_id = o.id
    ) AS items,
    (
      SELECT STRING_AGG(DISTINCT w.name, ', ')
      FROM fulfillment_splits fs
      JOIN order_items oi ON fs.order_item_id = oi.id
      JOIN warehouses w ON fs.warehouse_id = w.id
      WHERE oi.order_id = o.id
    ) AS warehouses_display,
    COALESCE(
      (
        SELECT MAX(fs.estimated_shipment_date)
        FROM fulfillment_splits fs
        JOIN order_items oi ON fs.order_item_id = oi.id
        WHERE oi.order_id = o.id
      ),
      (o.created_at::DATE + (
        COALESCE(
          (
            SELECT MAX(COALESCE(ws.lead_time_days, 2))
            FROM order_items oi
            LEFT JOIN warehouse_stock ws ON oi.product_variant_id = ws.product_variant_id
            WHERE oi.order_id = o.id
          ),
          2
        ) || ' days'
      )::INTERVAL)::DATE
    ) AS scheduled_delivery_date
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN quotations q ON o.quotation_id = q.id
  ORDER BY o.created_at DESC;
`;

export const GET_DELIVERY_CALENDAR_EVENTS_BY_CUSTOMER_USER = `
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.status::TEXT AS order_status,
    o.created_at AS order_date,
    c.id AS customer_id,
    c.company_name AS customer_name,
    c.email AS customer_email,
    q.quotation_number,
    COALESCE(q.grand_total, 0) AS grand_total,
    COALESCE(
      (
        SELECT MAX(COALESCE(ws.lead_time_days, 2))
        FROM order_items oi
        LEFT JOIN warehouse_stock ws ON oi.product_variant_id = ws.product_variant_id
        WHERE oi.order_id = o.id
      ),
      2
    ) AS max_lead_time_days,
    (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'order_item_id', oi.id,
          'product_name', oi.product_name_snapshot,
          'sku', oi.sku_snapshot,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'line_total', oi.line_total,
          'lead_time_days', COALESCE((
            SELECT MIN(ws.lead_time_days)
            FROM warehouse_stock ws
            WHERE ws.product_variant_id = oi.product_variant_id
          ), 2)
        )
      )
      FROM order_items oi
      WHERE oi.order_id = o.id
    ) AS items,
    (
      SELECT STRING_AGG(DISTINCT w.name, ', ')
      FROM fulfillment_splits fs
      JOIN order_items oi ON fs.order_item_id = oi.id
      JOIN warehouses w ON fs.warehouse_id = w.id
      WHERE oi.order_id = o.id
    ) AS warehouses_display,
    COALESCE(
      (
        SELECT MAX(fs.estimated_shipment_date)
        FROM fulfillment_splits fs
        JOIN order_items oi ON fs.order_item_id = oi.id
        WHERE oi.order_id = o.id
      ),
      (o.created_at::DATE + (
        COALESCE(
          (
            SELECT MAX(COALESCE(ws.lead_time_days, 2))
            FROM order_items oi
            LEFT JOIN warehouse_stock ws ON oi.product_variant_id = ws.product_variant_id
            WHERE oi.order_id = o.id
          ),
          2
        ) || ' days'
      )::INTERVAL)::DATE
    ) AS scheduled_delivery_date
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN quotations q ON o.quotation_id = q.id
  WHERE c.user_id = $1 OR c.email = $2
  ORDER BY o.created_at DESC;
`;

export const GET_CUSTOMER_INFO_BY_USER_ID = `
  SELECT id, company_name, email FROM customers WHERE user_id = $1 OR email = $2 LIMIT 1;
`;
