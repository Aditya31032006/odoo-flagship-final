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
    const stalledQuotes = await client.query(`
      SELECT 
        q.id,
        q.quotation_number,
        q.updated_at,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - q.updated_at))::int AS idle_days
      FROM quotations q
      WHERE q.status IN ('draft', 'sent', 'negotiating', 'pending_approval')
        AND q.updated_at <= CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL
        AND NOT EXISTS (
          SELECT 1 FROM deal_health_flags dhf 
          WHERE dhf.quotation_id = q.id 
            AND dhf.flag_type = 'stalled_deal' 
            AND dhf.action <> 'resolved'
        );
    `, [stalledDays]);

    for (const row of stalledQuotes.rows) {
      await client.query(INSERT_DEAL_HEALTH_FLAG, [
        row.id,
        'stalled_deal',
        `Idle ${row.idle_days || stalledDays} days`,
      ]);
    }

    // 2. Scan for Discount Anomalies
    const avgDiscountRes = await client.query(`
      SELECT COALESCE(AVG(discount_percentage), 8.0)::numeric(5,2) AS avg_discount 
      FROM quotation_items 
      WHERE discount_percentage > 0;
    `);
    const avgDiscount = parseFloat(avgDiscountRes.rows[0]?.avg_discount || 8.0);
    const thresholdDiscount = (avgDiscount * discountMultiplier).toFixed(1);

    const discountAnomalies = await client.query(`
      SELECT 
        qi.quotation_id,
        MAX(qi.discount_percentage)::numeric(5,2) AS max_discount,
        MAX(qi.excess_discount_percentage)::numeric(5,2) AS max_excess
      FROM quotation_items qi
      JOIN quotations q ON qi.quotation_id = q.id
      WHERE (qi.discount_percentage >= $1 OR qi.excess_discount_percentage > 0)
        AND q.status NOT IN ('rejected', 'expired', 'cancelled')
        AND NOT EXISTS (
          SELECT 1 FROM deal_health_flags dhf 
          WHERE dhf.quotation_id = qi.quotation_id 
            AND dhf.flag_type = 'discount_anomaly' 
            AND dhf.action <> 'resolved'
        )
      GROUP BY qi.quotation_id;
    `, [thresholdDiscount]);

    for (const row of discountAnomalies.rows) {
      const detail = `Discount ${row.max_discount}% vs avg ${avgDiscount}%`;
      await client.query(INSERT_DEAL_HEALTH_FLAG, [
        row.quotation_id,
        'discount_anomaly',
        detail,
      ]);
    }

    // 3. Scan for Delivery Slippage
    const slippageRes = await client.query(`
      SELECT 
        o.quotation_id,
        fs.id AS split_id,
        fs.estimated_shipment_date,
        EXTRACT(DAY FROM (CURRENT_DATE - fs.estimated_shipment_date))::int AS overdue_days
      FROM fulfillment_splits fs
      JOIN order_items oi ON fs.order_item_id = oi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE fs.status IN ('pending', 'allocated', 'processing')
        AND fs.estimated_shipment_date < CURRENT_DATE - ($1 || ' days')::INTERVAL
        AND o.quotation_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM deal_health_flags dhf 
          WHERE dhf.quotation_id = o.quotation_id 
            AND dhf.flag_type = 'delivery_slippage' 
            AND dhf.action <> 'resolved'
        );
    `, [slippageDays]);

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
    const [flagsRes, summaryRes] = await Promise.all([
      client.query(flagsQuery, params),
      client.query(GET_DEAL_HEALTH_SUMMARY_COUNTS),
    ]);
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
