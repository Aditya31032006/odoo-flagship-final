import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  getNegotiationWithMessagesRepo,
  submitCounterOfferRepo,
  addNegotiationMessageRepo,
  acceptQuotationTermsRepo,
} from '../repositories/negotiation.repository.js';
import { getQuotationFullDetailRepo } from '../repositories/quotation.repository.js';
import { getCustomerNotificationContactRepo } from '../repositories/auth.repository.js';
import { addCounterOfferEmailJob, addQuotationApprovedEmailJob } from '../jobs/emailQueue.js';
import { resolveUserCustomerId } from './quotation.controller.js';
import { signToken } from '../utils/cookie.util.js';


/**
 * Get active negotiation and message thread for a quotation
 */
export const getNegotiationController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;
    const user = req.user;

    const quotation = await getQuotationFullDetailRepo(quotationId);
    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (user.role === 'customer') {
      const userCustId = await resolveUserCustomerId(user);
      if (String(quotation.customer_id) !== String(userCustId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only view negotiations for your own organization.',
        });
      }
    }

    const negotiation = await getNegotiationWithMessagesRepo(quotationId);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: negotiation || {
        quotation_id: Number(quotationId),
        status: 'open',
        counter_discount_percentage: null,
        requested_delivery_date: null,
        messages: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit or revise counter-offer (discount % or requested delivery date)
 */
export const submitCounterOfferController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;
    const { counter_discount_percentage, requested_delivery_date, message } = req.body;
    const user = req.user;

    const quotation = await getQuotationFullDetailRepo(quotationId);
    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (user.role === 'customer') {
      const userCustId = await resolveUserCustomerId(user);
      if (String(quotation.customer_id) !== String(userCustId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only submit offers for your own organization.',
        });
      }
    }

    if (
      counter_discount_percentage !== undefined &&
      (isNaN(Number(counter_discount_percentage)) || Number(counter_discount_percentage) < 0 || Number(counter_discount_percentage) > 100)
    ) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Counter discount percentage must be a number between 0 and 100',
      });
    }

    const updatedNegotiation = await submitCounterOfferRepo({
      quotationId: Number(quotationId),
      counterDiscount: counter_discount_percentage !== undefined ? Number(counter_discount_percentage) : null,
      requestedDeliveryDate: requested_delivery_date || null,
      userId: user.id,
      userRole: user.role,
      message,
    });

    // When sales team submits counter offer to customer, dispatch notification email
    if (user.role !== 'customer') {
      try {
        const cust = await getCustomerNotificationContactRepo(quotation.customer_id);
        if (cust && cust.email) {
          const tempToken = signToken({
            id: cust.user_id || cust.customer_id,
            name: cust.user_name || cust.company_name,
            email: cust.email,
            role: cust.role || 'customer',
            customer_id: quotation.customer_id,
            company_name: cust.company_name,
            quotation_id: quotation.id,
            type: 'magic_quotation_link'
          }, '15m');

          await addCounterOfferEmailJob({
            toEmail: cust.email,
            customerName: cust.company_name,
            quotationNumber: quotation.quotation_number,
            quotationId: quotation.id,
            counterDiscount: counter_discount_percentage !== undefined ? Number(counter_discount_percentage) : null,
            requestedDeliveryDate: requested_delivery_date || null,
            message: message || '',
            tempToken,
          });
        }
      } catch (mailErr) {
        console.warn('⚠️ Failed to dispatch counter-offer email:', mailErr.message);
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Counter-offer submitted successfully. Status updated to negotiating.',
      data: updatedNegotiation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a discussion message to the negotiation thread
 */
export const addMessageController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;
    const { message, quotation_item_id } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    const quotation = await getQuotationFullDetailRepo(quotationId);
    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (user.role === 'customer') {
      const userCustId = await resolveUserCustomerId(user);
      if (String(quotation.customer_id) !== String(userCustId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only participate in negotiations for your own organization.',
        });
      }
    }

    const updatedNegotiation = await addNegotiationMessageRepo({
      quotationId: Number(quotationId),
      quotationItemId: quotation_item_id || null,
      userId: user.id,
      userRole: user.role,
      message: message.trim(),
    });

    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      data: updatedNegotiation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept quotation terms, confirming deal into approved status
 */
export const acceptQuotationController = async (req, res, next) => {
  try {
    const { quotationId } = req.params;
    const user = req.user;

    const quotation = await getQuotationFullDetailRepo(quotationId);
    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (user.role === 'customer') {
      const userCustId = await resolveUserCustomerId(user);
      if (String(quotation.customer_id) !== String(userCustId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only accept quotations for your own organization.',
        });
      }
    }

    const result = await acceptQuotationTermsRepo({
      quotationId: Number(quotationId),
      userId: user.id,
      userRole: user.role,
    });

    // Dispatch approved quotation email
    try {
      const cust = await getCustomerNotificationContactRepo(quotation.customer_id);
      if (cust && cust.email) {
        await addQuotationApprovedEmailJob({
          toEmail: cust.email,
          customerName: cust.company_name,
          quotationNumber: quotation.quotation_number,
          quotationId: quotation.id,
          grandTotal: quotation.grand_total,
          validUntil: quotation.valid_until,
        });
      }
    } catch (mailErr) {
      console.warn('⚠️ Failed to dispatch quotation approved email:', mailErr.message);
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Quotation terms accepted and status updated to Approved successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
