import { pool } from '../config/database.js';
import {
  GET_ALL_INVOICES,
  GET_INVOICE_STATUS_COUNTS,
  GET_INVOICE_BY_ID,
  GET_INVOICE_ITEMS_BY_INVOICE_ID,
  GET_PAYMENTS_BY_INVOICE_ID,
  GET_DELIVERY_RECONCILIATION_BY_ORDER_ID,
  GET_RELATED_INVOICES_FOR_CUSTOMER,
  INSERT_PAYMENT,
  UPDATE_INVOICE_PAID_AMOUNT,
  CREATE_INVOICE,
  INSERT_INVOICE_ITEM,
  GET_INVOICE_META_CUSTOMERS,
  GET_INVOICE_META_PRODUCTS,
  GET_INVOICE_META_ORDERS,
} from '../queries/invoice.query.js';

export const getInvoicesListRepo = async (statusFilter = null) => {
  let query = GET_ALL_INVOICES;
  const params = [];

  if (statusFilter === 'unpaid') {
    query = `
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
      WHERE inv.status IN ('draft', 'issued', 'partially_paid') AND inv.paid_amount < inv.grand_total
      ORDER BY inv.invoice_date DESC, inv.id DESC;
    `;
  } else if (statusFilter === 'paid') {
    query = `
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
      WHERE inv.status = 'paid' OR inv.paid_amount >= inv.grand_total
      ORDER BY inv.invoice_date DESC, inv.id DESC;
    `;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const [invoicesRes, statusCountsRes] = await Promise.all([
      client.query(query, params),
      client.query(GET_INVOICE_STATUS_COUNTS),
    ]);
    await client.query('COMMIT');

    return {
      invoices: invoicesRes.rows,
      statusCounts: statusCountsRes.rows[0] || {
        unpaid_count: 0,
        paid_count: 0,
        partially_paid_count: 0,
        total_count: 0,
      },
    };
  } catch (error) {
    console.error('Error in getInvoicesListRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getInvoiceMetaRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const [customersRes, productsRes, ordersRes] = await Promise.all([
      client.query(GET_INVOICE_META_CUSTOMERS),
      client.query(GET_INVOICE_META_PRODUCTS),
      client.query(GET_INVOICE_META_ORDERS),
    ]);
    await client.query('COMMIT');

    return {
      customers: customersRes.rows,
      products: productsRes.rows,
      orders: ordersRes.rows,
    };
  } catch (error) {
    console.error('Error in getInvoiceMetaRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getInvoiceDetailRepo = async (invoiceId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const invRes = await client.query(GET_INVOICE_BY_ID, [invoiceId]);
    if (invRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const invoice = invRes.rows[0];
    const orderId = invoice.order_id;
    const customerId = invoice.customer_id;

    const [itemsRes, paymentsRes, reconRes, relatedRes] = await Promise.all([
      client.query(GET_INVOICE_ITEMS_BY_INVOICE_ID, [invoiceId]),
      client.query(GET_PAYMENTS_BY_INVOICE_ID, [invoiceId]),
      orderId ? client.query(GET_DELIVERY_RECONCILIATION_BY_ORDER_ID, [orderId]) : { rows: [] },
      customerId ? client.query(GET_RELATED_INVOICES_FOR_CUSTOMER, [customerId]) : { rows: [] },
    ]);

    const items = itemsRes.rows;
    const payments = paymentsRes.rows;
    const deliveryReconciliation = reconRes.rows;
    const relatedInvoices = relatedRes.rows;

    // Calculate lifecycle progress state
    const isOrderConfirmed = Boolean(invoice.order_id || invoice.order_status === 'confirmed');
    const hasShipped = deliveryReconciliation.some((r) => r.shipped_qty > 0) || Boolean(invoice.order_id);
    const isInvoiced = true;
    const isPaid = invoice.status === 'paid' || parseFloat(invoice.paid_amount) >= parseFloat(invoice.grand_total);

    const lifecycle = {
      order_confirmed: { completed: isOrderConfirmed, current: isOrderConfirmed && !hasShipped },
      shipped: { completed: hasShipped, current: hasShipped && !isInvoiced },
      invoiced: { completed: isInvoiced, current: isInvoiced && !isPaid },
      paid: { completed: isPaid, current: isPaid },
    };

    await client.query('COMMIT');

    return {
      invoice,
      items,
      payments,
      deliveryReconciliation,
      relatedInvoices,
      lifecycle,
    };
  } catch (error) {
    console.error('Error in getInvoiceDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createInvoiceRepo = async ({
  customerId,
  orderId = null,
  dueDate = null,
  items = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Generate unique invoice number
    const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM invoices');
    const invCount = (countRes.rows[0]?.count || 0) + 1;
    const invoiceNumber = `INV-${String(invCount + 1040).padStart(4, '0')}`;

    // 2. Calculate line items totals
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = items.map((item) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_percentage) || 0;
      const itemSubtotal = qty * price;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;
      taxTotal += itemTax;

      return {
        ...item,
        quantity: qty,
        unit_price: price,
        tax_percentage: taxRate,
        tax_amount: itemTax,
        line_total: itemTotal,
      };
    });

    const grandTotal = subtotal + taxTotal;
    const targetDueDate = dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    // 3. Create invoice
    const invRes = await client.query(CREATE_INVOICE, [
      invoiceNumber,
      orderId || null,
      customerId,
      targetDueDate,
      subtotal,
      0, // discount_total
      taxTotal,
      grandTotal,
    ]);
    const createdInvoice = invRes.rows[0];

    // 4. Insert invoice items
    for (const it of processedItems) {
      await client.query(INSERT_INVOICE_ITEM, [
        createdInvoice.id,
        it.order_item_id || null,
        it.product_variant_id || null,
        it.product_name || 'Product Item',
        it.sku || null,
        it.quantity,
        it.unit_price,
        it.tax_percentage,
        it.tax_amount,
        it.line_total,
      ]);
    }

    await client.query('COMMIT');

    return await getInvoiceDetailRepo(createdInvoice.id);
  } catch (err) {
    console.error('Error in createInvoiceRepo:', err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const recordPaymentRepo = async ({
  invoiceId,
  amount,
  paymentMethod = 'bank_transfer',
  transactionReference = '',
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch invoice
    const invRes = await client.query(GET_INVOICE_BY_ID, [invoiceId]);
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const invoice = invRes.rows[0];

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      const err = new Error('Invalid payment amount');
      err.statusCode = 400;
      throw err;
    }

    // 2. Insert payment record
    const paymentRes = await client.query(INSERT_PAYMENT, [
      invoiceId,
      invoice.customer_id,
      paymentAmount,
      paymentMethod,
      transactionReference || `TXN-${Date.now()}`,
    ]);

    // 3. Update invoice paid amount and status
    const updatedInvRes = await client.query(UPDATE_INVOICE_PAID_AMOUNT, [
      invoiceId,
      paymentAmount,
    ]);

    await client.query('COMMIT');

    return {
      payment: paymentRes.rows[0],
      invoice: updatedInvRes.rows[0],
    };
  } catch (error) {
    console.error('Error in recordPaymentRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
