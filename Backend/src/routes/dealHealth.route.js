import { Router } from 'express';
import {
  getDealHealthDashboard,
  getDealHealthConfig,
  updateDealHealthConfig,
  updateFlagAction,
  triggerHealthScan,
} from '../controllers/dealHealth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getDealHealthDashboard);
router.get('/config', getDealHealthConfig);
router.put('/config', updateDealHealthConfig);
router.patch('/flags/:id/action', updateFlagAction);
router.post('/scan', triggerHealthScan);

export default router;
