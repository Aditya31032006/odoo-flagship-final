import { pool } from '../config/database.js';
import {
  GET_WAREHOUSE_STOCK_LIST,
  GET_ORDERS_AWAITING_FULFILLMENT,
  GET_FULFILLMENT_DETAIL_HEADER,
  GET_ORDER_ITEMS_BY_ORDER_ID,
  GET_FULFILLMENT_SPLITS_BY_ORDER_ID,
  GET_BACKORDERS_BY_ORDER_ID,
  GET_ALL_ACTIVE_WAREHOUSES,
  GET_FULFILLMENT_META_CUSTOMERS,
  GET_FULFILLMENT_META_VARIANTS,
} from '../queries/fulfillment.query.js';

export const getFulfillmentListRepo = async () => {
  const [stockRes, ordersRes] = await Promise.all([
    pool.query(GET_WAREHOUSE_STOCK_LIST),
    pool.query(GET_ORDERS_AWAITING_FULFILLMENT),
  ]);

  return {
    stock: stockRes.rows,
    orders: ordersRes.rows,
  };
};

export const getFulfillmentMetaRepo = async () => {
  const [warehousesRes, customersRes, variantsRes] = await Promise.all([
    pool.query(GET_ALL_ACTIVE_WAREHOUSES),
    pool.query(GET_FULFILLMENT_META_CUSTOMERS),
    pool.query(GET_FULFILLMENT_META_VARIANTS),
  ]);

  return {
    warehouses: warehousesRes.rows,
    customers: customersRes.rows,
    variants: variantsRes.rows,
  };
};

export const getFulfillmentDetailRepo = async (orderIdOrNumber) => {
  const headerRes = await pool.query(GET_FULFILLMENT_DETAIL_HEADER, [String(orderIdOrNumber)]);
  if (headerRes.rows.length === 0) {
    return null;
  }

  const header = headerRes.rows[0];
  const orderId = header.order_id;

  const [itemsRes, splitsRes, backordersRes, warehousesRes, stockRes] = await Promise.all([
    pool.query(GET_ORDER_ITEMS_BY_ORDER_ID, [orderId]),
    pool.query(GET_FULFILLMENT_SPLITS_BY_ORDER_ID, [orderId]),
    pool.query(GET_BACKORDERS_BY_ORDER_ID, [orderId]),
    pool.query(GET_ALL_ACTIVE_WAREHOUSES),
    pool.query(GET_WAREHOUSE_STOCK_LIST),
  ]);

  const items = itemsRes.rows;
  let splits = splitsRes.rows;
  const backorders = backordersRes.rows;
  const warehouses = warehousesRes.rows;
  const allStock = stockRes.rows;

  // If no splits exist yet in DB, compute automatic suggested split
  if (splits.length === 0 && items.length > 0) {
    const suggestedSplits = [];
    items.forEach((item) => {
      const variantStock = allStock.filter(
        (s) => String(s.product_variant_id) === String(item.product_variant_id)
      );

      let remainingNeeded = item.quantity;
      const sortedWarehouses = [...variantStock].sort((a, b) => b.available - a.available);

      sortedWarehouses.forEach((ws) => {
        if (remainingNeeded <= 0) return;
        const alloc = Math.min(Math.max(0, ws.available), remainingNeeded);
        if (alloc > 0) {
          const baseRate = 25.0;
          const cost = (alloc * 1.5 * (ws.shipping_cost_weight || 1.0) + baseRate).toFixed(2);
          suggestedSplits.push({
            split_id: `sugg-${ws.warehouse_id}`,
            order_item_id: item.order_item_id,
            warehouse_id: ws.warehouse_id,
            warehouse_name: ws.warehouse_name,
            warehouse_code: ws.warehouse_code,
            product_name: item.product_name,
            sku: item.sku,
            qty_fulfilled: alloc,
            est_shipments: Math.ceil(alloc / 20),
            estimated_shipping_cost: Number(cost),
            status: 'suggested',
            manual_override: false,
          });
          remainingNeeded -= alloc;
        }
      });
    });

    splits = suggestedSplits;
  }

  return {
    header,
    items,
    splits,
    backorders,
    warehouses,
    availableStock: allStock,
  };
};

/**
 * Greedy Multi-Warehouse Descending Stock Allocation
 * Allocates requested quantity from active warehouses in DESCENDING order of available stock.
 * Deducts stock from warehouse_stock.quantity_on_hand.
 * Creates fulfillment_splits records, and any unfulfilled remainder goes to backorders.
 */
export const allocateStockGreedy = async (client, orderId, orderItemId, productVariantId, requestedQty) => {
  let remainingNeeded = Math.max(0, parseInt(requestedQty, 10) || 0);
  if (remainingNeeded <= 0) return { allocatedSplits: [], backorderQty: 0 };

  // 1. Fetch active warehouse stock for this variant ordered by available quantity DESC, then warehouse_id ASC
  const stockRes = await client.query(`
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
  `, [productVariantId]);

  const allocatedSplits = [];

  for (const ws of stockRes.rows) {
    if (remainingNeeded <= 0) break;
    const available = Math.max(0, parseInt(ws.available, 10) || 0);
    if (available <= 0) continue;

    const alloc = Math.min(available, remainingNeeded);
    if (alloc > 0) {
      // Deduct from warehouse_stock quantity_on_hand
      await client.query(`
        UPDATE warehouse_stock
        SET quantity_on_hand = quantity_on_hand - $1,
            updated_at = NOW()
        WHERE id = $2;
      `, [alloc, ws.id]);

      const cost = Number((alloc * 1.5 * (parseFloat(ws.shipping_cost_weight) || 1.0) + 25.0).toFixed(2));
      const leadTime = parseInt(ws.lead_time_days, 10) || 2;

      // Insert fulfillment_split
      const splitRes = await client.query(`
        INSERT INTO fulfillment_splits (
          order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
        ) VALUES ($1, $2, $3, CURRENT_DATE + ($4 || ' days')::INTERVAL, $5, 'allocated', false)
        RETURNING *;
      `, [orderItemId, ws.warehouse_id, alloc, leadTime, cost]);

      allocatedSplits.push(splitRes.rows[0]);
      remainingNeeded -= alloc;
    }
  }

  // 2. If remainingNeeded > 0, create backorder
  if (remainingNeeded > 0) {
    await client.query(`
      INSERT INTO backorders (
        order_item_id, quantity, status, created_at, updated_at
      ) VALUES ($1, $2, 'pending', NOW(), NOW());
    `, [orderItemId, remainingNeeded]);
  }

  return { allocatedSplits, backorderQty: remainingNeeded };
};

export const acceptSuggestedSplitRepo = async (orderIdOrNumber) => {
  const detail = await getFulfillmentDetailRepo(orderIdOrNumber);
  if (!detail) {
    throw new Error('Order not found for fulfillment split acceptance');
  }

  const orderId = detail.header.order_id;
  const quotationId = detail.header.quotation_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check warehouse stock availability across all active warehouses
    for (const item of (detail.items || [])) {
      const requestedQty = parseInt(item.quantity, 10) || 1;
      const stockCheck = await client.query(`
        SELECT COALESCE(SUM(ws.quantity_on_hand - ws.quantity_reserved), 0)::INT AS total_available
        FROM warehouse_stock ws
        JOIN warehouses w ON ws.warehouse_id = w.id
        WHERE ws.product_variant_id = $1 AND w.is_active = TRUE;
      `, [item.product_variant_id]);

      const totalAvailable = stockCheck.rows[0]?.total_available || 0;
      const splitAllocated = (detail.splits || [])
        .filter((s) => String(s.order_item_id) === String(item.order_item_id))
        .reduce((sum, s) => sum + (parseInt(s.qty_fulfilled || s.quantity, 10) || 0), 0);

      // If zero stock is available in any warehouse and nothing was pre-allocated
      if (totalAvailable <= 0 && splitAllocated <= 0) {
        await client.query(`
          INSERT INTO backorders (order_item_id, quantity, status, created_at, updated_at)
          VALUES ($1, $2, 'pending', NOW(), NOW())
          ON CONFLICT DO NOTHING;
        `, [item.order_item_id, requestedQty]);

        const err = new Error(
          `Cannot accept split: Zero stock available in any warehouse for "${item.product_name_snapshot || item.product_name || 'Product'}". Item has been stored as a Backorder.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    await client.query(`
      DELETE FROM fulfillment_splits 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    for (const s of detail.splits) {
      if (s.qty_fulfilled > 0) {
        await client.query(`
          INSERT INTO fulfillment_splits (
            order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
          ) VALUES ($1, $2, $3, CURRENT_DATE + 2, $4, 'allocated', false);
        `, [
          s.order_item_id || detail.items[0]?.order_item_id,
          s.warehouse_id,
          s.qty_fulfilled,
          s.estimated_shipping_cost || 35.0,
        ]);
      }
    }

    await client.query(`
      UPDATE orders 
      SET status = 'processing', updated_at = NOW() 
      WHERE id = $1;
    `, [orderId]);

    // Move quotation to 'shipment' stage in Kanban
    if (quotationId) {
      await client.query(`
        UPDATE quotations 
        SET status = 'shipment', updated_at = NOW() 
        WHERE id = $1;
      `, [quotationId]);
    }

    // Auto-generate invoice in 'issued' status ready for customer payment
    const invCheck = await client.query(`SELECT id FROM invoices WHERE order_id = $1 LIMIT 1;`, [orderId]);
    if (invCheck.rows.length === 0) {
      const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM invoices');
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;
      const grandTotal = parseFloat(detail.header.grand_total) || 0;

      const invRes = await client.query(`
        INSERT INTO invoices (
          invoice_number, order_id, customer_id, status,
          invoice_date, due_date,
          subtotal, discount_total, tax_total, grand_total, paid_amount,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'issued',
          CURRENT_DATE, CURRENT_DATE + 15,
          $4, 0, ($4 * 0.18), ($4 * 1.18), 0,
          NOW(), NOW()
        ) RETURNING id;
      `, [invNumber, orderId, detail.header.customer_id, grandTotal]);

      const invoiceId = invRes.rows[0].id;

      for (const item of (detail.items || [])) {
        const qty = parseInt(item.quantity, 10) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const taxAmt = (qty * unitPrice * 0.18);
        const lineTotal = (qty * unitPrice * 1.18);
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, order_item_id, product_name_snapshot, quantity, unit_price, tax_percentage, tax_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, 18.0, $6, $7);
        `, [invoiceId, item.order_item_id, item.product_name_snapshot || item.product_name || 'Product', qty, unitPrice, taxAmt, lineTotal]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const completeShipmentRepo = async (orderIdOrNumber) => {
  const detail = await getFulfillmentDetailRepo(orderIdOrNumber);
  if (!detail) {
    throw new Error('Order not found for shipment completion');
  }

  const orderId = detail.header.order_id;
  const quotationId = detail.header.quotation_id;
  const customerId = detail.header.customer_id;
  const grandTotal = detail.header.grand_total || 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark all fulfillment splits for this order as delivered
    await client.query(`
      UPDATE fulfillment_splits 
      SET status = 'delivered', updated_at = NOW() 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    // 2. Mark order as fulfilled
    await client.query(`
      UPDATE orders 
      SET status = 'fulfilled', updated_at = NOW() 
      WHERE id = $1;
    `, [orderId]);

    // 3. Move quotation to 'payment' stage in Kanban
    if (quotationId) {
      await client.query(`
        UPDATE quotations 
        SET status = 'payment', updated_at = NOW() 
        WHERE id = $1;
      `, [quotationId]);
    }

    // 4. Create an invoice if not already generated
    const invCheck = await client.query(`SELECT id FROM invoices WHERE order_id = $1 LIMIT 1;`, [orderId]);
    if (invCheck.rows.length === 0) {
      const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM invoices');
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;
      const subtotal = parseFloat(grandTotal) || 0;

      const invRes = await client.query(`
        INSERT INTO invoices (
          invoice_number, order_id, customer_id, status,
          invoice_date, due_date,
          subtotal, discount_total, tax_total, grand_total, paid_amount,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'issued',
          CURRENT_DATE, CURRENT_DATE + 15,
          $4, 0, ($4 * 0.18), ($4 * 1.18), 0,
          NOW(), NOW()
        ) RETURNING id;
      `, [invNumber, orderId, customerId, subtotal]);

      const invoiceId = invRes.rows[0].id;

      // Link order items to invoice items
      for (const item of detail.items) {
        const qty = parseInt(item.quantity, 10) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const taxAmt = (qty * unitPrice * 0.18);
        const lineTotal = (qty * unitPrice * 1.18);
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, order_item_id, product_name_snapshot, quantity, unit_price, tax_percentage, tax_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, 18.0, $6, $7);
        `, [invoiceId, item.order_item_id, item.product_name || 'Product', qty, unitPrice, taxAmt, lineTotal]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const saveManualOverrideSplitRepo = async (orderIdOrNumber, { splits = [], backorderQty = 0 }) => {
  const detail = await getFulfillmentDetailRepo(orderIdOrNumber);
  if (!detail) {
    throw new Error('Order not found for manual override');
  }

  const orderId = detail.header.order_id;
  const quotationId = detail.header.quotation_id;
  const orderItemId = detail.items[0]?.order_item_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      DELETE FROM fulfillment_splits 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    for (const sp of splits) {
      if (sp.quantity > 0) {
        const cost = sp.estimated_shipping_cost || (sp.quantity * 1.75 + 20).toFixed(2);
        await client.query(`
          INSERT INTO fulfillment_splits (
            order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
          ) VALUES ($1, $2, $3, CURRENT_DATE + 3, $4, 'allocated', true);
        `, [
          sp.order_item_id || orderItemId,
          sp.warehouse_id,
          sp.quantity,
          cost,
        ]);
      }
    }

    await client.query(`
      DELETE FROM backorders 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    if (backorderQty > 0) {
      await client.query(`
        INSERT INTO backorders (
          order_item_id, quantity, status, created_at, updated_at
        ) VALUES ($1, $2, 'pending', NOW(), NOW());
      `, [orderItemId, backorderQty]);
    }

    await client.query(`
      UPDATE orders 
      SET status = 'partially_fulfilled', updated_at = NOW() 
      WHERE id = $1;
    `, [orderId]);

    // Update quotation status to shipment
    if (quotationId) {
      await client.query(`
        UPDATE quotations 
        SET status = 'shipment', updated_at = NOW() 
        WHERE id = $1;
      `, [quotationId]);
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// WAREHOUSE & STOCK CRUD OPERATIONS
// ==========================================

export const createWarehouseStockRepo = async ({
  warehouse_id,
  warehouse_name,
  warehouse_code,
  product_variant_id,
  quantity_on_hand,
  quantity_reserved = 0,
  lead_time_days = 2,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let targetWhId = warehouse_id;
    if (!targetWhId && warehouse_name) {
      const code = warehouse_code || warehouse_name.substring(0, 4).toUpperCase();
      const whRes = await client.query(`
        INSERT INTO warehouses (name, code, address, shipping_cost_weight, is_active)
        VALUES ($1, $2, 'Warehouse Facility', 1.0, true)
        RETURNING id;
      `, [warehouse_name, code]);
      targetWhId = whRes.rows[0].id;
    }

    const stockRes = await client.query(`
      INSERT INTO warehouse_stock (
        warehouse_id, product_variant_id, quantity_on_hand, quantity_reserved, lead_time_days, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `, [
      targetWhId,
      product_variant_id,
      parseInt(quantity_on_hand, 10) || 0,
      parseInt(quantity_reserved, 10) || 0,
      parseInt(lead_time_days, 10) || 2,
    ]);

    await client.query('COMMIT');
    return stockRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateWarehouseStockRepo = async (stockId, {
  warehouse_id,
  product_variant_id,
  quantity_on_hand,
  quantity_reserved,
  lead_time_days,
}) => {
  const res = await pool.query(`
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
  `, [
    warehouse_id || null,
    product_variant_id || null,
    quantity_on_hand != null ? parseInt(quantity_on_hand, 10) : null,
    quantity_reserved != null ? parseInt(quantity_reserved, 10) : null,
    lead_time_days != null ? parseInt(lead_time_days, 10) : null,
    stockId,
  ]);

  return res.rows[0];
};

export const deleteWarehouseStockRepo = async (stockId) => {
  const res = await pool.query(`DELETE FROM warehouse_stock WHERE id = $1 RETURNING *;`, [stockId]);
  return res.rows[0];
};

// ==========================================
// ORDERS CRUD OPERATIONS
// ==========================================

export const createOrderRepo = async ({
  order_number,
  customer_id,
  product_variant_id,
  quantity = 1,
  warehouse_id,
  status = 'pending',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get product variant snapshot info
    const varRes = await client.query(`
      SELECT pv.id, pv.sku, p.name AS product_name, COALESCE(pv.selling_price, p.base_price, 1000) AS price
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.id = $1;
    `, [product_variant_id]);

    const variant = varRes.rows[0] || { sku: 'SKU-ITEM', product_name: 'Product Item', price: 1000 };
    const qty = parseInt(quantity, 10) || 1;
    const unitPrice = parseFloat(variant.price);
    const subtotal = (unitPrice * qty);
    const taxAmount = (subtotal * 0.18);
    const grandTotal = (subtotal + taxAmount);
    const orderNum = order_number || `Q-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Create linked confirmed quotation
    const quoteRes = await client.query(`
      INSERT INTO quotations (
        quotation_number, customer_id, sales_rep_id, status, subtotal, discount_total, tax_total, grand_total
      ) VALUES ($1, $2, 1, 'confirmed', $3, 0, $4, $5)
      ON CONFLICT (quotation_number) DO UPDATE SET status = 'confirmed'
      RETURNING id;
    `, [orderNum, customer_id, subtotal, taxAmount, grandTotal]);
    const quotationId = quoteRes.rows[0].id;

    // 3. Insert into orders
    const ordRes = await client.query(`
      INSERT INTO orders (order_number, quotation_id, customer_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4::order_status_enum, NOW(), NOW())
      RETURNING *;
    `, [orderNum, quotationId, customer_id, status]);

    const orderId = ordRes.rows[0].id;

    // 4. Insert order item
    const itemRes = await client.query(`
      INSERT INTO order_items (
        order_id, product_variant_id, line_type, product_name_snapshot, sku_snapshot,
        quantity, unit_price, discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
      ) VALUES (
        $1, $2, 'one_time', $3, $4,
        $5, $6, 0, 0, 18.0, $7, $8
      ) RETURNING *;
    `, [orderId, product_variant_id, variant.product_name, variant.sku, qty, unitPrice, taxAmount, grandTotal]);

    const orderItemId = itemRes.rows[0].id;

    // 5. If warehouse specified, create initial split (or create new warehouse if specified)
    let targetWhId = warehouse_id;
    if (!targetWhId && warehouse_name) {
      const code = (warehouse_code || warehouse_name.trim().substring(0, 4)).toUpperCase();
      const newWh = await client.query(`
        INSERT INTO warehouses (name, code, is_active)
        VALUES ($1, $2, true)
        RETURNING id;
      `, [warehouse_name, code]);
      targetWhId = newWh.rows[0].id;
    } else if (!targetWhId) {
      const whRes = await client.query('SELECT id FROM warehouses WHERE is_active = true ORDER BY id ASC LIMIT 1');
      targetWhId = whRes.rows[0]?.id;
    }

    if (targetWhId) {
      await client.query(`
        INSERT INTO fulfillment_splits (
          order_item_id, warehouse_id, quantity, estimated_shipment_date, estimated_shipping_cost, status, manual_override
        ) VALUES ($1, $2, $3, CURRENT_DATE + 2, 35.00, 'pending', false);
      `, [orderItemId, targetWhId, qty]);
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateOrderRepo = async (orderId, {
  customer_id,
  product_variant_id,
  quantity,
  status,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (customer_id || status) {
      await client.query(`
        UPDATE orders 
        SET 
          customer_id = COALESCE($1, customer_id),
          status = COALESCE($2::order_status_enum, status),
          updated_at = NOW()
        WHERE id = $3;
      `, [customer_id || null, status || null, orderId]);
    }

    if (product_variant_id || quantity != null) {
      const varRes = await client.query(`
        SELECT pv.id, pv.sku, p.name AS product_name, COALESCE(pv.selling_price, p.base_price, 1000) AS price
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.id = $1;
      `, [product_variant_id]);

      const variant = varRes.rows[0];
      const qty = parseInt(quantity, 10);

      await client.query(`
        UPDATE order_items 
        SET 
          product_variant_id = COALESCE($1, product_variant_id),
          product_name_snapshot = COALESCE($2, product_name_snapshot),
          sku_snapshot = COALESCE($3, sku_snapshot),
          quantity = COALESCE($4, quantity),
          line_total = COALESCE(($4 * unit_price), line_total)
        WHERE order_id = $5;
      `, [
        product_variant_id || null,
        variant ? variant.product_name : null,
        variant ? variant.sku : null,
        qty > 0 ? qty : null,
        orderId,
      ]);

      // Update split quantity
      if (qty > 0) {
        await client.query(`
          UPDATE fulfillment_splits 
          SET quantity = $1
          WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $2);
        `, [qty, orderId]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteOrderRepo = async (orderId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete fulfillment splits and backorders
    await client.query(`
      DELETE FROM fulfillment_splits 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    await client.query(`
      DELETE FROM backorders 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    // 2. Delete subscription billing lines and subscriptions linked to order items
    await client.query(`
      DELETE FROM subscription_billing_lines
      WHERE subscription_id IN (
        SELECT id FROM subscriptions 
        WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1)
      );
    `, [orderId]);

    await client.query(`
      DELETE FROM subscriptions
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    // 3. Delete payments, invoice items, and invoices linked to the order
    await client.query(`
      DELETE FROM payments
      WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = $1);
    `, [orderId]);

    await client.query(`
      DELETE FROM invoice_items
      WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = $1)
         OR order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    await client.query(`
      DELETE FROM invoices
      WHERE order_id = $1;
    `, [orderId]);

    // 4. Delete order items and the order itself
    await client.query(`DELETE FROM order_items WHERE order_id = $1;`, [orderId]);
    await client.query(`DELETE FROM orders WHERE id = $1;`, [orderId]);

    await client.query('COMMIT');
    return { success: true, deletedOrderId: orderId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const payQuotationRepo = async ({
  quotationId,
  paymentMethod = 'bank_transfer',
  transactionReference = '',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch quotation
    const quoteRes = await client.query(`
      SELECT q.*, c.company_name 
      FROM quotations q 
      JOIN customers c ON q.customer_id = c.id 
      WHERE q.id = $1;
    `, [quotationId]);

    if (quoteRes.rows.length === 0) {
      throw new Error('Quotation not found');
    }
    const quotation = quoteRes.rows[0];
    const amount = parseFloat(quotation.grand_total) || 0;

    // 2. Fetch or create order
    let orderId = null;
    const orderRes = await client.query(`SELECT id FROM orders WHERE quotation_id = $1 LIMIT 1;`, [quotationId]);
    if (orderRes.rows.length > 0) {
      orderId = orderRes.rows[0].id;
    }

    // 3. Find or create invoice
    let invoiceId = null;
    if (orderId) {
      const invRes = await client.query(`SELECT id FROM invoices WHERE order_id = $1 LIMIT 1;`, [orderId]);
      if (invRes.rows.length > 0) {
        invoiceId = invRes.rows[0].id;
      }
    }

    if (!invoiceId) {
      const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM invoices');
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;

      const invRes = await client.query(`
        INSERT INTO invoices (
          invoice_number, order_id, customer_id, status,
          invoice_date, due_date,
          subtotal, discount_total, tax_total, grand_total, paid_amount,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'paid',
          CURRENT_DATE, CURRENT_DATE + 15,
          $4, 0, ($4 * 0.18), $4, $4,
          NOW(), NOW()
        ) RETURNING id;
      `, [invNumber, orderId, quotation.customer_id, amount]);
      invoiceId = invRes.rows[0].id;
    } else {
      await client.query(`
        UPDATE invoices
        SET status = 'paid', paid_amount = grand_total, updated_at = NOW()
        WHERE id = $1;
      `, [invoiceId]);
    }

    // 4. Record payment
    const validMethods = ['cash', 'bank_transfer', 'upi', 'card', 'online'];
    const sanitizedMethod = validMethods.includes(paymentMethod) ? paymentMethod : (paymentMethod === 'credit_card' ? 'card' : 'bank_transfer');

    const paymentRes = await client.query(`
      INSERT INTO payments (
        invoice_id, customer_id, amount, payment_method, status, transaction_reference, payment_date
      ) VALUES ($1, $2, $3, $4::payment_method_enum, 'completed', $5, NOW())
      RETURNING *;
    `, [
      invoiceId,
      quotation.customer_id,
      amount,
      sanitizedMethod,
      transactionReference || `PAY-${Date.now()}`
    ]);

    // 5. Update quotation status to 'payment' (moves to Payment column on Kanban!)
    await client.query(`
      UPDATE quotations 
      SET status = 'payment', updated_at = NOW() 
      WHERE id = $1;
    `, [quotationId]);

    // 6. Update order status if exists
    if (orderId) {
      await client.query(`
        UPDATE orders 
        SET status = 'fulfilled', updated_at = NOW() 
        WHERE id = $1;
      `, [orderId]);
    }

    await client.query('COMMIT');
    return {
      success: true,
      quotation_id: quotationId,
      status: 'payment',
      amount,
      payment: paymentRes.rows[0],
      invoice_id: invoiceId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

