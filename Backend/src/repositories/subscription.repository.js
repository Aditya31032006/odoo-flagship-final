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
  GET_SUBSCRIPTIONS_BY_STATUS,
  GET_FIRST_PRODUCT_ID,
  GET_FIRST_PRODUCT_CATEGORY_ID,
  INSERT_PRODUCT_CATEGORY,
  INSERT_PRODUCT_WITH_CATEGORY,
} from '../queries/subscription.query.js';

export const getSubscriptionsListRepo = async ({
  statusFilter = null,
  search = null,
  limit = null,
  offset = null,
} = {}) => {
  const client = await pool.connect();
  try {
    let whereConditions = [];
    let queryParams = [];

    if (statusFilter && statusFilter !== 'all') {
      queryParams.push(statusFilter);
      whereConditions.push(`s.status = $${queryParams.length}`);
    }

    if (search && search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereConditions.push(`(c.company_name ILIKE $${queryParams.length} OR sp.name ILIKE $${queryParams.length} OR s.billing_cycle::TEXT ILIKE $${queryParams.length})`);
    }

    let query = GET_ALL_SUBSCRIPTIONS;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    query += ` ORDER BY s.created_at DESC`;

    if (limit !== null && offset !== null) {
      queryParams.push(limit, offset);
      query += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    }

    const subscriptionsRes = await client.query(query, queryParams);
    const statusCountsRes = await client.query(GET_SUBSCRIPTION_STATUS_COUNTS);

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
  } catch (error) {
    console.error('Error in getSubscriptionsListRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const getSubscriptionDetailRepo = async (subscriptionId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subRes = await client.query(GET_SUBSCRIPTION_BY_ID, [subscriptionId]);
    if (subRes.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const subscription = subRes.rows[0];
    const orderId = subscription.order_id;

    const oneTimeRes = orderId ? await client.query(GET_ORIGINATING_ORDER_ONE_TIME_ITEMS, [orderId]) : { rows: [] };
    const billingLinesRes = await client.query(GET_SUBSCRIPTION_BILLING_LINES, [subscriptionId]);
    const allPlansRes = await client.query(GET_ALL_SUBSCRIPTION_PLANS);
    await client.query('COMMIT');

    return {
      subscription,
      oneTimeLines: oneTimeRes.rows,
      billingLines: billingLinesRes.rows,
      availablePlans: allPlansRes.rows,
    };
  } catch (error) {
    console.error('Error in getSubscriptionDetailRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getSubscriptionPlansRepo = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(GET_ALL_SUBSCRIPTION_PLANS);
    await client.query('COMMIT');
    return res.rows;
  } catch (error) {
    console.error('Error in getSubscriptionPlansRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let targetProductId = product_id;
    if (!targetProductId) {
      const prodRes = await client.query(GET_FIRST_PRODUCT_ID);
      if (prodRes.rows.length > 0) {
        targetProductId = prodRes.rows[0].id;
      } else {
        const catRes = await client.query(GET_FIRST_PRODUCT_CATEGORY_ID);
        let catId;
        if (catRes.rows.length > 0) {
          catId = catRes.rows[0].id;
        } else {
          const newCat = await client.query(INSERT_PRODUCT_CATEGORY, ['General']);
          catId = newCat.rows[0].id;
        }
        const newP = await client.query(INSERT_PRODUCT_WITH_CATEGORY, [name, catId, price]);
        targetProductId = newP.rows[0].id;
      }
    }

    const res = await client.query(CREATE_SUBSCRIPTION_PLAN, [
      targetProductId,
      name,
      billing_cycle,
      price,
      Boolean(allow_proration),
      Boolean(allow_cancellation),
      Boolean(allow_partial_refund),
    ]);

    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    console.error('Error in createSubscriptionPlanRepo:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    console.error('Error in updateSubscriptionConfigRepo:', err);
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
    console.error('Error in cancelSubscriptionRepo:', err);
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
