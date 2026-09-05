import {
  getSubscriptionsListRepo,
  getSubscriptionDetailRepo,
  getSubscriptionPlansRepo,
  createSubscriptionPlanRepo,
  updateSubscriptionConfigRepo,
  cancelSubscriptionRepo,
} from '../repositories/subscription.repository.js';

export const getSubscriptionsList = async (req, res, next) => {
  try {
    const { status } = req.query;
    const data = await getSubscriptionsListRepo(status);
    return res.status(200).json({
      success: true,
      data,
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
