import {
  resolveCustomerUserLinkIdRepo,
  findCustomerByEmailRepo,
  getCustomerNotificationContactRepo,
} from '../repositories/auth.repository.js';
import {
  getQuotationsListRepo,
  getQuotationsKanbanSummaryRepo,
  getQuotationFullDetailRepo,
  saveQuotationRepo,
} from '../repositories/quotation.repository.js';
import { payQuotationRepo } from '../repositories/fulfillment.repository.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { addQuotationIssuedEmailJob } from '../jobs/emailQueue.js';

const KANBAN_STAGES = ['draft', 'pending_approval', 'approved', 'negotiating', 'confirmed', 'shipment', 'payment'];

/**
 * Resolves customer ID for a user from token, customer_users link table, or email matching.
 */
export async function resolveUserCustomerId(user) {
  if (!user) return null;
  if (user.customer_id) return user.customer_id;

  try {
    // 1. Check customer_users link table
    const linkCustomerId = await resolveCustomerUserLinkIdRepo(user.id);
    if (linkCustomerId) {
      return linkCustomerId;
    }

    // 2. Check customer record matching user's email
    if (user.email) {
      const custId = await findCustomerByEmailRepo(user.email);
      if (custId) {
        return custId;
      }
    }
  } catch (err) {
    console.warn('⚠️ Error in resolveUserCustomerId:', err.message);
  }

  return null;
}

export const getQuotationsController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;
    let customerId = null;

    if (user.role === 'customer') {
      customerId = await resolveUserCustomerId(user);
      if (!customerId) {
        return res.status(STATUS_CODES.OK).json({
          success: true,
          view: req.query.view || 'list',
          data: req.query.view === 'kanban' ? { draft: [], pending_approval: [], approved: [], negotiating: [], confirmed: [], shipment: [], payment: [] } : [],
          summary: {},
          totalCount: 0,
        });
      }
    }

    const { view = 'kanban', status = null, search = null } = req.query;

    const quotations = await getQuotationsListRepo({
      salesRepId,
      customerId,
      status: status ? status.trim() : null,
      searchQuery: search ? search.trim() : null,
    });

    if (view === 'kanban') {
      const kanban = {
        draft: [],
        pending_approval: [],
        approved: [],
        negotiating: [],
        confirmed: [],
        shipment: [],
        payment: [],
      };

      quotations.forEach((item) => {
        const stage = item.status;
        if (kanban[stage]) {
          kanban[stage].push(item);
        }
      });

      const stageTotals = {};
      KANBAN_STAGES.forEach((stage) => {
        stageTotals[stage] = {
          count: kanban[stage].length,
          totalAmount: kanban[stage].reduce((sum, q) => sum + Number(q.grand_total || 0), 0),
        };
      });

      return res.status(STATUS_CODES.OK).json({
        success: true,
        view: 'kanban',
        data: kanban,
        summary: stageTotals,
        totalCount: quotations.length,
      });
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      view: 'list',
      data: quotations,
      totalCount: quotations.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getQuotationsSummaryController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;
    let customerId = null;

    if (user.role === 'customer') {
      customerId = await resolveUserCustomerId(user);
      if (!customerId) {
        return res.status(STATUS_CODES.OK).json({ success: true, data: [] });
      }
    }

    const summary = await getQuotationsKanbanSummaryRepo({ salesRepId, customerId });
    return res.status(STATUS_CODES.OK).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getQuotationDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const quotation = await getQuotationFullDetailRepo(id);

    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    // Ensure customer accounts can only view quotations belonging to their company
    if (user.role === 'customer') {
      const customerId = await resolveUserCustomerId(user);
      if (!customerId || String(quotation.customer_id) !== String(customerId)) {
        return res.status(STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: 'Access denied: You can only view quotations for your own organization.',
        });
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

export const createQuotationController = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      customer_id,
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
      action_reason = 'Quotation created and pending customer review',
    } = req.body;

    if (!customer_id) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Customer is required to create a quotation.',
      });
    }

    if (!items || items.length === 0) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: 'Quotation must contain at least one product line item.',
      });
    }

    const savedQuotation = await saveQuotationRepo({
      customer_id,
      sales_rep_id: user.id,
      tier_id,
      price_list_id,
      status: status || 'pending_approval',
      blended_risk_score,
      risk_level,
      subtotal,
      discount_total,
      tax_total,
      grand_total,
      valid_until,
      items,
      action_reason,
      user_id: user.id,
    });

    // Send email to customer when pending quotation is filed to them
    if (savedQuotation) {
      try {
        const cust = await getCustomerNotificationContactRepo(customer_id);
        if (cust && cust.email) {
          await addQuotationIssuedEmailJob({
            toEmail: cust.email,
            customerName: cust.company_name,
            quotationNumber: savedQuotation.quotation_number,
            quotationId: savedQuotation.id,
            grandTotal: savedQuotation.grand_total,
            validUntil: savedQuotation.valid_until,
            items,
          });
        }
      } catch (mailErr) {
        console.warn('⚠️ Failed to dispatch quotation issued email:', mailErr.message);
      }
    }

    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      data: savedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuotationController = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      customer_id,
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
    } = req.body;

    const savedQuotation = await saveQuotationRepo({
      id,
      customer_id,
      sales_rep_id: user.id,
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
      items,
      action_reason,
      user_id: user.id,
    });

    // If quotation is updated in pending_approval status, dispatch email
    if (savedQuotation && status === 'pending_approval') {
      try {
        const cust = await getCustomerNotificationContactRepo(customer_id);
        if (cust && cust.email) {
          await addQuotationIssuedEmailJob({
            toEmail: cust.email,
            customerName: cust.company_name,
            quotationNumber: savedQuotation.quotation_number,
            quotationId: savedQuotation.id,
            grandTotal: savedQuotation.grand_total,
            validUntil: savedQuotation.valid_until,
            items,
          });
        }
      } catch (mailErr) {
        console.warn('⚠️ Failed to dispatch quotation issued email on update:', mailErr.message);
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: savedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

export const submitApprovalController = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      customer_id,
      tier_id,
      price_list_id,
      blended_risk_score = 0,
      risk_level = 'low',
      subtotal = 0,
      discount_total = 0,
      tax_total = 0,
      grand_total = 0,
      valid_until = null,
      items = [],
      action_reason = 'Filed pending quotation for customer review',
    } = req.body;

    const submitted = await saveQuotationRepo({
      id: id === 'new' ? null : id,
      customer_id,
      sales_rep_id: user.id,
      tier_id,
      price_list_id,
      status: 'pending_approval',
      blended_risk_score,
      risk_level,
      subtotal,
      discount_total,
      tax_total,
      grand_total,
      valid_until,
      items,
      action_reason,
      user_id: user.id,
    });

    if (submitted) {
      try {
        const cust = await getCustomerNotificationContactRepo(customer_id);
        if (cust && cust.email) {
          await addQuotationIssuedEmailJob({
            toEmail: cust.email,
            customerName: cust.company_name,
            quotationNumber: submitted.quotation_number,
            quotationId: submitted.id,
            grandTotal: submitted.grand_total,
            validUntil: submitted.valid_until,
            items,
          });
        }
      } catch (mailErr) {
        console.warn('⚠️ Failed to dispatch quotation issued email:', mailErr.message);
      }
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Pending quotation filed and sent to customer for review',
      data: submitted,
    });
  } catch (error) {
    next(error);
  }
};

export const payQuotationController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'bank_transfer', transactionReference = '' } = req.body;

    const result = await payQuotationRepo({
      quotationId: id,
      paymentMethod,
      transactionReference,
    });

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Payment completed successfully! Order moved to payment stage.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


