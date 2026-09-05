import { Router } from 'express';
import {
  getQuotationsController,
  getQuotationsSummaryController,
  getQuotationDetailController,
  createQuotationController,
  updateQuotationController,
  submitApprovalController,
} from '../controllers/quotation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getQuotationsController);
router.post('/', createQuotationController);
router.get('/summary', getQuotationsSummaryController);
router.get('/:id', getQuotationDetailController);
router.put('/:id', updateQuotationController);
router.post('/:id/submit-approval', submitApprovalController);

export default router;
