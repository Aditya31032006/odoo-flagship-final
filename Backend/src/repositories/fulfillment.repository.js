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
  GET_VARIANT_STOCK_FOR_ALLOCATION,
  DEDUCT_WAREHOUSE_STOCK_QTY,
  INSERT_FULFILLMENT_SPLIT_RECORD,
  INSERT_SUGGESTED_FULFILLMENT_SPLIT,
  INSERT_MANUAL_FULFILLMENT_SPLIT,
  INSERT_BACKORDER_RECORD,
  CHECK_VARIANT_TOTAL_AVAILABLE_STOCK,
  DELETE_FULFILLMENT_SPLITS_BY_ORDER_ID,
  DELETE_BACKORDERS_BY_ORDER_ID,
  UPDATE_ORDER_STATUS_BY_ID,
  UPDATE_QUOTATION_STATUS_BY_ID,
  CHECK_INVOICE_EXISTS_FOR_ORDER,
  COUNT_INVOICES_TOTAL,
  INSERT_INVOICE_RECORD,
  INSERT_INVOICE_ITEM_RECORD,
  MARK_FULFILLMENT_SPLITS_DELIVERED,
  INSERT_WAREHOUSE_STOCK_RECORD,
  UPDATE_WAREHOUSE_STOCK_RECORD,
  DELETE_WAREHOUSE_STOCK_RECORD,
  GET_VARIANT_PRICE_SNAPSHOT,
  UPSERT_CONFIRMED_QUOTATION_RECORD,
  INSERT_ORDER_RECORD,
  INSERT_ORDER_ITEM_RECORD,
  INSERT_NEW_WAREHOUSE_RECORD,
  GET_FIRST_ACTIVE_WAREHOUSE,
  UPDATE_ORDER_BASIC_FIELDS,
  UPDATE_ORDER_ITEM_FIELDS,
  UPDATE_FULFILLMENT_SPLIT_QTY_BY_ORDER_ID,
  DELETE_SUBSCRIPTION_BILLING_LINES_BY_ORDER_ID,
  DELETE_SUBSCRIPTIONS_BY_ORDER_ID,
  DELETE_PAYMENTS_BY_ORDER_ID,
  DELETE_INVOICE_ITEMS_BY_ORDER_ID,
  DELETE_INVOICES_BY_ORDER_ID,
  DELETE_ORDER_ITEMS_BY_ORDER_ID,
  DELETE_ORDER_BY_ID,
  GET_QUOTATION_WITH_CUSTOMER_FOR_PAYMENT,
  GET_ORDER_BY_QUOTATION_ID,
  GET_INVOICE_BY_ORDER_ID,
  UPDATE_INVOICE_TO_PAID,
  INSERT_PAYMENT_RECORD,
  RESOLVE_PENDING_BACKORDERS_FOR_ORDER,
  INSERT_SHORTAGE_BACKORDER_RECORD,
} from '../queries/fulfillment.query.js';

export const getFulfillmentListRepo = async ({ search = null, limit = null, offset = null } = {}) => {
  const client = await pool.connect();
  try {
    const stockRes = await client.query(GET_WAREHOUSE_STOCK_LIST);

    let ordersQuery = GET_ORDERS_AWAITING_FULFILLMENT;
    const ordersParams = [search ? search.trim() : null];

    if (limit !== null && offset !== null && !isNaN(Number(limit)) && !isNaN(Number(offset))) {
      ordersParams.push(Math.max(1, Number(limit)), Math.max(0, Number(offset)));
      ordersQuery += ` LIMIT $2 OFFSET $3`;
    }

    const ordersRes = await client.query(ordersQuery, ordersParams);

    return {
      stock: stockRes.rows,
      orders: ordersRes.rows,
    };
  } catch (error) {
    console.error('Error in getFulfillmentListRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getFulfillmentMetaRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const warehousesRes = await client.query(GET_ALL_ACTIVE_WAREHOUSES);
    const customersRes = await client.query(GET_FULFILLMENT_META_CUSTOMERS);
    const variantsRes = await client.query(GET_FULFILLMENT_META_VARIANTS);
    await client.query('COMMIT');

    return {
      warehouses: warehousesRes.rows,
      customers: customersRes.rows,
      variants: variantsRes.rows,
    };
  } catch (error) {
    console.error('Error in getFulfillmentMetaRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getFulfillmentDetailRepo = async (orderIdOrNumber) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const headerRes = await client.query(GET_FULFILLMENT_DETAIL_HEADER, [String(orderIdOrNumber)]);
    if (headerRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const header = headerRes.rows[0];
    const orderId = header.order_id;

    const itemsRes = await client.query(GET_ORDER_ITEMS_BY_ORDER_ID, [orderId]);
    const splitsRes = await client.query(GET_FULFILLMENT_SPLITS_BY_ORDER_ID, [orderId]);
    const backordersRes = await client.query(GET_BACKORDERS_BY_ORDER_ID, [orderId]);
    const warehousesRes = await client.query(GET_ALL_ACTIVE_WAREHOUSES);
    const stockRes = await client.query(GET_WAREHOUSE_STOCK_LIST);

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

    // Compute total allocated units vs total required units
    const totalAllocated = splits.reduce((sum, s) => sum + (parseInt(s.qty_fulfilled, 10) || 0), 0);
    const totalRequired = items.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0);
    let currentBackorders = backorders;

    // If new stock was added to warehouses and can now fully fulfill the order, resolve existing pending backorders
    if (totalAllocated >= totalRequired && backorders.some((b) => b.status === 'pending')) {
      await client.query(RESOLVE_PENDING_BACKORDERS_FOR_ORDER, [orderId]);
      currentBackorders = [];
    } else if (totalAllocated < totalRequired && backorders.length === 0 && items.length > 0) {
      // Record shortage as pending backorder
      for (const item of items) {
        const itemAlloc = splits
          .filter((s) => String(s.order_item_id) === String(item.order_item_id))
          .reduce((sum, s) => sum + (parseInt(s.qty_fulfilled, 10) || 0), 0);
        const shortage = item.quantity - itemAlloc;
        if (shortage > 0) {
          const boRes = await client.query(INSERT_SHORTAGE_BACKORDER_RECORD, [item.order_item_id, shortage]);
          currentBackorders.push({
            ...boRes.rows[0],
            product_name: item.product_name,
            sku: item.sku,
          });
        }
      }
    }

    await client.query('COMMIT');

    return {
      header,
      items,
      splits,
      backorders: currentBackorders,
      warehouses,
      availableStock: allStock,
    };
  } catch (error) {
    console.error('Error in getFulfillmentDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

  const stockRes = await client.query(GET_VARIANT_STOCK_FOR_ALLOCATION, [productVariantId]);
  const allocatedSplits = [];

  for (const ws of stockRes.rows) {
    if (remainingNeeded <= 0) break;
    const available = Math.max(0, parseInt(ws.available, 10) || 0);
    if (available <= 0) continue;

    const alloc = Math.min(available, remainingNeeded);
    if (alloc > 0) {
      await client.query(DEDUCT_WAREHOUSE_STOCK_QTY, [alloc, ws.id]);

      const cost = Number((alloc * 1.5 * (parseFloat(ws.shipping_cost_weight) || 1.0) + 25.0).toFixed(2));
      const leadTime = parseInt(ws.lead_time_days, 10) || 2;

      const splitRes = await client.query(INSERT_FULFILLMENT_SPLIT_RECORD, [
        orderItemId,
        ws.warehouse_id,
        alloc,
        leadTime,
        cost,
      ]);

      allocatedSplits.push(splitRes.rows[0]);
      remainingNeeded -= alloc;
    }
  }

  if (remainingNeeded > 0) {
    await client.query(INSERT_BACKORDER_RECORD, [orderItemId, remainingNeeded]);
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

    // Calculate total required vs total allocated across all splits
    const totalAllocated = (detail.splits || []).reduce((sum, s) => sum + (parseInt(s.qty_fulfilled || s.quantity, 10) || 0), 0);
    const totalRequired = (detail.items || []).reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0);
    const hasPendingBackorders = (detail.backorders || []).some((b) => b.status === 'pending') || totalAllocated < totalRequired;

    // Reject split acceptance if stock is insufficient or active backorders exist
    if (hasPendingBackorders) {
      const shortage = Math.max(0, totalRequired - totalAllocated);
      const err = new Error(
        `Cannot accept split: ${shortage > 0 ? `${shortage} units are missing / on backorder.` : 'Pending backorder exists.'} Please add stock to a warehouse before accepting the fulfillment split.`
      );
      err.statusCode = 400;
      throw err;
    }

    await client.query(DELETE_FULFILLMENT_SPLITS_BY_ORDER_ID, [orderId]);

    for (const s of detail.splits) {
      const qty = s.qty_fulfilled || s.quantity || 0;
      if (qty > 0) {
        await client.query(INSERT_SUGGESTED_FULFILLMENT_SPLIT, [
          s.order_item_id || detail.items[0]?.order_item_id,
          s.warehouse_id,
          qty,
          s.estimated_shipping_cost || 35.0,
        ]);
      }
    }

    await client.query(UPDATE_ORDER_STATUS_BY_ID, ['processing', orderId]);

    if (quotationId) {
      await client.query(UPDATE_QUOTATION_STATUS_BY_ID, ['shipment', quotationId]);
    }

    const invCheck = await client.query(CHECK_INVOICE_EXISTS_FOR_ORDER, [orderId]);
    if (invCheck.rows.length === 0) {
      const countRes = await client.query(COUNT_INVOICES_TOTAL);
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;
      const grandTotal = parseFloat(detail.header.grand_total) || 0;

      const invRes = await client.query(INSERT_INVOICE_RECORD, [
        invNumber,
        orderId,
        detail.header.customer_id,
        'issued',
        grandTotal,
        0,
      ]);

      const invoiceId = invRes.rows[0].id;

      for (const item of (detail.items || [])) {
        const qty = parseInt(item.quantity, 10) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const taxAmt = (qty * unitPrice * 0.18);
        const lineTotal = (qty * unitPrice * 1.18);
        await client.query(INSERT_INVOICE_ITEM_RECORD, [
          invoiceId,
          item.order_item_id,
          item.product_name_snapshot || item.product_name || 'Product',
          qty,
          unitPrice,
          taxAmt,
          lineTotal,
        ]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    console.error('Error in acceptSuggestedSplitRepo:', error);
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

    await client.query(MARK_FULFILLMENT_SPLITS_DELIVERED, [orderId]);
    await client.query(UPDATE_ORDER_STATUS_BY_ID, ['fulfilled', orderId]);

    if (quotationId) {
      await client.query(UPDATE_QUOTATION_STATUS_BY_ID, ['payment', quotationId]);
    }

    const invCheck = await client.query(CHECK_INVOICE_EXISTS_FOR_ORDER, [orderId]);
    if (invCheck.rows.length === 0) {
      const countRes = await client.query(COUNT_INVOICES_TOTAL);
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;
      const subtotal = parseFloat(grandTotal) || 0;

      const invRes = await client.query(INSERT_INVOICE_RECORD, [
        invNumber,
        orderId,
        customerId,
        'issued',
        subtotal,
        0,
      ]);

      const invoiceId = invRes.rows[0].id;

      for (const item of detail.items) {
        const qty = parseInt(item.quantity, 10) || 1;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const taxAmt = (qty * unitPrice * 0.18);
        const lineTotal = (qty * unitPrice * 1.18);
        await client.query(INSERT_INVOICE_ITEM_RECORD, [
          invoiceId,
          item.order_item_id,
          item.product_name || 'Product',
          qty,
          unitPrice,
          taxAmt,
          lineTotal,
        ]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    console.error('Error in completeShipmentRepo:', error);
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

    await client.query(DELETE_FULFILLMENT_SPLITS_BY_ORDER_ID, [orderId]);

    for (const sp of splits) {
      if (sp.quantity > 0) {
        const cost = sp.estimated_shipping_cost || (sp.quantity * 1.75 + 20).toFixed(2);
        await client.query(INSERT_MANUAL_FULFILLMENT_SPLIT, [
          sp.order_item_id || orderItemId,
          sp.warehouse_id,
          sp.quantity,
          cost,
        ]);
      }
    }

    await client.query(DELETE_BACKORDERS_BY_ORDER_ID, [orderId]);

    if (backorderQty > 0) {
      await client.query(INSERT_BACKORDER_RECORD, [orderItemId, backorderQty]);
    }

    await client.query(UPDATE_ORDER_STATUS_BY_ID, ['partially_fulfilled', orderId]);

    if (quotationId) {
      await client.query(UPDATE_QUOTATION_STATUS_BY_ID, ['shipment', quotationId]);
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    console.error('Error in saveManualOverrideSplitRepo:', error);
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
      const code = (warehouse_code || warehouse_name.trim().substring(0, 4)).toUpperCase();
      const whRes = await client.query(INSERT_NEW_WAREHOUSE_RECORD, [warehouse_name, code]);
      targetWhId = whRes.rows[0].id;
    }

    const stockRes = await client.query(INSERT_WAREHOUSE_STOCK_RECORD, [
      targetWhId,
      product_variant_id,
      parseInt(quantity_on_hand, 10) || 0,
      parseInt(quantity_reserved, 10) || 0,
      parseInt(lead_time_days, 10) || 2,
    ]);

    await client.query('COMMIT');
    return stockRes.rows[0];
  } catch (error) {
    console.error('Error in createWarehouseStockRepo:', error);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(UPDATE_WAREHOUSE_STOCK_RECORD, [
      warehouse_id || null,
      product_variant_id || null,
      quantity_on_hand != null ? parseInt(quantity_on_hand, 10) : null,
      quantity_reserved != null ? parseInt(quantity_reserved, 10) : null,
      lead_time_days != null ? parseInt(lead_time_days, 10) : null,
      stockId,
    ]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    console.error('Error in updateWarehouseStockRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteWarehouseStockRepo = async (stockId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(DELETE_WAREHOUSE_STOCK_RECORD, [stockId]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    console.error('Error in deleteWarehouseStockRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  warehouse_name,
  warehouse_code,
  status = 'pending',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const varRes = await client.query(GET_VARIANT_PRICE_SNAPSHOT, [product_variant_id]);
    const variant = varRes.rows[0] || { sku: 'SKU-ITEM', product_name: 'Product Item', price: 1000 };
    const qty = parseInt(quantity, 10) || 1;
    const unitPrice = parseFloat(variant.price);
    const subtotal = (unitPrice * qty);
    const taxAmount = (subtotal * 0.18);
    const grandTotal = (subtotal + taxAmount);
    const orderNum = order_number || `Q-${Math.floor(1000 + Math.random() * 9000)}`;

    const quoteRes = await client.query(UPSERT_CONFIRMED_QUOTATION_RECORD, [
      orderNum,
      customer_id,
      subtotal,
      taxAmount,
      grandTotal,
    ]);
    const quotationId = quoteRes.rows[0].id;

    const ordRes = await client.query(INSERT_ORDER_RECORD, [
      orderNum,
      quotationId,
      customer_id,
      status,
    ]);
    const orderId = ordRes.rows[0].id;

    const itemRes = await client.query(INSERT_ORDER_ITEM_RECORD, [
      orderId,
      product_variant_id,
      variant.product_name,
      variant.sku,
      qty,
      unitPrice,
      taxAmount,
      grandTotal,
    ]);
    const orderItemId = itemRes.rows[0].id;

    let targetWhId = warehouse_id;
    if (!targetWhId && warehouse_name) {
      const code = (warehouse_code || warehouse_name.trim().substring(0, 4)).toUpperCase();
      const newWh = await client.query(INSERT_NEW_WAREHOUSE_RECORD, [warehouse_name, code]);
      targetWhId = newWh.rows[0].id;
    } else if (!targetWhId) {
      const whRes = await client.query(GET_FIRST_ACTIVE_WAREHOUSE);
      targetWhId = whRes.rows[0]?.id;
    }

    if (targetWhId) {
      await client.query(INSERT_SUGGESTED_FULFILLMENT_SPLIT, [
        orderItemId,
        targetWhId,
        qty,
        35.00,
      ]);
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    console.error('Error in createOrderRepo:', error);
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
      await client.query(UPDATE_ORDER_BASIC_FIELDS, [customer_id || null, status || null, orderId]);
    }

    if (product_variant_id || quantity != null) {
      const varRes = await client.query(GET_VARIANT_PRICE_SNAPSHOT, [product_variant_id]);
      const variant = varRes.rows[0];
      const qty = parseInt(quantity, 10);

      await client.query(UPDATE_ORDER_ITEM_FIELDS, [
        product_variant_id || null,
        variant ? variant.product_name : null,
        variant ? variant.sku : null,
        qty > 0 ? qty : null,
        orderId,
      ]);

      if (qty > 0) {
        await client.query(UPDATE_FULFILLMENT_SPLIT_QTY_BY_ORDER_ID, [qty, orderId]);
      }
    }

    await client.query('COMMIT');
    return await getFulfillmentDetailRepo(orderId);
  } catch (error) {
    console.error('Error in updateOrderRepo:', error);
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

    await client.query(DELETE_FULFILLMENT_SPLITS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_BACKORDERS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_SUBSCRIPTION_BILLING_LINES_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_SUBSCRIPTIONS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_PAYMENTS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_INVOICE_ITEMS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_INVOICES_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_ORDER_ITEMS_BY_ORDER_ID, [orderId]);
    await client.query(DELETE_ORDER_BY_ID, [orderId]);

    await client.query('COMMIT');
    return { success: true, deletedOrderId: orderId };
  } catch (error) {
    console.error('Error in deleteOrderRepo:', error);
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

    const quoteRes = await client.query(GET_QUOTATION_WITH_CUSTOMER_FOR_PAYMENT, [quotationId]);
    if (quoteRes.rows.length === 0) {
      throw new Error('Quotation not found');
    }
    const quotation = quoteRes.rows[0];
    const amount = parseFloat(quotation.grand_total) || 0;

    let orderId = null;
    const orderRes = await client.query(GET_ORDER_BY_QUOTATION_ID, [quotationId]);
    if (orderRes.rows.length > 0) {
      orderId = orderRes.rows[0].id;
    }

    let invoiceId = null;
    if (orderId) {
      const invRes = await client.query(GET_INVOICE_BY_ORDER_ID, [orderId]);
      if (invRes.rows.length > 0) {
        invoiceId = invRes.rows[0].id;
      }
    }

    if (!invoiceId) {
      const countRes = await client.query(COUNT_INVOICES_TOTAL);
      const invCount = (countRes.rows[0]?.count || 0) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`;

      const invRes = await client.query(INSERT_INVOICE_RECORD, [
        invNumber,
        orderId,
        quotation.customer_id,
        'paid',
        amount,
        amount,
      ]);
      invoiceId = invRes.rows[0].id;
    } else {
      await client.query(UPDATE_INVOICE_TO_PAID, [invoiceId]);
    }

    const validMethods = ['cash', 'bank_transfer', 'upi', 'card', 'online'];
    const sanitizedMethod = validMethods.includes(paymentMethod) ? paymentMethod : (paymentMethod === 'credit_card' ? 'card' : 'bank_transfer');

    const paymentRes = await client.query(INSERT_PAYMENT_RECORD, [
      invoiceId,
      quotation.customer_id,
      amount,
      sanitizedMethod,
      transactionReference || `PAY-${Date.now()}`,
    ]);

    await client.query(UPDATE_QUOTATION_STATUS_BY_ID, ['payment', quotationId]);

    // Auto-resolve any deal health flags for this quotation since payment is complete
    await client.query(`
      UPDATE deal_health_flags 
      SET action = 'resolved', detail = 'Resolved: Payment completed', resolved_at = NOW() 
      WHERE quotation_id = $1
    `, [quotationId]);

    if (orderId) {
      await client.query(UPDATE_ORDER_STATUS_BY_ID, ['fulfilled', orderId]);
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
    console.error('Error in payQuotationRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
