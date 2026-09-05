import {
  getActiveCustomersRepo,
  getActivePriceListsRepo,
  getSellableVariantsRepo,
  searchProductVariantsFuzzyRepo,
  getPriceListItemsRepo,
  getUpsellRulesForProductsRepo,
  getActiveApprovalRulesRepo,
  getProductCatalogSummaryRepo,
  getAllProductsRepo,
  getProductCategoriesRepo,
  createProductCategoryRepo,
  getProductDetailRepo,
  createProductRepo,
  updateProductRepo,
  deleteProductRepo,
  deleteProductVariantRepo,
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
    const { search } = req.query;
    const variants = search 
      ? await searchProductVariantsFuzzyRepo(search) 
      : await getSellableVariantsRepo();
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

export const getProductCatalogSummaryController = async (req, res, next) => {
  try {
    const summary = await getProductCatalogSummaryRepo();
    return res.status(STATUS_CODES.OK).json({
      success: true,
      data: {
        active_products: Number(summary.active_products_count) || 0,
        archived_products: Number(summary.archived_products_count) || 0,
        pricelists: Number(summary.pricelists_count) || 0,
        currencies: Number(summary.currencies_count) || 0,
        total_variants: Number(summary.total_variants_count) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsController = async (req, res, next) => {
  try {
    const products = await getAllProductsRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductCategoriesController = async (req, res, next) => {
  try {
    const categories = await getProductCategoriesRepo();
    return res.status(STATUS_CODES.OK).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createProductCategoryController = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Category name is required.' });
    }
    const category = await createProductCategoryRepo(name.trim());
    return res.status(STATUS_CODES.CREATED).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const getProductDetailController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await getProductDetailRepo(id);
    if (!product) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }
    return res.status(STATUS_CODES.OK).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const createProductController = async (req, res, next) => {
  try {
    const {
      name,
      category_id,
      category_name,
      description,
      unit = 'Each',
      base_price = 0,
      tax_percentage = 0,
      is_active = true,
      variants = [],
      subscription_plans = [],
      is_subscription,
      recurring_cycle,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Product name is required.' });
    }

    const newProduct = await createProductRepo({
      name: name.trim(),
      category_id,
      category_name,
      description,
      unit,
      base_price: Number(base_price) || 0,
      tax_percentage: Number(tax_percentage) || 0,
      is_active,
      variants,
      subscription_plans,
      is_subscription,
      recurring_cycle,
    });

    return res.status(STATUS_CODES.CREATED).json({ success: true, data: newProduct });
  } catch (error) {
    next(error);
  }
};

export const updateProductController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      category_id,
      description,
      unit = 'Each',
      base_price = 0,
      tax_percentage = 0,
      is_active = true,
      variants = [],
      subscription_plans = [],
      is_subscription,
      recurring_cycle,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Product name is required.' });
    }

    const updated = await updateProductRepo(id, {
      name: name.trim(),
      category_id,
      description,
      unit,
      base_price: Number(base_price) || 0,
      tax_percentage: Number(tax_percentage) || 0,
      is_active,
      variants,
      subscription_plans,
      is_subscription,
      recurring_cycle,
    });

    if (!updated) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Product not found' });
    }

    return res.status(STATUS_CODES.OK).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteProductController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProductRepo(id);
    if (!deleted) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Product not found.' });
    }
    return res.status(STATUS_CODES.OK).json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteVariantController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProductVariantRepo(id);
    if (!deleted) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: 'Variant not found.' });
    }
    return res.status(STATUS_CODES.OK).json({ success: true, message: 'Variant deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

