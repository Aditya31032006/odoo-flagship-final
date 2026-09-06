/**
 * Utilities for generating collision-free sequential business document numbers.
 * Uses MAX sequence extraction instead of COUNT(*) to prevent collisions when gaps exist.
 */

export async function generateOrderNumber(client) {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const res = await client.query(
    `SELECT order_number FROM orders WHERE order_number LIKE $1 ORDER BY id DESC`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of res.rows) {
    const numPart = row.order_number?.replace(prefix, '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }
  let nextSeq = Math.max(maxSeq, res.rows.length) + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  while (true) {
    const check = await client.query('SELECT 1 FROM orders WHERE order_number = $1', [candidate]);
    if (check.rows.length === 0) break;
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}

export async function generateQuotationNumber(client) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const res = await client.query(
    `SELECT quotation_number FROM quotations WHERE quotation_number LIKE $1 ORDER BY id DESC`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of res.rows) {
    const numPart = row.quotation_number?.replace(prefix, '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }
  let nextSeq = Math.max(maxSeq, res.rows.length) + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  while (true) {
    const check = await client.query('SELECT 1 FROM quotations WHERE quotation_number = $1', [candidate]);
    if (check.rows.length === 0) break;
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}

export async function generateInvoiceNumber(client) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const res = await client.query(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY id DESC`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of res.rows) {
    const numPart = row.invoice_number?.replace(prefix, '');
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }
  let nextSeq = Math.max(maxSeq, res.rows.length) + 1;
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  while (true) {
    const check = await client.query('SELECT 1 FROM invoices WHERE invoice_number = $1', [candidate]);
    if (check.rows.length === 0) break;
    nextSeq++;
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
}
