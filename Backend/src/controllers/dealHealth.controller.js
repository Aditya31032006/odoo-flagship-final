import {
  getDealHealthDashboardRepo,
  getDealHealthConfigRepo,
  updateDealHealthConfigRepo,
  updateDealHealthFlagActionRepo,
  runHealthCheckScan,
} from '../repositories/dealHealth.repository.js';

export const getDealHealthDashboard = async (req, res, next) => {
  try {
    const { type } = req.query;
    const data = await getDealHealthDashboardRepo(type);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDealHealthConfig = async (req, res, next) => {
  try {
    const config = await getDealHealthConfigRepo();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDealHealthConfig = async (req, res, next) => {
  try {
    const { stalled_days, discount_anomaly_multiplier, delivery_slippage_days } = req.body;
    const updated = await updateDealHealthConfigRepo({
      stalled_days,
      discount_anomaly_multiplier,
      delivery_slippage_days,
    });
    return res.status(200).json({
      success: true,
      message: 'Deal health configuration updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFlagAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, detail } = req.body;
    const userId = req.user?.id || null;

    const updated = await updateDealHealthFlagActionRepo(id, { action, detail, userId });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Deal health flag not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Deal health flag action updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerHealthScan = async (req, res, next) => {
  try {
    await runHealthCheckScan();
    const data = await getDealHealthDashboardRepo();
    return res.status(200).json({
      success: true,
      message: 'Health check scan completed successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};
