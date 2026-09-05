import { Router } from 'express';
import {
  getDealHealthDashboard,
  getDealHealthConfig,
  updateDealHealthConfig,
  updateFlagAction,
  triggerHealthScan,
} from '../controllers/dealHealth.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getDealHealthDashboard);
router.get('/config', getDealHealthConfig);
router.put(
  '/config',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER),
  updateDealHealthConfig
);
router.patch(
  '/flags/:id/action',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE),
  updateFlagAction
);
router.post(
  '/scan',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE),
  triggerHealthScan
);

export default router;
