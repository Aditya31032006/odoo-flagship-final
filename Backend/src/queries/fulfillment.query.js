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

export const GET_VARIANT_STOCK_FOR_ALLOCATION = `
  SELECT ws.id, ws.warehouse_id, ws.quantity_on_hand, ws.quantity_reserved,
         (ws.quantity_on_hand - ws.quantity_reserved) AS available, ws.lead_time_days,
         w.shipping_cost_weight
  FROM warehouse_stock ws
  JOIN warehouses w ON ws.warehouse_id = w.id
  WHERE ws.product_variant_id = $1 
    AND w.is_active = TRUE 
    AND (ws.quantity_on_hand - ws.quantity_reserved) > 0
  ORDER BY (ws.quantity_on_hand - ws.quantity_reserved) DESC, ws.warehouse_id ASC
  FOR UPDATE OF ws;
`;

export const DEDUCT_WAREHOUSE_STOCK_QTY = `
  UPDATE warehouse_stock
  SET quantity_on_hand = quantity_on_hand - $1,
      updated_at = NOW()
  WHERE id = $2;
`;

export const INSERT_FULFILLMENT_SPLIT_RECORD = `
  INSERT INTO fulfillment_splits (
    order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
  ) VALUES ($1, $2, $3, CURRENT_DATE + ($4 || ' days')::INTERVAL, $5, 'allocated', false)
  RETURNING *;
`;

export const INSERT_SUGGESTED_FULFILLMENT_SPLIT = `
  INSERT INTO fulfillment_splits (
    order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
  ) VALUES ($1, $2, $3, CURRENT_DATE + 2, $4, 'allocated', false);
`;

export const INSERT_MANUAL_FULFILLMENT_SPLIT = `
  INSERT INTO fulfillment_splits (
    order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
  ) VALUES ($1, $2, $3, CURRENT_DATE + 3, $4, 'allocated', true);
`;

export const INSERT_BACKORDER_RECORD = `
  INSERT INTO backorders (
    order_item_id, quantity, status, created_at, updated_at
  ) VALUES ($1, $2, 'pending', NOW(), NOW())
  ON CONFLICT DO NOTHING;
`;

export const CHECK_VARIANT_TOTAL_AVAILABLE_STOCK = `
  SELECT COALESCE(SUM(ws.quantity_on_hand - ws.quantity_reserved), 0)::INT AS total_available
  FROM warehouse_stock ws
  JOIN warehouses w ON ws.warehouse_id = w.id
  WHERE ws.product_variant_id = $1 AND w.is_active = TRUE;
`;

export const DELETE_FULFILLMENT_SPLITS_BY_ORDER_ID = `
  DELETE FROM fulfillment_splits 
  WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
`;

export const DELETE_BACKORDERS_BY_ORDER_ID = `
  DELETE FROM backorders 
  WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
`;

export const UPDATE_ORDER_STATUS_BY_ID = `
  UPDATE orders 
  SET status = $1::order_status_enum, updated_at = NOW() 
  WHERE id = $2;
`;

export const UPDATE_QUOTATION_STATUS_BY_ID = `
  UPDATE quotations 
  SET status = $1, updated_at = NOW() 
  WHERE id = $2;
`;

export const CHECK_INVOICE_EXISTS_FOR_ORDER = `
  SELECT id FROM invoices WHERE order_id = $1 LIMIT 1;
`;

export const COUNT_INVOICES_TOTAL = `
  SELECT COUNT(*)::INT AS count FROM invoices;
`;

export const INSERT_INVOICE_RECORD = `
  INSERT INTO invoices (
    invoice_number, order_id, customer_id, status,
    invoice_date, due_date,
    subtotal, discount_total, tax_total, grand_total, paid_amount,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4::invoice_status_enum,
    CURRENT_DATE, CURRENT_DATE + 15,
    $5, 0, ($5 * 0.18), ($5 * 1.18), $6,
    NOW(), NOW()
  ) RETURNING id;
`;

export const INSERT_INVOICE_ITEM_RECORD = `
  INSERT INTO invoice_items (
    invoice_id, order_item_id, product_name_snapshot, quantity, unit_price, tax_percentage, tax_amount, line_total
  ) VALUES ($1, $2, $3, $4, $5, 18.0, $6, $7);
`;

export const MARK_FULFILLMENT_SPLITS_DELIVERED = `
  UPDATE fulfillment_splits 
  SET status = 'delivered', updated_at = NOW() 
  WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
`;

export const INSERT_WAREHOUSE_STOCK_RECORD = `
  INSERT INTO warehouse_stock (
    warehouse_id, product_variant_id, quantity_on_hand, quantity_reserved, lead_time_days, updated_at
  ) VALUES ($1, $2, $3, $4, $5, NOW())
  RETURNING *;
`;

export const UPDATE_WAREHOUSE_STOCK_RECORD = `
  UPDATE warehouse_stock 
  SET 
    warehouse_id = COALESCE($1, warehouse_id),
    product_variant_id = COALESCE($2, product_variant_id),
    quantity_on_hand = COALESCE($3, quantity_on_hand),
    quantity_reserved = COALESCE($4, quantity_reserved),
    lead_time_days = COALESCE($5, lead_time_days),
    updated_at = NOW()
  WHERE id = $6
  RETURNING *;
`;

export const DELETE_WAREHOUSE_STOCK_RECORD = `
  DELETE FROM warehouse_stock WHERE id = $1 RETURNING *;
`;

export const GET_VARIANT_PRICE_SNAPSHOT = `
  SELECT pv.id, pv.sku, p.name AS product_name, COALESCE(pv.selling_price, p.base_price, 1000) AS price
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.id = $1;
`;

export const UPSERT_CONFIRMED_QUOTATION_RECORD = `
  INSERT INTO quotations (
    quotation_number, customer_id, sales_rep_id, status, subtotal, discount_total, tax_total, grand_total
  ) VALUES ($1, $2, 1, 'confirmed', $3, 0, $4, $5)
  ON CONFLICT (quotation_number) DO UPDATE SET status = 'confirmed'
  RETURNING id;
`;

export const INSERT_ORDER_RECORD = `
  INSERT INTO orders (order_number, quotation_id, customer_id, status, created_at, updated_at)
  VALUES ($1, $2, $3, $4::order_status_enum, NOW(), NOW())
  RETURNING *;
`;

export const INSERT_ORDER_ITEM_RECORD = `
  INSERT INTO order_items (
    order_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot,
    quantity, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
  ) VALUES (
    $1, $2, 'one_time', $3, $4,
    $5, $6, 0, 0, 18.0, $7, $8
  ) RETURNING *;
`;

export const INSERT_NEW_WAREHOUSE_RECORD = `
  INSERT INTO warehouses (name, code, address, shipping_cost_weight, is_active)
  VALUES ($1, $2, 'Warehouse Facility', 1.0, true)
  RETURNING id;
`;

export const GET_FIRST_ACTIVE_WAREHOUSE = `
  SELECT id FROM warehouses WHERE is_active = true ORDER BY id ASC LIMIT 1;
`;

export const UPDATE_ORDER_BASIC_FIELDS = `
  UPDATE orders 
  SET 
    customer_id = COALESCE($1, customer_id),
    status = COALESCE($2::order_status_enum, status),
    updated_at = NOW()
  WHERE id = $3;
`;

export const UPDATE_ORDER_ITEM_FIELDS = `
  UPDATE order_items 
  SET 
    product_variant_id = COALESCE($1, product_variant_id),
    product_name_snapshot = COALESCE($2, product_name_snapshot),
    sku_snapshot = COALESCE($3, sku_snapshot),
    quantity = COALESCE($4, quantity),
    line_total = COALESCE(($4 * unit_price), line_total)
  WHERE order_id = $5;
`;

export const UPDATE_FULFILLMENT_SPLIT_QTY_BY_ORDER_ID = `
  UPDATE fulfillment_splits 
  SET quantity = $1
  WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $2);
`;

export const DELETE_SUBSCRIPTION_BILLING_LINES_BY_ORDER_ID = `
  DELETE FROM subscription_billing_lines
  WHERE subscription_id IN (
    SELECT id FROM subscriptions 
    WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)
  );
`;

export const DELETE_SUBSCRIPTIONS_BY_ORDER_ID = `
  DELETE FROM subscriptions
  WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
`;

export const DELETE_PAYMENTS_BY_ORDER_ID = `
  DELETE FROM payments
  WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = $1);
`;

export const DELETE_INVOICE_ITEMS_BY_ORDER_ID = `
  DELETE FROM invoice_items
  WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = $1)
     OR order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
`;

export const DELETE_INVOICES_BY_ORDER_ID = `
  DELETE FROM invoices WHERE order_id = $1;
`;

export const DELETE_ORDER_ITEMS_BY_ORDER_ID = `
  DELETE FROM order_items WHERE order_id = $1;
`;

export const DELETE_ORDER_BY_ID = `
  DELETE FROM orders WHERE id = $1;
`;

export const GET_QUOTATION_WITH_CUSTOMER_FOR_PAYMENT = `
  SELECT q.*, c.company_name 
  FROM quotations q 
  JOIN customers c ON q.customer_id = c.id 
  WHERE q.id = $1;
`;

export const GET_ORDER_BY_QUOTATION_ID = `
  SELECT id FROM orders WHERE quotation_id = $1 LIMIT 1;
`;

export const GET_INVOICE_BY_ORDER_ID = `
  SELECT id FROM invoices WHERE order_id = $1 LIMIT 1;
`;

export const UPDATE_INVOICE_TO_PAID = `
  UPDATE invoices
  SET status = 'paid', paid_amount = grand_total, updated_at = NOW()
  WHERE id = $1;
`;

export const INSERT_PAYMENT_RECORD = `
  INSERT INTO payments (
    invoice_id, customer_id, amount, payment_method, status, transaction_reference, payment_date
  ) VALUES ($1, $2, $3, $4::payment_method_enum, 'completed', $5, NOW())
  RETURNING *;
`;
