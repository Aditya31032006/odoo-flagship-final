import { Router } from 'express';
import {
  getDiscountConfigurationController,
  saveDiscountConfigurationController,
} from '../controllers/discountRules.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Routes for Discount Tiers & Approval Chain Setup
router.get('/config', authMiddleware, getDiscountConfigurationController);
router.put(
  '/config',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER),
  saveDiscountConfigurationController
);

export default router;
