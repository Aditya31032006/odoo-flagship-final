export const GET_ALL_INVOICES = `
  SELECT 
    inv.id,
    inv.invoice_number,
    inv.order_id,
    inv.customer_id,
    inv.status,
    inv.invoice_date,
    inv.due_date,
    inv.subtotal,
    inv.discount_total,
    inv.tax_total,
    inv.grand_total,
    inv.paid_amount,
    (inv.grand_total - inv.paid_amount) AS balance_due,
    inv.created_at,
    inv.updated_at,
    c.company_name AS customer_name,
    c.email AS customer_email,
    o.order_number
  FROM invoices inv
  JOIN customers c ON inv.customer_id = c.id
  LEFT JOIN orders o ON inv.order_id = o.id
  ORDER BY inv.invoice_date DESC, inv.id DESC;
`;

export const GET_INVOICE_STATUS_COUNTS = `
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('draft', 'issued', 'partially_paid') AND paid_amount < grand_total)::int AS unpaid_count,
    COUNT(*) FILTER (WHERE status = 'paid' OR paid_amount >= grand_total)::int AS paid_count,
    COUNT(*) FILTER (WHERE status = 'partially_paid')::int AS partially_paid_count,
    COUNT(*)::int AS total_count
  FROM invoices;
`;

export const GET_INVOICE_BY_ID = `
  SELECT 
    inv.id,
    inv.invoice_number,
    inv.order_id,
    inv.customer_id,
    inv.status,
    inv.invoice_date,
    inv.due_date,
    inv.subtotal,
    inv.discount_total,
    inv.tax_total,
    inv.grand_total,
    inv.paid_amount,
    (inv.grand_total - inv.paid_amount) AS balance_due,
    inv.created_at,
    inv.updated_at,
    c.company_name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.billing_address AS customer_billing_address,
    o.order_number,
    o.status AS order_status
  FROM invoices inv
  JOIN customers c ON inv.customer_id = c.id
  LEFT JOIN orders o ON inv.order_id = o.id
  WHERE inv.id = $1;
`;

export const GET_INVOICE_ITEMS_BY_INVOICE_ID = `
  SELECT 
    ii.id,
    ii.invoice_id,
    ii.order_item_id,
    ii.product_variant_id,
    ii.product_name_snapshot AS product_name,
    ii.sku_snapshot AS sku,
    ii.quantity,
    ii.unit_price,
    ii.tax_percentage,
    ii.tax_amount,
    ii.line_total
  FROM invoice_items ii
  WHERE ii.invoice_id = $1
  ORDER BY ii.id ASC;
`;

export const GET_PAYMENTS_BY_INVOICE_ID = `
  SELECT 
    p.id,
    p.invoice_id,
    p.customer_id,
    p.amount,
    p.payment_method,
    p.status,
    p.transaction_reference,
    p.payment_date,
    p.created_at
  FROM payments p
  WHERE p.invoice_id = $1
  ORDER BY p.payment_date DESC, p.id DESC;
`;

export const GET_DELIVERY_RECONCILIATION_BY_ORDER_ID = `
  SELECT 
    oi.id AS order_item_id,
    oi.product_name_snapshot AS product_name,
    oi.sku_snapshot AS sku,
    oi.quantity AS ordered_qty,
    COALESCE(SUM(CASE WHEN fs.status IN ('shipped', 'delivered') THEN fs.quantity ELSE 0 END), 0)::int AS shipped_qty,
    COALESCE(SUM(CASE WHEN fs.status IN ('pending', 'allocated', 'processing') THEN fs.quantity ELSE 0 END), 0)::int AS pending_fulfillment_qty,
    COALESCE((
      SELECT SUM(ii.quantity)
      FROM invoice_items ii
      WHERE ii.order_item_id = oi.id
    ), 0)::int AS invoiced_qty
  FROM order_items oi
  LEFT JOIN fulfillment_splits fs ON oi.id = fs.order_item_id
  WHERE oi.order_id = $1
  GROUP BY oi.id, oi.product_name_snapshot, oi.sku_snapshot, oi.quantity
  ORDER BY oi.id ASC;
`;

export const GET_RELATED_INVOICES_FOR_CUSTOMER = `
  SELECT 
    inv.id,
    inv.invoice_number,
    inv.grand_total AS amount,
    inv.status,
    inv.due_date,
    inv.paid_amount,
    CASE 
      WHEN EXISTS (SELECT 1 FROM subscription_billing_lines sbl WHERE sbl.invoice_id = inv.id) 
        THEN TRUE 
      ELSE FALSE 
    END AS is_recurring
  FROM invoices inv
  WHERE inv.customer_id = $1
  ORDER BY inv.invoice_date DESC
  LIMIT 5;
`;

export const INSERT_PAYMENT = `
  INSERT INTO payments (
    invoice_id,
    customer_id,
    amount,
    payment_method,
    status,
    transaction_reference,
    payment_date
  )
  VALUES ($1, $2, $3, $4::payment_method_enum, 'completed', $5, CURRENT_TIMESTAMP)
  RETURNING *;
`;

export const UPDATE_INVOICE_PAID_AMOUNT = `
  UPDATE invoices
  SET 
    paid_amount = paid_amount + $2,
    status = CASE 
      WHEN paid_amount + $2 >= grand_total THEN 'paid'::invoice_status_enum
      WHEN paid_amount + $2 > 0 THEN 'partially_paid'::invoice_status_enum
      ELSE status
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING *;
`;

export const CREATE_INVOICE = `
  INSERT INTO invoices (
    invoice_number,
    order_id,
    customer_id,
    status,
    invoice_date,
    due_date,
    subtotal,
    discount_total,
    tax_total,
    grand_total,
    paid_amount
  )
  VALUES ($1, $2, $3, 'issued', CURRENT_DATE, $4, $5, $6, $7, $8, 0)
  RETURNING *;
`;

export const INSERT_INVOICE_ITEM = `
  INSERT INTO invoice_items (
    invoice_id,
    order_item_id,
    product_variant_id,
    product_name_snapshot,
    sku_snapshot,
    quantity,
    unit_price,
    tax_percentage,
    tax_amount,
    line_total
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *;
`;

export const GET_INVOICE_META_CUSTOMERS = `
  SELECT id, company_name, email, billing_address
  FROM customers
  WHERE is_active = TRUE
  ORDER BY company_name ASC;
`;

export const GET_INVOICE_META_PRODUCTS = `
  SELECT 
    pv.id AS variant_id,
    p.id AS product_id,
    COALESCE(p.name || ' (' || pv.variant_name || ')', p.name) AS product_name,
    pv.sku,
    pv.selling_price,
    p.tax_percentage
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.is_active = TRUE AND p.is_active = TRUE
  ORDER BY p.name ASC;
`;

export const GET_INVOICE_META_ORDERS = `
  SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    c.company_name AS customer_name,
    o.status,
    o.created_at
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  ORDER BY o.created_at DESC
  LIMIT 50;
`;
