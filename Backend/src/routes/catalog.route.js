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
  getProductDetailController,
  createProductController,
  updateProductController,
  deleteProductController,
  deleteVariantController,
} from '../controllers/catalog.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

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
router.get('/products/:id', getProductDetailController);
router.post('/products', createProductController);
router.put('/products/:id', updateProductController);
router.delete('/products/:id', deleteProductController);
router.delete('/variants/:id', deleteVariantController);

export default router;

