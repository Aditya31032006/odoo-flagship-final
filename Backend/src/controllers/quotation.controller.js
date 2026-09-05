import {
  getQuotationsListRepo,
  getQuotationsKanbanSummaryRepo,
  getQuotationByIdRepo
} from '../repositories/quotation.repository.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

const KANBAN_STAGES = ['draft', 'pending_approval', 'approved', 'negotiating', 'confirmed'];

/**
 * Controller to fetch quotations
 * Query parameters:
 * - view: 'kanban' | 'list' (default: 'kanban')
 * - status: specific quotation status filter
 * - search: text search by customer name, quotation number, sales rep
 */
export const getQuotationsController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;
    const { view = 'kanban', status = null, search = null } = req.query;

    const quotations = await getQuotationsListRepo({
      salesRepId,
      status: status ? status.trim() : null,
      searchQuery: search ? search.trim() : null,
    });

    if (view === 'kanban') {
      // Group quotations by the 5 canonical kanban pipeline columns
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

      // Calculate totals per stage
      const stageTotals = {};
      KANBAN_STAGES.forEach((stage) => {
        stageTotals[stage] = {
          count: kanban[stage].length,
          totalAmount: kanban[stage].reduce((sum, q) => sum + Number(q.grand_total || 0), 0)
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

    // Default or List View
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

/**
 * Controller to fetch pipeline summary metrics
 */
export const getQuotationsSummaryController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;

    const summary = await getQuotationsKanbanSummaryRepo(salesRepId);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch single quotation detail
 */
export const getQuotationDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await getQuotationByIdRepo(id);

    if (!quotation) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    next(error);
  }
};
