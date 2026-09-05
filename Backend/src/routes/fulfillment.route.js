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
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

// Meta routes
router.get('/meta', getFulfillmentMetaController);

// Stock routes - Operations & Admin
router.post('/stock', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS), createStockController);
router.put('/stock/:id', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS), updateStockController);
router.delete('/stock/:id', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS), deleteStockController);

// Order routes
router.post('/orders', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE), createOrderController);
router.put('/orders/:id', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE), updateOrderController);
router.delete('/orders/:id', authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE), deleteOrderController);

// Detail & Splitting routes
router.get('/:id', getFulfillmentDetailController);
router.post(
  '/:id/accept-split',
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE),
  acceptSuggestedSplitController
);
router.post(
  '/:id/manual-override',
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE),
  saveManualOverrideSplitController
);
router.post(
  '/:id/complete-shipment',
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATIONS, ROLES.FINANCE),
  completeShipmentController
);

// List overview route
router.get('/', getFulfillmentListController);

export default router;
