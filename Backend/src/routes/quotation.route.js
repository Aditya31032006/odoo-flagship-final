import { Router } from 'express';
import {
  getQuotationsController,
  getQuotationsSummaryController,
  getQuotationDetailController
} from '../controllers/quotation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All quotation endpoints require authentication
router.use(authMiddleware);

router.get('/', getQuotationsController);
router.get('/summary', getQuotationsSummaryController);
router.get('/:id', getQuotationDetailController);

export default router;
