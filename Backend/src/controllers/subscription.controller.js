import {
  getSubscriptionsListRepo,
  getSubscriptionDetailRepo,
  getSubscriptionPlansRepo,
  createSubscriptionPlanRepo,
  updateSubscriptionConfigRepo,
  cancelSubscriptionRepo,
  pauseSubscriptionRepo,
  resumeSubscriptionRepo,
} from '../repositories/subscription.repository.js';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination.util.js';

export const getSubscriptionsList = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const { page, limit, offset } = parsePaginationParams(req.query, { defaultLimit: 10 });
    const data = await getSubscriptionsListRepo({ statusFilter: status, search, limit, offset });
    const totalCount = data.subscriptions[0]?.total_count || 0;
    const pagination = buildPaginationMeta(totalCount, page, limit);

    return res.status(200).json({
      success: true,
      data,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await getSubscriptionDetailRepo(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionPlans = async (req, res, next) => {
  try {
    const plans = await getSubscriptionPlansRepo();
    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubscriptionPlan = async (req, res, next) => {
  try {
    const { product_id, name, billing_cycle, price, allow_proration, allow_cancellation, allow_partial_refund } = req.body;
    if (!name || !billing_cycle || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Plan name, billing_cycle, and price are required',
      });
    }

    const newPlan = await createSubscriptionPlanRepo({
      product_id,
      name,
      billing_cycle,
      price,
      allow_proration,
      allow_cancellation,
      allow_partial_refund,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: newPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const modifySubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subscription_plan_id, billing_cycle, unit_price, quantity, status } = req.body;

    const updated = await updateSubscriptionConfigRepo(id, {
      subscription_plan_id,
      billing_cycle,
      unit_price,
      quantity,
      status,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription modified successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, is_prorated, credit_amount } = req.body;

    const cancelled = await cancelSubscriptionRepo(id, { reason, is_prorated, credit_amount });
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

export const pauseSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paused = await pauseSubscriptionRepo(id);
    if (!paused) {
      return res.status(400).json({
        success: false,
        message: 'Only active subscriptions can be paused',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription paused successfully',
      data: paused,
    });
  } catch (error) {
    next(error);
  }
};

export const resumeSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resumed = await resumeSubscriptionRepo(id);
    if (!resumed) {
      return res.status(400).json({
        success: false,
        message: 'Only paused subscriptions can be resumed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully',
      data: resumed,
    });
  } catch (error) {
    next(error);
  }
};
