import { Router } from 'express';
import {
  getInvoicesList,
  getInvoiceDetail,
  recordPayment,
} from '../controllers/invoice.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getInvoicesList);
router.get('/:id', getInvoiceDetail);
router.post('/:id/payments', recordPayment);

export default router;
