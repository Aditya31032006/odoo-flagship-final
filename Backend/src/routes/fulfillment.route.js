import { Router } from 'express';
import {
  getFulfillmentListController,
  getFulfillmentMetaController,
  getFulfillmentDetailController,
  acceptSuggestedSplitController,
  saveManualOverrideSplitController,
  createStockController,
  updateStockController,
  deleteStockController,
  createOrderController,
  updateOrderController,
  deleteOrderController,
} from '../controllers/fulfillment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Meta routes
router.get('/meta', getFulfillmentMetaController);

// Stock routes
router.post('/stock', createStockController);
router.put('/stock/:id', updateStockController);
router.delete('/stock/:id', deleteStockController);

// Order routes
router.post('/orders', createOrderController);
router.put('/orders/:id', updateOrderController);
router.delete('/orders/:id', deleteOrderController);

// Detail & Splitting routes
router.get('/:id', getFulfillmentDetailController);
router.post('/:id/accept-split', acceptSuggestedSplitController);
router.post('/:id/manual-override', saveManualOverrideSplitController);

// List overview route
router.get('/', getFulfillmentListController);

export default router;
