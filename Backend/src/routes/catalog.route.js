import { Router } from 'express';
import {
  getCustomersCatalogController,
  getPriceListsCatalogController,
  getPriceListItemsCatalogController,
  getProductsCatalogController,
  getUpsellsCatalogController,
  getApprovalRulesCatalogController,
  getProductCatalogSummaryController,
  getAllProductsController,
  getProductCategoriesController,
  createProductCategoryController,
  getProductDetailController,
  createProductController,
  updateProductController,
  deleteProductController,
  deleteVariantController,
} from '../controllers/catalog.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

// Customer & Catalog lookups
router.get('/customers', getCustomersCatalogController);
router.get('/price-lists', getPriceListsCatalogController);
router.get('/price-lists/:priceListId/items', getPriceListItemsCatalogController);
router.get('/products', getProductsCatalogController);
router.get('/upsells', getUpsellsCatalogController);
router.get('/approval-rules', getApprovalRulesCatalogController);

// Product Catalog Dashboard & CRUD
router.get('/products/summary', getProductCatalogSummaryController);
router.get('/products/all', getAllProductsController);
router.get('/products/categories', getProductCategoriesController);
router.post(
  '/products/categories',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.OPERATIONS),
  createProductCategoryController
);
router.get('/products/:id', getProductDetailController);

// Restricted Product & Variant Management
router.post(
  '/products',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.OPERATIONS),
  createProductController
);
router.put(
  '/products/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.OPERATIONS),
  updateProductController
);
router.delete(
  '/products/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.OPERATIONS),
  deleteProductController
);
router.delete(
  '/variants/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.OPERATIONS),
  deleteVariantController
);

export default router;
