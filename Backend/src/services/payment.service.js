import crypto from 'crypto';
import { pool } from '../config/database.js';
import { getRazorpayInstance, getRazorpayKeyId, getRazorpayKeySecret } from '../config/razorpay.config.js';
import { GET_QUOTATION_WITH_CUSTOMER_FOR_PAYMENT } from '../queries/fulfillment.query.js';
import { payQuotationRepo } from '../repositories/fulfillment.repository.js';

/**
 * Service to create a Razorpay Order for a Quotation
 */
export const createQuotationRazorpayOrder = async (quotationId, user = {}) => {
  const client = await pool.connect();
  try {
    const quoteRes = await client.query(GET_QUOTATION_WITH_CUSTOMER_FOR_PAYMENT, [quotationId]);
    if (quoteRes.rows.length === 0) {
      const err = new Error('Quotation not found.');
      err.status = 404;
      throw err;
    }

    const quotation = quoteRes.rows[0];

    // Authorization check: if user is customer, ensure customer_id matches
    if (user.role === 'customer' && user.customer_id && String(quotation.customer_id) !== String(user.customer_id)) {
      const err = new Error('Unauthorized to pay for this quotation.');
      err.status = 403;
      throw err;
    }

    const grandTotal = parseFloat(quotation.grand_total) || 0;
    if (grandTotal <= 0) {
      const err = new Error('Quotation grand total must be greater than zero.');
      err.status = 400;
      throw err;
    }

    // Razorpay requires amount in the smallest currency sub-unit (paise for INR)
    const amountInPaise = Math.round(grandTotal * 100);
    const receiptId = `rcpt_q_${quotationId}_${Date.now().toString().slice(-6)}`;

    const razorpay = getRazorpayInstance();
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        quotation_id: String(quotation.id),
        quotation_number: quotation.quotation_number || `QT-${quotation.id}`,
        customer_id: String(quotation.customer_id),
        company_name: quotation.company_name || '',
      },
    };

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create(orderOptions);
    } catch (rzpErr) {
      console.error('Razorpay order creation failed:', rzpErr);
      throw new Error(`Razorpay gateway error: ${rzpErr.error?.description || rzpErr.message}`);
    }

    return {
      order_id: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      amount_formatted: grandTotal, // in INR
      currency: rzpOrder.currency || 'INR',
      key_id: getRazorpayKeyId(),
      quotation_id: quotation.id,
      quotation_number: quotation.quotation_number,
      customer: {
        name: quotation.company_name || user.name || 'Customer',
        email: user.email || '',
        contact: user.mobile || '',
      },
    };
  } finally {
    client.release();
  }
};

/**
 * Service to verify Razorpay Signature
 */
export const verifyRazorpaySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', getRazorpayKeySecret())
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return generatedSignature === razorpay_signature;
};

/**
 * Service to verify signature and finalize payment in DB
 */
export const verifyAndSettleQuotationPayment = async ({
  quotation_id,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  user = {},
}) => {
  // 1. Verify cryptographic HMAC signature
  const isSignatureValid = verifyRazorpaySignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isSignatureValid) {
    const err = new Error('Invalid payment signature. Payment verification failed.');
    err.status = 400;
    throw err;
  }

  // 2. Settle quotation, generate/mark invoice paid, update order status to fulfilled
  const settlementResult = await payQuotationRepo({
    quotationId: quotation_id,
    paymentMethod: 'online',
    transactionReference: razorpay_payment_id,
  });

  return {
    success: true,
    message: 'Payment verified and settled successfully via Razorpay.',
    razorpay_payment_id,
    razorpay_order_id,
    ...settlementResult,
  };
};
