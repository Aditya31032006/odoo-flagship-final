// ============================================================
// DEALFLOW360 - FULFILLMENT WORKFLOW QUERIES
// ============================================================

export const GET_WAREHOUSE_STOCK_LIST = `
  SELECT 
    ws.id AS stock_id,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    w.code AS warehouse_code,
    pv.id AS product_variant_id,
    p.name AS product_name,
    pv.sku,
    ws.quantity_on_hand AS in_stock,
    ws.quantity_reserved AS reserved,
    (ws.quantity_on_hand - ws.quantity_reserved) AS available,
    ws.lead_time_days
  FROM warehouse_stock ws
  JOIN warehouses w ON ws.warehouse_id = w.id
  JOIN product_variants pv ON ws.product_variant_id = pv.id
  JOIN products p ON pv.product_id = p.id
  ORDER BY w.name ASC, p.name ASC;
`;

export const GET_ORDERS_AWAITING_FULFILLMENT = `
  SELECT 
    o.id AS order_id,
    o.order_number,
    q.quotation_number,
    c.company_name AS customer_name,
    c.id AS customer_id,
    o.status::TEXT AS status,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM fulfillment_splits fs 
        JOIN order_items oi ON fs.order_item_id = oi.id 
        WHERE oi.order_id = o.id
      ) THEN 'Split Pending'
      ELSE 'Unassigned'
    END AS status_display,
    COALESCE(
      (SELECT STRING_AGG(DISTINCT w.name, ' + ' ORDER BY w.name)
       FROM fulfillment_splits fs
       JOIN order_items oi ON fs.order_item_id = oi.id
       JOIN warehouses w ON fs.warehouse_id = w.id
       WHERE oi.order_id = o.id),
      'Main Warehouse'
    ) AS warehouses_display,
    (
      SELECT oi.quantity FROM order_items oi WHERE oi.order_id = o.id LIMIT 1
    ) AS total_quantity,
    (
      SELECT oi.product_name_snapshot FROM order_items oi WHERE oi.order_id = o.id LIMIT 1
    ) AS product_name,
    (
      SELECT oi.product_variant_id FROM order_items oi WHERE oi.order_id = o.id LIMIT 1
    ) AS product_variant_id,
    o.created_at,
    o.updated_at
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN quotations q ON o.quotation_id = q.id
  WHERE (q.status = 'confirmed' OR (q.status IS NULL AND o.status = 'confirmed'))
    AND (q.status::TEXT NOT IN ('shipment', 'payment', 'rejected', 'cancelled'))
    AND (o.status::TEXT NOT IN ('processing', 'fulfilled', 'cancelled'))
  ORDER BY o.created_at DESC;
`;

export const GET_FULFILLMENT_DETAIL_HEADER = `
  SELECT 
    o.id AS order_id,
    o.order_number,
    o.quotation_id,
    COALESCE(q.quotation_number, o.order_number) AS quotation_number,
    c.company_name AS customer_name,
    c.id AS customer_id,
    COALESCE(q.grand_total, 0) AS grand_total,
    o.status::TEXT AS status,
    o.created_at,
    o.updated_at
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN quotations q ON o.quotation_id = q.id
  WHERE o.id::TEXT = $1 OR o.order_number = $1 OR q.quotation_number = $1;
`;

export const GET_ORDER_ITEMS_BY_ORDER_ID = `
  SELECT 
    oi.id AS order_item_id,
    oi.order_id,
    oi.product_variant_id,
    oi.product_name_snapshot AS product_name,
    oi.sku_snapshot AS sku,
    oi.quantity,
    oi.unit_price,
    oi.line_total
  FROM order_items oi
  WHERE oi.order_id = $1
  ORDER BY oi.id ASC;
`;

export const GET_FULFILLMENT_SPLITS_BY_ORDER_ID = `
  SELECT 
    fs.id AS split_id,
    fs.order_item_id,
    fs.warehouse_id,
    oi.product_name_snapshot AS product_name,
    oi.sku_snapshot AS sku,
    w.name AS warehouse_name,
    w.code AS warehouse_code,
    w.shipping_cost_weight,
    fs.quantity AS qty_fulfilled,
    fs.estimated_shipment_date,
    fs.estimated_shipping_cost,
    fs.status::TEXT AS status,
    fs.manual_override,
    CEIL(fs.quantity::NUMERIC / 20.0)::INT AS est_shipments,
    fs.created_at,
    fs.updated_at
  FROM fulfillment_splits fs
  JOIN warehouses w ON fs.warehouse_id = w.id
  JOIN order_items oi ON fs.order_item_id = oi.id
  WHERE oi.order_id = $1
  ORDER BY fs.id ASC;
`;

export const GET_BACKORDERS_BY_ORDER_ID = `
  SELECT 
    b.id AS backorder_id,
    b.order_item_id,
    oi.product_name_snapshot AS product_name,
    oi.sku_snapshot AS sku,
    b.quantity,
    b.preferred_warehouse_id,
    w.name AS preferred_warehouse_name,
    b.status::TEXT AS status,
    b.created_at,
    b.updated_at
  FROM backorders b
  JOIN order_items oi ON b.order_item_id = oi.id
  LEFT JOIN warehouses w ON b.preferred_warehouse_id = w.id
  WHERE oi.order_id = $1
  ORDER BY b.id ASC;
`;

export const GET_ALL_ACTIVE_WAREHOUSES = `
  SELECT id, name, code, address, shipping_cost_weight, is_active
  FROM warehouses
  WHERE is_active = TRUE
  ORDER BY id ASC;
`;

export const GET_FULFILLMENT_META_CUSTOMERS = `
  SELECT id, company_name, email FROM customers ORDER BY company_name ASC;
`;

export const GET_FULFILLMENT_META_VARIANTS = `
  SELECT 
    pv.id AS variant_id, 
    pv.sku, 
    p.name AS product_name, 
    COALESCE(pv.selling_price, p.base_price, 1000) AS price
  FROM product_variants pv 
  JOIN products p ON pv.product_id = p.id 
  WHERE p.is_active = TRUE AND pv.is_active = TRUE
  ORDER BY p.name ASC, pv.sku ASC;
`;
