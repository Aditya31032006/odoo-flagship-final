import { STATUS_CODES } from '../constants/statusCodes.js';
import {
  getDiscountConfigurationRepo,
  saveDiscountConfigurationRepo,
} from '../repositories/discountRules.repository.js';

export const getDiscountConfigurationController = async (req, res, next) => {
  try {
    const config = await getDiscountConfigurationRepo();
    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const saveDiscountConfigurationController = async (req, res, next) => {
  try {
    const { customer_tiers, category_ceilings, approval_rules } = req.body;

    const updated = await saveDiscountConfigurationRepo({
      customer_tiers: customer_tiers || [],
      category_ceilings: category_ceilings || [],
      approval_rules: approval_rules || [],
    });

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: 'Discount tiers and approval chain configuration saved successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
