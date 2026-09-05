import { pool } from '../config/database.js';
import { GET_DASHBOARD_STATS, GET_RECENT_ACTIVITY_LOGS } from '../queries/dashboard.query.js';

/**
 * Fetch KPI counts and statistics for the dashboard
 * @param {number|null} salesRepId - Optional filter if user is sales_rep
 */
export const getDashboardStatsRepo = async (salesRepId = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_DASHBOARD_STATS, [salesRepId]);
    await client.query('COMMIT');
    return result.rows[0] || {
      pending_approvals_count: 0,
      open_quotations_count: 0,
      at_risk_deals_count: 0,
      confirmed_orders_count: 0,
      total_pipeline_value: 0,
    };
  } catch (error) {
    console.error('Error in getDashboardStatsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Fetch recent quotation audit activity for feed
 * @param {number|null} salesRepId - Optional filter if user is sales_rep
 * @param {number} limit - Number of records to fetch
 */
export const getRecentActivityLogsRepo = async (salesRepId = null, limit = 15) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_RECENT_ACTIVITY_LOGS, [salesRepId, limit]);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('Error in getRecentActivityLogsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
