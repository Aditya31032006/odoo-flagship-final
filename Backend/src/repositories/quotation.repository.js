import { pool } from '../config/database.js';
import {
  GET_QUOTATIONS_LIST,
  GET_QUOTATIONS_KANBAN_SUMMARY,
  GET_QUOTATION_BY_ID,
  GET_QUOTATION_ITEMS,
  CREATE_QUOTATION,
  UPDATE_QUOTATION,
  DELETE_QUOTATION_ITEMS,
  INSERT_QUOTATION_ITEM,
  CREATE_APPROVAL_REQUEST,
  CREATE_APPROVAL_STEP,
  INSERT_QUOTATION_AUDIT_LOG,
} from '../queries/quotation.query.js';
import { GET_ACTIVE_APPROVAL_RULES } from '../queries/catalog.query.js';

export const getQuotationsListRepo = async ({ salesRepId = null, customerId = null, status = null, searchQuery = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_QUOTATIONS_LIST, [
      salesRepId,
      status || null,
      searchQuery || null,
      customerId || null,
    ]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getQuotationsListRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getQuotationsKanbanSummaryRepo = async ({ salesRepId = null, customerId = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_QUOTATIONS_KANBAN_SUMMARY, [
      salesRepId || null,
      customerId || null,
    ]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getQuotationsKanbanSummaryRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getQuotationFullDetailRepo = async (quotationId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const headerRes = await client.query(GET_QUOTATION_BY_ID, [quotationId]);
    if (headerRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const itemsRes = await client.query(GET_QUOTATION_ITEMS, [quotationId]);
    await client.query('COMMIT');

    return {
      ...headerRes.rows[0],
      items: itemsRes.rows,
    };
  } catch (error) {
    console.error('Error in getQuotationFullDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generate unique quotation number
 */
async function generateQuotationNumber(client) {
  const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM quotations');
  const count = (countRes.rows[0]?.count || 0) + 1;
  const year = new Date().getFullYear();
  return `QT-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Save or update quotation with items in a PostgreSQL transaction
 */
export const saveQuotationRepo = async ({
  id = null,
  customer_id,
  sales_rep_id,
  tier_id,
  price_list_id,
  status = 'draft',
  blended_risk_score = 0,
  risk_level = 'low',
  subtotal = 0,
  discount_total = 0,
  tax_total = 0,
  grand_total = 0,
  valid_until = null,
  items = [],
  action_reason = null,
  user_id,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let quotation;
    let actionType = 'created';

    if (id) {
      // Update existing quotation
      const updateRes = await client.query(UPDATE_QUOTATION, [
        id,
        customer_id,
        tier_id,
        price_list_id,
        status,
        blended_risk_score,
        risk_level,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        valid_until,
      ]);
      quotation = updateRes.rows[0];
      actionType = status === 'pending_approval' ? 'submitted' : 'edited';

      // Remove existing line items to re-insert
      await client.query(DELETE_QUOTATION_ITEMS, [id]);
    } else {
      // Create new quotation
      const quoteNumber = await generateQuotationNumber(client);
      const insertRes = await client.query(CREATE_QUOTATION, [
        quoteNumber,
        customer_id,
        sales_rep_id || user_id,
        tier_id,
        price_list_id,
        status,
        blended_risk_score,
        risk_level,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        valid_until,
      ]);
      quotation = insertRes.rows[0];
      actionType = status === 'pending_approval' ? 'submitted' : 'created';
    }

    // Insert line items
    const insertedItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const listPrice = item.list_price != null ? Number(item.list_price) : Number(item.unit_price || 0);
      const unitPrice = item.unit_price != null ? Number(item.unit_price) : listPrice;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const discountPct = Number(item.discount_percentage) || 0;
      const discountAmt = item.discount_amount != null ? Number(item.discount_amount) : Number(((unitPrice * qty) * (discountPct / 100)).toFixed(2));
      const taxPct = Number(item.tax_percentage) || 0;
      const taxable = Math.max(0, (unitPrice * qty) - discountAmt);
      const taxAmt = item.tax_amount != null ? Number(item.tax_amount) : Number((taxable * (taxPct / 100)).toFixed(2));
      const lineTotal = item.line_total != null ? Number(item.line_total) : Number((taxable + taxAmt).toFixed(2));

      const itemRes = await client.query(INSERT_QUOTATION_ITEM, [
        quotation.id,
        item.product_variant_id,
        i + 1, // line_number
        item.product_name_snapshot || item.product_name || 'Product',
        item.sku_snapshot || item.sku || null,
        qty,
        listPrice,
        unitPrice,
        discountPct,
        discountAmt,
        taxPct,
        taxAmt,
        item.allowed_discount_percentage != null ? Number(item.allowed_discount_percentage) : null,
        item.excess_discount_percentage != null ? Number(item.excess_discount_percentage) : 0,
        lineTotal,
        Boolean(item.is_upsell),
      ]);
      insertedItems.push(itemRes.rows[0]);
    }

    // If submitted for approval, evaluate approval rules and create approval steps
    const effectiveUserId = user_id || sales_rep_id || quotation?.sales_rep_id || 1;

    if (status === 'pending_approval') {
      await client.query('DELETE FROM approval_steps WHERE approval_request_id IN (SELECT id FROM approval_requests WHERE quotation_id = $1)', [quotation.id]);
      await client.query('DELETE FROM approval_requests WHERE quotation_id = $1', [quotation.id]);

      const appReqRes = await client.query(CREATE_APPROVAL_REQUEST, [
        quotation.id,
        effectiveUserId,
      ]);
      const approvalRequest = appReqRes.rows[0];

      // Fetch active approval rules matching risk score
      const rulesRes = await client.query(GET_ACTIVE_APPROVAL_RULES);
      const rules = rulesRes.rows;

      const matchingRule = rules.find((r) => {
        const min = Number(r.min_risk_score);
        const max = r.max_risk_score != null ? Number(r.max_risk_score) : Infinity;
        const score = Number(blended_risk_score);
        return score >= min && score <= max;
      }) || { requires_sales_manager: true, requires_finance: false };

      let stepNum = 1;
      if (matchingRule.requires_sales_manager) {
        await client.query(CREATE_APPROVAL_STEP, [approvalRequest.id, stepNum++, 'sales_manager']);
      }
      if (matchingRule.requires_finance) {
        await client.query(CREATE_APPROVAL_STEP, [approvalRequest.id, stepNum++, 'finance']);
      }
    }

    // Record in quotation audit log
    await client.query(INSERT_QUOTATION_AUDIT_LOG, [
      quotation.id,
      effectiveUserId,
      actionType,
      action_reason || (status === 'pending_approval' ? 'Submitted for approval' : 'Saved quotation draft'),
      JSON.stringify({
        grand_total,
        status,
        blended_risk_score,
        risk_level,
        item_count: items.length,
      }),
    ]);

    await client.query('COMMIT');

    return {
      ...quotation,
      items: insertedItems,
    };
  } catch (error) {
    console.error('Error in saveQuotationRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
