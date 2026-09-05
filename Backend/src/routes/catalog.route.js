import { Router } from 'express';
import {
  getCustomersCatalogController,
  getPriceListsCatalogController,
  getPriceListItemsCatalogController,
  getProductsCatalogController,
  getUpsellsCatalogController,
  getApprovalRulesCatalogController,
} from '../controllers/catalog.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/customers', getCustomersCatalogController);
router.get('/price-lists', getPriceListsCatalogController);
router.get('/price-lists/:priceListId/items', getPriceListItemsCatalogController);
router.get('/products', getProductsCatalogController);
router.get('/upsells', getUpsellsCatalogController);
router.get('/approval-rules', getApprovalRulesCatalogController);

export default router;
