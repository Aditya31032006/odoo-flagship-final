import { Router } from 'express';
import {
  getDiscountConfigurationController,
  saveDiscountConfigurationController,
} from '../controllers/discountRules.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Routes for Discount Tiers & Approval Chain Setup
router.get('/config', authMiddleware, getDiscountConfigurationController);
router.put('/config', authMiddleware, saveDiscountConfigurationController);

export default router;
