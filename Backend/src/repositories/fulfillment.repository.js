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

export const acceptSuggestedSplitRepo = async (orderIdOrNumber) => {
  const detail = await getFulfillmentDetailRepo(orderIdOrNumber);
  if (!detail) {
    throw new Error('Order not found for fulfillment split acceptance');
  }

  const orderId = detail.header.order_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    // 4. If warehouse specified, create initial split
    let targetWhId = warehouse_id;
    if (!targetWhId) {
      const whRes = await client.query('SELECT id FROM warehouses LIMIT 1');
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

    await client.query(`
      DELETE FROM fulfillment_splits 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

    await client.query(`
      DELETE FROM backorders 
      WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id = $1);
    `, [orderId]);

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
