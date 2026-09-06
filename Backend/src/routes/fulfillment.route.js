import { Router } from 'express';
import {
  getFulfillmentListController,
  getFulfillmentMetaController,
  getFulfillmentDetailController,
  acceptSuggestedSplitController,
  saveManualOverrideSplitController,
  completeShipmentController,
  createStockController,
  updateStockController,
  deleteStockController,
  createOrderController,
  updateOrderController,
  deleteOrderController,
} from '../controllers/fulfillment.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES, ALL_INTERNAL_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

// Meta routes
router.get('/meta', getFulfillmentMetaController);

// Stock routes - All internal staff
router.post('/stock', authorizeRoles(ALL_INTERNAL_ROLES), createStockController);
router.put('/stock/:id', authorizeRoles(ALL_INTERNAL_ROLES), updateStockController);
router.delete('/stock/:id', authorizeRoles(ALL_INTERNAL_ROLES), deleteStockController);

// Order routes - All internal staff
router.post('/orders', authorizeRoles(ALL_INTERNAL_ROLES), createOrderController);
router.put('/orders/:id', authorizeRoles(ALL_INTERNAL_ROLES), updateOrderController);
router.delete('/orders/:id', authorizeRoles(ALL_INTERNAL_ROLES), deleteOrderController);

// Detail & Splitting routes - All internal staff
router.get('/:id', getFulfillmentDetailController);
router.post(
  '/:id/accept-split',
  authorizeRoles(ALL_INTERNAL_ROLES),
  acceptSuggestedSplitController
);
router.post(
  '/:id/manual-override',
  authorizeRoles(ALL_INTERNAL_ROLES),
  saveManualOverrideSplitController
);
router.post(
  '/:id/complete-shipment',
  authorizeRoles(ALL_INTERNAL_ROLES),
  completeShipmentController
);

// List overview route
router.get('/', getFulfillmentListController);

export default router;
