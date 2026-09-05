import { Router } from 'express';
import {
  getNegotiationController,
  submitCounterOfferController,
  addMessageController,
  acceptQuotationController,
} from '../controllers/negotiation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All negotiation endpoints require valid session
router.use(authMiddleware);

router.get('/:quotationId', getNegotiationController);
router.post('/:quotationId/counter', submitCounterOfferController);
router.post('/:quotationId/messages', addMessageController);
router.post('/:quotationId/accept', acceptQuotationController);

export default router;
