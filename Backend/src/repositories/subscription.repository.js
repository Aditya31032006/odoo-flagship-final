import { pool } from '../config/database.js';
import {
  GET_ALL_SUBSCRIPTIONS,
  GET_SUBSCRIPTION_STATUS_COUNTS,
  GET_SUBSCRIPTION_BY_ID,
  GET_ORIGINATING_ORDER_ONE_TIME_ITEMS,
  GET_SUBSCRIPTION_BILLING_LINES,
  GET_ALL_SUBSCRIPTION_PLANS,
  CREATE_SUBSCRIPTION_PLAN,
  UPDATE_SUBSCRIPTION_CONFIG,
  CANCEL_SUBSCRIPTION,
  CREATE_SUBSCRIPTION_BILLING_LINE,
} from '../queries/subscription.query.js';

export const getSubscriptionsListRepo = async (statusFilter = null) => {
  let query = GET_ALL_SUBSCRIPTIONS;
  const params = [];

  if (statusFilter && statusFilter !== 'all') {
    query = `
      SELECT 
        s.id,
        s.order_item_id,
        s.customer_id,
        s.subscription_plan_id,
        s.quantity,
        s.unit_price,
        s.billing_cycle,
        s.start_date,
        s.end_date,
        s.status,
        s.created_at,
        s.updated_at,
        c.company_name AS customer_name,
        c.email AS customer_email,
        sp.name AS plan_name,
        sp.price AS plan_price,
        sp.allow_proration,
        sp.allow_cancellation,
        sp.allow_partial_refund,
        COALESCE(
          (
            SELECT sbl.billing_period_end
            FROM subscription_billing_lines sbl
            WHERE sbl.subscription_id = s.id
              AND sbl.billing_period_end >= CURRENT_DATE
            ORDER BY sbl.billing_period_end ASC
            LIMIT 1
          ),
          s.end_date,
          s.start_date + INTERVAL '1 month'
        ) AS next_bill_date
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
      WHERE s.status = $1
      ORDER BY s.created_at DESC;
    `;
    params.push(statusFilter);
  }

  const [subscriptionsRes, statusCountsRes] = await Promise.all([
    pool.query(query, params),
    pool.query(GET_SUBSCRIPTION_STATUS_COUNTS),
  ]);

  return {
    subscriptions: subscriptionsRes.rows,
    statusCounts: statusCountsRes.rows[0] || {
      active_count: 0,
      paused_count: 0,
      cancelled_count: 0,
      expired_count: 0,
      total_count: 0,
    },
  };
};

export const getSubscriptionDetailRepo = async (subscriptionId) => {
  const subRes = await pool.query(GET_SUBSCRIPTION_BY_ID, [subscriptionId]);
  if (subRes.rows.length === 0) {
    return null;
  }

  const subscription = subRes.rows[0];
  const orderId = subscription.order_id;

  const [oneTimeRes, billingLinesRes, allPlansRes] = await Promise.all([
    orderId ? pool.query(GET_ORIGINATING_ORDER_ONE_TIME_ITEMS, [orderId]) : { rows: [] },
    pool.query(GET_SUBSCRIPTION_BILLING_LINES, [subscriptionId]),
    pool.query(GET_ALL_SUBSCRIPTION_PLANS),
  ]);

  return {
    subscription,
    oneTimeLines: oneTimeRes.rows,
    billingLines: billingLinesRes.rows,
    availablePlans: allPlansRes.rows,
  };
};

export const getSubscriptionPlansRepo = async () => {
  const res = await pool.query(GET_ALL_SUBSCRIPTION_PLANS);
  return res.rows;
};

export const createSubscriptionPlanRepo = async ({
  product_id,
  name,
  billing_cycle,
  price,
  allow_proration = false,
  allow_cancellation = true,
  allow_partial_refund = false,
}) => {
  let targetProductId = product_id;
  if (!targetProductId) {
    const prodRes = await pool.query(`SELECT id FROM products LIMIT 1;`);
    if (prodRes.rows.length > 0) {
      targetProductId = prodRes.rows[0].id;
    } else {
      const catRes = await pool.query(`SELECT id FROM product_categories LIMIT 1;`);
      let catId;
      if (catRes.rows.length > 0) {
        catId = catRes.rows[0].id;
      } else {
        const newCat = await pool.query(`INSERT INTO product_categories (name) VALUES ('General') RETURNING id;`);
        catId = newCat.rows[0].id;
      }
      const newP = await pool.query(`
        INSERT INTO products (name, category_id, base_price) VALUES ($1, $2, $3) RETURNING id;
      `, [name, catId, price]);
      targetProductId = newP.rows[0].id;
    }
  }

  const res = await pool.query(CREATE_SUBSCRIPTION_PLAN, [
    targetProductId,
    name,
    billing_cycle,
    price,
    Boolean(allow_proration),
    Boolean(allow_cancellation),
    Boolean(allow_partial_refund),
  ]);

  return res.rows[0];
};

export const updateSubscriptionConfigRepo = async (id, {
  subscription_plan_id,
  billing_cycle,
  unit_price,
  quantity,
  status,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current subscription and its plan details
    const currRes = await client.query(GET_SUBSCRIPTION_BY_ID, [id]);
    if (currRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const currentSub = currRes.rows[0];

    // 2. Perform the update
    const updateRes = await client.query(UPDATE_SUBSCRIPTION_CONFIG, [
      id,
      subscription_plan_id || null,
      billing_cycle || null,
      unit_price !== undefined ? unit_price : null,
      quantity !== undefined ? quantity : null,
      status || null,
    ]);

    const updatedSub = updateRes.rows[0];

    // 3. If plan/cycle/price changed and proration is allowed on plan, record a new billing period line
    if (
      currentSub.allow_proration &&
      (currentSub.billing_cycle !== billing_cycle || currentSub.unit_price !== unit_price)
    ) {
      const today = new Date().toISOString().split('T')[0];
      const nextDate = new Date();
      if (billing_cycle === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else if (billing_cycle === 'quarterly') {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      const periodEnd = nextDate.toISOString().split('T')[0];

      await client.query(CREATE_SUBSCRIPTION_BILLING_LINE, [
        id,
        today,
        periodEnd,
        (unit_price || currentSub.unit_price) * (quantity || currentSub.quantity || 1),
        true, // is_prorated
        false, // credit_note_required
      ]);
    }

    await client.query('COMMIT');
    return updatedSub;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const cancelSubscriptionRepo = async (id, { reason, is_prorated = false, credit_amount = 0 }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if cancellation is permitted by subscription plan
    const currRes = await client.query(GET_SUBSCRIPTION_BY_ID, [id]);
    if (currRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const currentSub = currRes.rows[0];

    if (currentSub.allow_cancellation === false) {
      const err = new Error('Cancellation is not permitted for this subscription plan as per contract policy');
      err.statusCode = 400;
      throw err;
    }

    // 2. Mark subscription as cancelled in database
    const cancelRes = await client.query(CANCEL_SUBSCRIPTION, [id]);
    if (cancelRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // 3. If proration / credit note is applicable, record line in subscription_billing_lines
    if (is_prorated && Number(credit_amount) > 0) {
      const today = new Date().toISOString().split('T')[0];
      await client.query(CREATE_SUBSCRIPTION_BILLING_LINE, [
        id,
        today,
        today,
        -Math.abs(Number(credit_amount)),
        true, // is_prorated
        true, // credit_note_required
      ]);
    }

    await client.query('COMMIT');
    return cancelRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
