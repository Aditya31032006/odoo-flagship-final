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

  const [invoicesRes, statusCountsRes] = await Promise.all([
    pool.query(query, params),
    pool.query(GET_INVOICE_STATUS_COUNTS),
  ]);

  return {
    invoices: invoicesRes.rows,
    statusCounts: statusCountsRes.rows[0] || {
      unpaid_count: 0,
      paid_count: 0,
      partially_paid_count: 0,
      total_count: 0,
    },
  };
};

export const getInvoiceDetailRepo = async (invoiceId) => {
  const invRes = await pool.query(GET_INVOICE_BY_ID, [invoiceId]);
  if (invRes.rows.length === 0) {
    return null;
  }

  const invoice = invRes.rows[0];
  const orderId = invoice.order_id;
  const customerId = invoice.customer_id;

  const [itemsRes, paymentsRes, reconRes, relatedRes] = await Promise.all([
    pool.query(GET_INVOICE_ITEMS_BY_INVOICE_ID, [invoiceId]),
    pool.query(GET_PAYMENTS_BY_INVOICE_ID, [invoiceId]),
    orderId ? pool.query(GET_DELIVERY_RECONCILIATION_BY_ORDER_ID, [orderId]) : { rows: [] },
    customerId ? pool.query(GET_RELATED_INVOICES_FOR_CUSTOMER, [customerId]) : { rows: [] },
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

  return {
    invoice,
    items,
    payments,
    deliveryReconciliation,
    relatedInvoices,
    lifecycle,
  };
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
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
