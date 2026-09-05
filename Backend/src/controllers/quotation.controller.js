import {
  getQuotationsListRepo,
  getQuotationsKanbanSummaryRepo,
  getQuotationFullDetailRepo,
  saveQuotationRepo,
} from '../repositories/quotation.repository.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

const KANBAN_STAGES = ['draft', 'pending_approval', 'approved', 'negotiating', 'confirmed'];

export const getQuotationsController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;
    const customerId = user.role === 'customer' ? user.customer_id : null;
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
    const customerId = user.role === 'customer' ? user.customer_id : null;
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
    if (user.role === 'customer' && String(quotation.customer_id) !== String(user.customer_id)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: 'Access denied: You can only view quotations for your own organization.',
      });
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
      action_reason = 'Submitted for managerial approval',
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

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Quotation submitted for approval successfully',
      data: submitted,
    });
  } catch (error) {
    next(error);
  }
};
