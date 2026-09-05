import { Router } from 'express';
import {
  getDashboardStatsController,
  getDashboardActivityController
} from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All dashboard endpoints require valid authentication
router.use(authMiddleware);

router.get('/stats', getDashboardStatsController);
router.get('/activity', getDashboardActivityController);

export default router;
