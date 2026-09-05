import { pool } from '../config/database.js';
import {
  GET_DEAL_HEALTH_CONFIG,
  UPDATE_DEAL_HEALTH_CONFIG,
  INSERT_DEAL_HEALTH_CONFIG_DEFAULT,
  GET_ALL_DEAL_HEALTH_FLAGS,
  GET_DEAL_HEALTH_FLAGS_BY_TYPE,
  GET_DEAL_HEALTH_SUMMARY_COUNTS,
  UPDATE_DEAL_HEALTH_FLAG_ACTION,
  INSERT_DEAL_HEALTH_FLAG,
  FIND_STALLED_QUOTATIONS,
  GET_AVERAGE_ITEM_DISCOUNT,
  FIND_DISCOUNT_ANOMALIES,
  FIND_DELIVERY_SLIPPAGE_DEALS,
} from '../queries/dealHealth.query.js';

export const getOrCreateDealHealthConfig = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let res = await client.query(GET_DEAL_HEALTH_CONFIG);
    if (res.rows.length === 0) {
      res = await client.query(INSERT_DEAL_HEALTH_CONFIG_DEFAULT);
    }
    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    console.error('Error in getOrCreateDealHealthConfig:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Scan database records and automatically insert detected deal health flags
 */
export const runHealthCheckScan = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const config = await getOrCreateDealHealthConfig();
    const stalledDays = config.stalled_days || 7;
    const discountMultiplier = parseFloat(config.discount_anomaly_multiplier) || 1.5;
    const slippageDays = config.delivery_slippage_days || 3;

    // 1. Scan for Stalled Deals
    const stalledQuotes = await client.query(FIND_STALLED_QUOTATIONS, [stalledDays]);

    for (const row of stalledQuotes.rows) {
      await client.query(INSERT_DEAL_HEALTH_FLAG, [
        row.id,
        'stalled_deal',
        `Idle ${row.idle_days || stalledDays} days`,
      ]);
    }

    // 2. Scan for Discount Anomalies
    const avgDiscountRes = await client.query(GET_AVERAGE_ITEM_DISCOUNT);
    const avgDiscount = parseFloat(avgDiscountRes.rows[0]?.avg_discount || 8.0);
    const thresholdDiscount = (avgDiscount * discountMultiplier).toFixed(1);

    const discountAnomalies = await client.query(FIND_DISCOUNT_ANOMALIES, [thresholdDiscount]);

    for (const row of discountAnomalies.rows) {
      const detail = `Discount ${row.max_discount}% vs avg ${avgDiscount}%`;
      await client.query(INSERT_DEAL_HEALTH_FLAG, [
        row.quotation_id,
        'discount_anomaly',
        detail,
      ]);
    }

    // 3. Scan for Delivery Slippage
    const slippageRes = await client.query(FIND_DELIVERY_SLIPPAGE_DEALS, [slippageDays]);

    for (const row of slippageRes.rows) {
      const detail = `Shipment overdue by ${row.overdue_days || slippageDays} days`;
      await client.query(INSERT_DEAL_HEALTH_FLAG, [
        row.quotation_id,
        'delivery_slippage',
        detail,
      ]);
    }

    await client.query('COMMIT');
  } catch (err) {
    console.error('runHealthCheckScan warning:', err.message);
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
  } finally {
    client.release();
  }
};

export const getDealHealthDashboardRepo = async (flagTypeFilter = null) => {
  // Trigger scan to ensure live detection
  await runHealthCheckScan();

  const config = await getOrCreateDealHealthConfig();

  let flagsQuery = GET_ALL_DEAL_HEALTH_FLAGS;
  const params = [];

  if (flagTypeFilter && ['stalled_deal', 'discount_anomaly', 'delivery_slippage'].includes(flagTypeFilter)) {
    flagsQuery = GET_DEAL_HEALTH_FLAGS_BY_TYPE;
    params.push(flagTypeFilter);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const flagsRes = await client.query(flagsQuery, params);
    const summaryRes = await client.query(GET_DEAL_HEALTH_SUMMARY_COUNTS);
    await client.query('COMMIT');

    return {
      flags: flagsRes.rows,
      summary: summaryRes.rows[0] || {
        stalled_count: 0,
        discount_anomaly_count: 0,
        delivery_slippage_count: 0,
        total_open_flags: 0,
        total_all_flags: 0,
      },
      config,
    };
  } catch (error) {
    console.error('Error in getDealHealthDashboardRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getDealHealthConfigRepo = async () => {
  return await getOrCreateDealHealthConfig();
};

export const updateDealHealthConfigRepo = async ({
  stalled_days,
  discount_anomaly_multiplier,
  delivery_slippage_days,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(UPDATE_DEAL_HEALTH_CONFIG, [
      stalled_days !== undefined ? parseInt(stalled_days, 10) : null,
      discount_anomaly_multiplier !== undefined ? parseFloat(discount_anomaly_multiplier) : null,
      delivery_slippage_days !== undefined ? parseInt(delivery_slippage_days, 10) : null,
    ]);
    await client.query('COMMIT');

    // Re-run scan with updated thresholds
    await runHealthCheckScan();

    return res.rows[0];
  } catch (error) {
    console.error('Error in updateDealHealthConfigRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateDealHealthFlagActionRepo = async (id, { action, detail, userId }) => {
  const validActions = ['open', 'acknowledged', 'resolved'];
  const targetAction = validActions.includes(action) ? action : 'acknowledged';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(UPDATE_DEAL_HEALTH_FLAG_ACTION, [
      id,
      targetAction,
      detail || null,
      userId || null,
    ]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    console.error('Error in updateDealHealthFlagActionRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
