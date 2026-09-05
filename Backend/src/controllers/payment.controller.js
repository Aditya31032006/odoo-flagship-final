import {
  createQuotationRazorpayOrder,
  verifyAndSettleQuotationPayment,
} from '../services/payment.service.js';

/**
 * Controller to create a Razorpay Order for a quotation
 * POST /api/payments/razorpay/create-order
 */
export const createRazorpayOrderController = async (req, res, next) => {
  try {
    const { quotation_id } = req.body;

    if (!quotation_id) {
      return res.status(400).json({
        success: false,
        message: 'quotation_id is required to create a payment order.',
      });
    }

    const orderData = await createQuotationRazorpayOrder(quotation_id, req.user);

    return res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully.',
      data: orderData,
    });
  } catch (error) {
    console.error('Error in createRazorpayOrderController:', error);
    next(error);
  }
};

/**
 * Controller to verify Razorpay Payment signature and settle transaction
 * POST /api/payments/razorpay/verify-payment
 */
export const verifyRazorpayPaymentController = async (req, res, next) => {
  try {
    const { quotation_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!quotation_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment verification parameters.',
      });
    }

    const result = await verifyAndSettleQuotationPayment({
      quotation_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error('Error in verifyRazorpayPaymentController:', error);
    next(error);
  }
};
