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

export const getQuotationsListRepo = async ({ salesRepId = null, status = null, searchQuery = null } = {}) => {
  const result = await pool.query(GET_QUOTATIONS_LIST, [
    salesRepId,
    status || null,
    searchQuery || null,
  ]);
  return result.rows;
};

export const getQuotationsKanbanSummaryRepo = async (salesRepId = null) => {
  const result = await pool.query(GET_QUOTATIONS_KANBAN_SUMMARY, [salesRepId]);
  return result.rows;
};

export const getQuotationFullDetailRepo = async (quotationId) => {
  const headerRes = await pool.query(GET_QUOTATION_BY_ID, [quotationId]);
  if (headerRes.rows.length === 0) return null;

  const itemsRes = await pool.query(GET_QUOTATION_ITEMS, [quotationId]);

  return {
    ...headerRes.rows[0],
    items: itemsRes.rows,
  };
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
      const itemRes = await client.query(INSERT_QUOTATION_ITEM, [
        quotation.id,
        item.product_variant_id,
        i + 1, // line_number
        item.product_name_snapshot || item.product_name,
        item.sku_snapshot || item.sku,
        item.quantity,
        item.list_price,
        item.unit_price,
        item.discount_percentage || 0,
        item.discount_amount || 0,
        item.tax_percentage || 0,
        item.tax_amount || 0,
        item.allowed_discount_percentage || null,
        item.excess_discount_percentage || 0,
        item.line_total,
        Boolean(item.is_upsell),
      ]);
      insertedItems.push(itemRes.rows[0]);
    }

    // If submitted for approval, evaluate approval rules and create approval steps
    if (status === 'pending_approval') {
      const appReqRes = await client.query(CREATE_APPROVAL_REQUEST, [
        quotation.id,
        user_id,
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
      user_id,
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
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
