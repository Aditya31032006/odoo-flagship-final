import {
  getDashboardStatsRepo,
  getRecentActivityLogsRepo
} from '../repositories/dashboard.repository.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

/**
 * Controller to fetch Dashboard KPIs and aggregated metrics
 * Scoped by role: sales_rep sees their own deals, managers/admins/finance see organizational metrics
 */
export const getDashboardStatsController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;

    const stats = await getDashboardStatsRepo(salesRepId);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        pending_approvals: Number(stats.pending_approvals_count) || 0,
        open_quotations: Number(stats.open_quotations_count) || 0,
        at_risk_deals: Number(stats.at_risk_deals_count) || 0,
        confirmed_orders: Number(stats.confirmed_orders_count) || 0,
        total_pipeline_value: Number(stats.total_pipeline_value) || 0,
        role: user.role,
        user_name: user.name,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to fetch Recent Activity Log feed
 */
export const getDashboardActivityController = async (req, res, next) => {
  try {
    const user = req.user;
    const salesRepId = user.role === 'sales_rep' ? user.id : null;
    const limit = Math.min(Number(req.query.limit) || 15, 50);

    const activities = await getRecentActivityLogsRepo(salesRepId, limit);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};
