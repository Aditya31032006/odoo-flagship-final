import { pool } from '../config/database.js';
import {
  GET_ACTIVE_NEGOTIATION,
  GET_NEGOTIATION_MESSAGES,
  CREATE_NEGOTIATION,
  UPDATE_NEGOTIATION_COUNTER,
  INSERT_NEGOTIATION_MESSAGE,
  UPDATE_QUOTATION_STATUS,
  CREATE_ORDER_FROM_QUOTATION,
} from '../queries/negotiation.query.js';
import { GET_QUOTATION_BY_ID } from '../queries/quotation.query.js';

/**
 * Fetch full negotiation thread with history of messages for a quotation
 */
export const getNegotiationWithMessagesRepo = async (quotationId) => {
  const client = await pool.connect();
  try {
    const negRes = await client.query(GET_ACTIVE_NEGOTIATION, [quotationId]);
    if (negRes.rows.length === 0) {
      return null;
    }

    const negotiation = negRes.rows[0];
    const messagesRes = await client.query(GET_NEGOTIATION_MESSAGES, [negotiation.id]);

    return {
      ...negotiation,
      messages: messagesRes.rows,
    };
  } finally {
    client.release();
  }
};

/**
 * Submit or update a counter-offer with optional commentary
 */
export const submitCounterOfferRepo = async ({
  quotationId,
  counterDiscount,
  requestedDeliveryDate,
  userId,
  userRole,
  message,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check existing negotiation session
    const existingNeg = await client.query(GET_ACTIVE_NEGOTIATION, [quotationId]);
    let negotiation;

    if (existingNeg.rows.length > 0) {
      const updateRes = await client.query(UPDATE_NEGOTIATION_COUNTER, [
        counterDiscount !== undefined ? counterDiscount : existingNeg.rows[0].counter_discount_percentage,
        requestedDeliveryDate || existingNeg.rows[0].requested_delivery_date,
        'countered',
        existingNeg.rows[0].id,
      ]);
      negotiation = updateRes.rows[0];
    } else {
      const createRes = await client.query(CREATE_NEGOTIATION, [
        quotationId,
        'countered',
        counterDiscount || null,
        requestedDeliveryDate || null,
        userId,
      ]);
      negotiation = createRes.rows[0];
    }

    // 2. Transition quotation status to 'negotiating'
    await client.query(UPDATE_QUOTATION_STATUS, ['negotiating', quotationId]);

    // 3. Add message to thread if commentary provided
    const senderType = userRole === 'customer' ? 'customer' : 'sales_rep';
    if (message && message.trim()) {
      await client.query(INSERT_NEGOTIATION_MESSAGE, [
        negotiation.id,
        null, // General deal level message
        userId,
        senderType,
        message.trim(),
      ]);
    }

    await client.query('COMMIT');

    // Return complete updated thread
    return await getNegotiationWithMessagesRepo(quotationId);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in submitCounterOfferRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Append a negotiation message (general or tagged to a specific line item)
 */
export const addNegotiationMessageRepo = async ({
  quotationId,
  quotationItemId = null,
  userId,
  userRole,
  message,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure negotiation thread exists
    let negRes = await client.query(GET_ACTIVE_NEGOTIATION, [quotationId]);
    let negotiation;

    if (negRes.rows.length === 0) {
      const createRes = await client.query(CREATE_NEGOTIATION, [
        quotationId,
        'open',
        null,
        null,
        userId,
      ]);
      negotiation = createRes.rows[0];
    } else {
      negotiation = negRes.rows[0];
    }

    // 2. Insert message
    const senderType = userRole === 'customer' ? 'customer' : 'sales_rep';
    await client.query(INSERT_NEGOTIATION_MESSAGE, [
      negotiation.id,
      quotationItemId || null,
      userId,
      senderType,
      message.trim(),
    ]);

    // 3. Ensure quotation status reflects active negotiation
    const quoteRes = await client.query(GET_QUOTATION_BY_ID, [quotationId]);
    if (quoteRes.rows.length > 0 && ['sent', 'approved', 'draft'].includes(quoteRes.rows[0].status)) {
      await client.query(UPDATE_QUOTATION_STATUS, ['negotiating', quotationId]);
    }

    await client.query('COMMIT');

    return await getNegotiationWithMessagesRepo(quotationId);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in addNegotiationMessageRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Accept quotation terms, mark as confirmed, and create an order
 */
export const acceptQuotationTermsRepo = async ({ quotationId, userId, userRole }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quoteRes = await client.query(GET_QUOTATION_BY_ID, [quotationId]);
    if (quoteRes.rows.length === 0) {
      throw new Error('Quotation not found');
    }
    const quotation = quoteRes.rows[0];

    // 1. Update quotation status to 'confirmed'
    const updatedQuoteRes = await client.query(UPDATE_QUOTATION_STATUS, ['confirmed', quotationId]);

    // 2. Update negotiation record if active
    const negRes = await client.query(GET_ACTIVE_NEGOTIATION, [quotationId]);
    if (negRes.rows.length > 0) {
      await client.query(
        "UPDATE quotation_negotiations SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [negRes.rows[0].id]
      );
    }

    // 3. Generate unique order number
    const countRes = await client.query('SELECT COUNT(*)::INT AS count FROM orders');
    const orderCount = (countRes.rows[0]?.count || 0) + 1;
    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${String(orderCount).padStart(4, '0')}`;

    // 4. Create confirmed order
    const orderRes = await client.query(CREATE_ORDER_FROM_QUOTATION, [
      orderNumber,
      quotationId,
      quotation.customer_id,
    ]);
    const createdOrder = orderRes.rows[0];

    // 5. Transfer quotation items to order_items and generate subscription records
    const qItemsRes = await client.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY line_number ASC', [quotationId]);
    for (const item of qItemsRes.rows) {
      // Determine if item is subscription
      const isSub = item.product_name_snapshot && (
        item.product_name_snapshot.toLowerCase().includes('plan') ||
        item.product_name_snapshot.toLowerCase().includes('sla') ||
        item.product_name_snapshot.toLowerCase().includes('subscription') ||
        item.product_name_snapshot.toLowerCase().includes('amc') ||
        item.product_name_snapshot.toLowerCase().includes('care')
      );
      const lineType = isSub ? 'subscription' : 'one_time';

      const oiRes = await client.query(`
        INSERT INTO order_items (
          order_id, quotation_item_id, product_variant_id, line_type,
          product_name_snapshot, sku_snapshot, quantity, unit_price,
          discount_percentage, discount_amount, tax_percentage, tax_amount, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        createdOrder.id,
        item.id,
        item.product_variant_id,
        lineType,
        item.product_name_snapshot,
        item.sku_snapshot,
        item.quantity,
        item.unit_price,
        item.discount_percentage || 0,
        item.discount_amount || 0,
        item.tax_percentage || 0,
        item.tax_amount || 0,
        item.line_total,
      ]);
      const orderItemId = oiRes.rows[0].id;

      // If subscription line item, automatically generate subscription & schedule
      if (isSub) {
        // Find product ID from variant
        const pvRes = await client.query('SELECT product_id FROM product_variants WHERE id = $1', [item.product_variant_id]);
        const productId = pvRes.rows[0]?.product_id || null;

        // Find or create subscription plan
        let planRes = await client.query(`SELECT id, billing_cycle, price FROM subscription_plans WHERE name ILIKE $1 LIMIT 1`, [item.product_name_snapshot]);
        let planId = planRes.rows[0]?.id;
        let billingCycle = planRes.rows[0]?.billing_cycle || 'monthly';

        if (!planId) {
          const newPlan = await client.query(`
            INSERT INTO subscription_plans (product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund)
            VALUES ($1, $2, 'monthly', $3, true, true, true)
            RETURNING id, billing_cycle
          `, [productId || 1, item.product_name_snapshot, item.unit_price]);
          planId = newPlan.rows[0].id;
          billingCycle = newPlan.rows[0].billing_cycle;
        }

        const subRes = await client.query(`
          INSERT INTO subscriptions (
            order_item_id, customer_id, subscription_plan_id, quantity, unit_price,
            billing_cycle, start_date, status
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'active')
          RETURNING id
        `, [orderItemId, quotation.customer_id, planId, item.quantity, item.unit_price, billingCycle]);
        const newSubId = subRes.rows[0].id;

        // Insert initial billing schedule
        await client.query(`
          INSERT INTO subscription_billing_lines (
            subscription_id, billing_period_start, billing_period_end, amount, is_prorated
          ) VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', $2, false)
        `, [newSubId, item.line_total]);
      }
    }

    await client.query('COMMIT');

    return {
      quotation: updatedQuoteRes.rows[0],
      order: createdOrder,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in acceptQuotationTermsRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};
