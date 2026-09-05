import { pool } from '../config/database.js';
import {
  GET_REPORT_SUMMARY_KPIS,
  GET_APPROVAL_BOTTLENECK_METRICS,
  GET_TOP_UPSELL_AND_PRODUCT_METRICS,
  GET_REVENUE_MIX_DISTRIBUTION,
  GET_SALES_REVENUE_TRENDS,
  GET_SALES_REP_LEADERBOARD,
  GET_REPORT_FILTER_METADATA,
  GET_REPORT_RAW_EXPORT_DATA,
} from '../queries/report.query.js';

/**
 * Fetch complete analytics dataset for the executive reports dashboard
 */
export const getReportAnalyticsRepo = async ({
  period = 'this_month',
  salesRepId = null,
  approvalStatus = null,
  categoryId = null,
} = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cleanPeriod = period || 'this_month';
    const repParam = salesRepId ? parseInt(salesRepId, 10) : null;
    const statusParam = approvalStatus && approvalStatus !== 'all' ? approvalStatus : null;
    const catParam = categoryId && categoryId !== 'all' ? parseInt(categoryId, 10) : null;

    const summaryKpisRes = await client.query(GET_REPORT_SUMMARY_KPIS, [cleanPeriod, repParam, statusParam]);
    const approvalBottlenecksRes = await client.query(GET_APPROVAL_BOTTLENECK_METRICS, [cleanPeriod, repParam]);
    const topProductsRes = await client.query(GET_TOP_UPSELL_AND_PRODUCT_METRICS, [cleanPeriod, repParam, statusParam, catParam]);
    const revenueMixRes = await client.query(GET_REVENUE_MIX_DISTRIBUTION, [cleanPeriod, repParam]);
    const salesTrendsRes = await client.query(GET_SALES_REVENUE_TRENDS, [cleanPeriod, repParam]);
    const salesRepLeaderboardRes = await client.query(GET_SALES_REP_LEADERBOARD, [cleanPeriod]);

    await client.query('COMMIT');

    const summaryKpis = summaryKpisRes.rows[0] || {
      quotes_created_count: 0,
      total_pipeline_value: 0,
      confirmed_revenue_value: 0,
      confirmed_deals_count: 0,
      win_rate_percentage: 0,
      avg_discount_percentage: 0,
      prev_period_quotes_count: 0,
      prev_period_pipeline_value: 0,
    };

    const approvalBottlenecks = approvalBottlenecksRes.rows[0] || {
      total_approvals_requested: 0,
      total_approved_count: 0,
      total_rejected_count: 0,
      total_returned_count: 0,
      avg_approval_hours: 0,
      manager_avg_hours: 0,
      finance_avg_hours: 0,
      approval_rate_pct: 0,
    };

    const revenueMix = revenueMixRes.rows[0] || {
      recurring_revenue: 0,
      onetime_revenue: 0,
    };

    return {
      summaryKpis,
      approvalBottlenecks,
      topProducts: topProductsRes.rows,
      revenueMix,
      salesTrends: salesTrendsRes.rows,
      salesRepLeaderboard: salesRepLeaderboardRes.rows,
    };
  } catch (error) {
    console.error('Error in getReportAnalyticsRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Fetch filter metadata dropdown values (Sales reps, Categories)
 */
export const getReportFilterMetaRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(GET_REPORT_FILTER_METADATA);
    await client.query('COMMIT');

    const meta = result.rows[0] || {};
    return {
      sales_reps: meta.sales_reps || [],
      categories: meta.categories || [],
    };
  } catch (error) {
    console.error('Error in getReportFilterMetaRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Fetch raw data rows for CSV report generation
 */
export const getReportRawExportDataRepo = async ({
  period = 'this_month',
  salesRepId = null,
  approvalStatus = null,
} = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cleanPeriod = period || 'this_month';
    const repParam = salesRepId ? parseInt(salesRepId, 10) : null;
    const statusParam = approvalStatus && approvalStatus !== 'all' ? approvalStatus : null;

    const result = await client.query(GET_REPORT_RAW_EXPORT_DATA, [cleanPeriod, repParam, statusParam]);
    await client.query('COMMIT');

    return result.rows;
  } catch (error) {
    console.error('Error in getReportRawExportDataRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
