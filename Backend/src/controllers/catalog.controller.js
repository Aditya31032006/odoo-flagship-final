import {
  getActiveCustomersRepo,
  getActivePriceListsRepo,
  getSellableVariantsRepo,
  getPriceListItemsRepo,
  getUpsellRulesForProductsRepo,
  getActiveApprovalRulesRepo,
} from '../repositories/catalog.repository.js';
import { STATUS_CODES } from '../constants/statusCodes.js';

export const getCustomersCatalogController = async (req, res, next) => {
  try {
    const customers = await getActiveCustomersRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

export const getPriceListsCatalogController = async (req, res, next) => {
  try {
    const priceLists = await getActivePriceListsRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: priceLists });
  } catch (error) {
    next(error);
  }
};

export const getPriceListItemsCatalogController = async (req, res, next) => {
  try {
    const { priceListId } = req.params;
    const items = await getPriceListItemsRepo(priceListId);
    return res.status(STATUS_CODES.OK).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getProductsCatalogController = async (req, res, next) => {
  try {
    const variants = await getSellableVariantsRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: variants });
  } catch (error) {
    next(error);
  }
};

export const getUpsellsCatalogController = async (req, res, next) => {
  try {
    const productIds = req.query.productIds
      ? req.query.productIds.split(',').map((id) => Number(id.trim())).filter(Boolean)
      : [];
    const suggestions = await getUpsellRulesForProductsRepo(productIds);
    return res.status(STATUS_CODES.OK).json({ success: true, data: suggestions });
  } catch (error) {
    next(error);
  }
};

export const getApprovalRulesCatalogController = async (req, res, next) => {
  try {
    const rules = await getActiveApprovalRulesRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};
