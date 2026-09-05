import { pool } from '../config/database.js';
import {
  GET_ACTIVE_NEGOTIATION,
  GET_NEGOTIATION_MESSAGES,
  CREATE_NEGOTIATION,
  UPDATE_NEGOTIATION_COUNTER,
  INSERT_NEGOTIATION_MESSAGE,
  UPDATE_QUOTATION_STATUS,
  CREATE_ORDER_FROM_QUOTATION,
  UPDATE_NEGOTIATION_STATUS_ACCEPTED,
  COUNT_ORDERS_TOTAL,
  GET_QUOTATION_ITEMS_ORDERED_BY_LINE,
  INSERT_ORDER_ITEM_FROM_QUOTATION,
  GET_PRODUCT_ID_FROM_VARIANT,
  FIND_SUBSCRIPTION_PLAN_BY_NAME,
  INSERT_DEFAULT_SUBSCRIPTION_PLAN,
  INSERT_SUBSCRIPTION_FROM_ORDER,
  INSERT_INITIAL_SUBSCRIPTION_BILLING_LINE,
  CHECK_NEGOTIATION_PRODUCT_VARIANT_IS_SUBSCRIPTION,
  INSERT_NEGOTIATION_FALLBACK_SUBSCRIPTION_PLAN,
} from '../queries/negotiation.query.js';
import { GET_QUOTATION_BY_ID } from '../queries/quotation.query.js';
import { allocateStockGreedy } from './fulfillment.repository.js';

/**
 * Fetch full negotiation thread with history of messages for a quotation
 */
export const getNegotiationWithMessagesRepo = async (quotationId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const negRes = await client.query(GET_ACTIVE_NEGOTIATION, [quotationId]);
    if (negRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const negotiation = negRes.rows[0];
    const messagesRes = await client.query(GET_NEGOTIATION_MESSAGES, [negotiation.id]);
    await client.query('COMMIT');

    return {
      ...negotiation,
      messages: messagesRes.rows,
    };
  } catch (error) {
    console.error('Error in getNegotiationWithMessagesRepo:', error);
    await client.query('ROLLBACK');
    throw error;
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
    console.error('Error in submitCounterOfferRepo:', error);
    await client.query('ROLLBACK');
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
    console.error('Error in addNegotiationMessageRepo:', error);
    await client.query('ROLLBACK');
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
      await client.query(UPDATE_NEGOTIATION_STATUS_ACCEPTED, [negRes.rows[0].id]);
    }

    // 3. Generate unique order number
    const countRes = await client.query(COUNT_ORDERS_TOTAL);
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
    const qItemsRes = await client.query(GET_QUOTATION_ITEMS_ORDERED_BY_LINE, [quotationId]);
    for (const item of qItemsRes.rows) {
      let isSub = false;
      let subscriptionPlanId = null;
      let subscriptionCycle = 'monthly';
      let productId = null;

      if (item.product_variant_id) {
        const prodCheck = await client.query(CHECK_NEGOTIATION_PRODUCT_VARIANT_IS_SUBSCRIPTION, [item.product_variant_id]);

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

      if (!isSub && item.product_name_snapshot) {
        const snapName = item.product_name_snapshot.toLowerCase();
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

      const oiRes = await client.query(INSERT_ORDER_ITEM_FROM_QUOTATION, [
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
        if (!subscriptionPlanId) {
          const newPlan = await client.query(INSERT_NEGOTIATION_FALLBACK_SUBSCRIPTION_PLAN, [
            productId || 1,
            item.product_name_snapshot || 'Subscription Plan',
            item.unit_price,
          ]);
          subscriptionPlanId = newPlan.rows[0].id;
          subscriptionCycle = newPlan.rows[0].billing_cycle || 'monthly';
        }

        const subRes = await client.query(INSERT_SUBSCRIPTION_FROM_ORDER, [
          orderItemId,
          quotation.customer_id,
          subscriptionPlanId,
          item.quantity,
          item.unit_price,
          subscriptionCycle,
        ]);
        const newSubId = subRes.rows[0].id;

        // Insert initial billing schedule
        await client.query(INSERT_INITIAL_SUBSCRIPTION_BILLING_LINE, [newSubId, item.line_total]);
      }
      // 6. Greedy multi-warehouse stock allocation for physical items
      if (!isSub && item.product_variant_id) {
        try {
          await allocateStockGreedy(client, createdOrder.id, orderItemId, item.product_variant_id, item.quantity);
        } catch (allocErr) {
          console.warn('Stock allocation warning (non-fatal):', allocErr.message);
        }
      }
    }

    await client.query('COMMIT');

    return {
      quotation: updatedQuoteRes.rows[0],
      order: createdOrder,
    };
  } catch (error) {
    console.error('Error in acceptQuotationTermsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
