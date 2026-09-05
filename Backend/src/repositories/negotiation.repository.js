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

    await client.query('COMMIT');

    return {
      quotation: updatedQuoteRes.rows[0],
      order: orderRes.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in acceptQuotationTermsRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};
