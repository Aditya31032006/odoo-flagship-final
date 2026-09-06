import { pool } from '../config/database.js';
import {
  GET_QUOTATIONS_LIST,
  GET_QUOTATIONS_KANBAN_SUMMARY,
  GET_QUOTATION_BY_ID,
  GET_QUOTATION_ITEMS,
  COUNT_QUOTATIONS_TOTAL,
  CREATE_QUOTATION,
  UPDATE_QUOTATION,
  DELETE_QUOTATION_ITEMS,
  INSERT_QUOTATION_ITEM,
  DELETE_APPROVAL_STEPS_BY_QUOTATION_ID,
  DELETE_APPROVAL_REQUESTS_BY_QUOTATION_ID,
  CREATE_APPROVAL_REQUEST,
  CREATE_APPROVAL_STEP,
  INSERT_QUOTATION_AUDIT_LOG,
  CHECK_ORDER_EXISTS_FOR_QUOTATION,
  INSERT_CONFIRMED_ORDER,
  INSERT_CONFIRMED_ORDER_ITEM,
  CHECK_PRODUCT_VARIANT_IS_SUBSCRIPTION,
  INSERT_QUOTATION_FALLBACK_SUBSCRIPTION_PLAN,
  INSERT_QUOTATION_SUBSCRIPTION,
  INSERT_QUOTATION_SUBSCRIPTION_BILLING_LINE,
} from '../queries/quotation.query.js';
import { GET_ACTIVE_APPROVAL_RULES } from '../queries/catalog.query.js';
import { allocateStockGreedy } from './fulfillment.repository.js';

export const getQuotationsListRepo = async ({ salesRepId = null, customerId = null, status = null, searchQuery = null, role = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_QUOTATIONS_LIST, [
      salesRepId,
      status || null,
      searchQuery || null,
      customerId || null,
      role || null,
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

export const getQuotationsKanbanSummaryRepo = async ({ salesRepId = null, customerId = null, role = null } = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_QUOTATIONS_KANBAN_SUMMARY, [
      salesRepId || null,
      customerId || null,
      role || null,
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
  const countRes = await client.query(COUNT_QUOTATIONS_TOTAL);
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
  status = 'pending_approval',
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

    // Compute exact risk score and level from excess discount:
    // 0 pt excess: low risk (auto-approved)
    // 0.01 to 5.00 pt excess: medium risk (Sales Manager only)
    // > 5.00 pt excess: high risk (Sales Manager + Finance)
    const maxExcess = items.reduce((max, it) => Math.max(max, Number(it.excess_discount_percentage) || 0), 0);
    const effectiveRiskScore = maxExcess > 0 ? Number(maxExcess.toFixed(2)) : Number(blended_risk_score || 0);
    const effectiveRiskLevel = effectiveRiskScore > 5.00 ? 'high' : (effectiveRiskScore > 0 ? 'medium' : 'low');

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
        effectiveRiskScore,
        effectiveRiskLevel,
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
        effectiveRiskScore,
        effectiveRiskLevel,
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
      // Fetch active approval rules matching risk score
      const rulesRes = await client.query(GET_ACTIVE_APPROVAL_RULES);
      const rules = rulesRes.rows;

      const matchingRule = rules.find((r) => {
        const min = Number(r.min_risk_score);
        const max = r.max_risk_score != null ? Number(r.max_risk_score) : Infinity;
        const score = Number(effectiveRiskScore || 0);
        return score >= min && score <= max;
      }) || { requires_sales_manager: false, requires_finance: false };

      if (!matchingRule.requires_sales_manager && !matchingRule.requires_finance && Number(effectiveRiskScore || 0) <= 0) {
        // Auto-approve directly
        await client.query("UPDATE quotations SET status = 'approved'::quotation_status_enum, updated_at = NOW() WHERE id = $1", [quotation.id]);
        await client.query(INSERT_QUOTATION_AUDIT_LOG, [
          quotation.id,
          effectiveUserId,
          'approved',
          'Auto-approved by system: discounts are within allowed customer tier and category limits.',
          {},
        ]);
        quotation.status = 'approved';
      } else {
        await client.query(DELETE_APPROVAL_STEPS_BY_QUOTATION_ID, [quotation.id]);
        await client.query(DELETE_APPROVAL_REQUESTS_BY_QUOTATION_ID, [quotation.id]);

        const appReqRes = await client.query(CREATE_APPROVAL_REQUEST, [
          quotation.id,
          effectiveUserId,
        ]);
        const approvalRequest = appReqRes.rows[0];

        let stepNum = 1;
        if (matchingRule.requires_sales_manager) {
          await client.query(CREATE_APPROVAL_STEP, [approvalRequest.id, stepNum++, 'sales_manager']);
        }
        if (matchingRule.requires_finance) {
          await client.query(CREATE_APPROVAL_STEP, [approvalRequest.id, stepNum++, 'finance']);
        }
      }
    }

    // If confirmed, automatically ensure order and order items are generated with greedy stock deduction
    if (status === 'confirmed') {
      const existingOrder = await client.query(CHECK_ORDER_EXISTS_FOR_QUOTATION, [quotation.id]);
      if (existingOrder.rows.length === 0) {
        const countRes = await client.query(COUNT_QUOTATIONS_TOTAL);
        const orderCount = (countRes.rows[0]?.count || 0) + 1;
        const year = new Date().getFullYear();
        const orderNumber = `ORD-${year}-${String(orderCount).padStart(4, '0')}`;

        const orderRes = await client.query(INSERT_CONFIRMED_ORDER, [orderNumber, quotation.id, customer_id]);
        const createdOrderId = orderRes.rows[0].id;

        for (const insertedItem of insertedItems) {
          let isSub = false;
          let subscriptionPlanId = null;
          let subscriptionCycle = 'monthly';
          let productId = null;

          if (insertedItem.product_variant_id) {
            const prodCheck = await client.query(CHECK_PRODUCT_VARIANT_IS_SUBSCRIPTION, [insertedItem.product_variant_id]);

            if (prodCheck.rows.length > 0) {
              const pRow = prodCheck.rows[0];
              productId = pRow.product_id;
              subscriptionPlanId = pRow.plan_id;
              subscriptionCycle = pRow.billing_cycle || 'monthly';
              const pUnit = (pRow.unit || '').toLowerCase();
              const pName = (pRow.product_name || '').toLowerCase();

              if (
                pUnit === 'recurring' ||
                subscriptionPlanId != null ||
                pName.includes('plan') ||
                pName.includes('subscription') ||
                pName.includes('recurring') ||
                pName.includes('sla') ||
                pName.includes('service') ||
                pName.includes('amc') ||
                pName.includes('care')
              ) {
                isSub = true;
              }
            }
          }

          if (!isSub && insertedItem.product_name_snapshot) {
            const snapName = insertedItem.product_name_snapshot.toLowerCase();
            if (
              snapName.includes('plan') ||
              snapName.includes('subscription') ||
              snapName.includes('recurring') ||
              snapName.includes('sla') ||
              snapName.includes('service') ||
              snapName.includes('amc') ||
              snapName.includes('care')
            ) {
              isSub = true;
            }
          }

          const lineType = isSub ? 'subscription' : 'one_time';

          const oiRes = await client.query(INSERT_CONFIRMED_ORDER_ITEM, [
            createdOrderId,
            insertedItem.id,
            insertedItem.product_variant_id,
            lineType,
            insertedItem.product_name_snapshot,
            insertedItem.sku_snapshot,
            insertedItem.quantity,
            insertedItem.unit_price,
            insertedItem.discount_percentage || 0,
            insertedItem.discount_amount || 0,
            insertedItem.tax_percentage || 0,
            insertedItem.tax_amount || 0,
            insertedItem.line_total,
          ]);
          const orderItemId = oiRes.rows[0].id;

          if (isSub) {
            if (!subscriptionPlanId) {
              const newPlan = await client.query(INSERT_QUOTATION_FALLBACK_SUBSCRIPTION_PLAN, [
                productId || 1,
                insertedItem.product_name_snapshot || 'Subscription Plan',
                insertedItem.unit_price,
              ]);
              subscriptionPlanId = newPlan.rows[0].id;
              subscriptionCycle = newPlan.rows[0].billing_cycle || 'monthly';
            }

            const subRes = await client.query(INSERT_QUOTATION_SUBSCRIPTION, [
              orderItemId,
              customer_id,
              subscriptionPlanId,
              insertedItem.quantity,
              insertedItem.unit_price,
              subscriptionCycle,
            ]);
            const newSubId = subRes.rows[0].id;

            await client.query(INSERT_QUOTATION_SUBSCRIPTION_BILLING_LINE, [newSubId, insertedItem.line_total]);
          } else if (insertedItem.product_variant_id) {
            await allocateStockGreedy(client, createdOrderId, orderItemId, insertedItem.product_variant_id, insertedItem.quantity);
          }
        }
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
