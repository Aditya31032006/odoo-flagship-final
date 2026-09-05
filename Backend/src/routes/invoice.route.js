import { Router } from 'express';
import {
  getInvoicesList,
  getInvoiceMeta,
  getInvoiceDetail,
  createInvoice,
  recordPayment,
} from '../controllers/invoice.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getInvoicesList);
router.get('/meta', getInvoiceMeta);
router.post('/', createInvoice);
router.get('/:id', getInvoiceDetail);
router.post('/:id/payments', recordPayment);

export default router;
