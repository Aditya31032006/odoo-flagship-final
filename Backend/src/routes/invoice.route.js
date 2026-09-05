import { Router } from 'express';
import {
  getInvoicesList,
  getInvoiceMeta,
  getInvoiceDetail,
  createInvoice,
  recordPayment,
} from '../controllers/invoice.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getInvoicesList);
router.get('/meta', getInvoiceMeta);
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.FINANCE), createInvoice);
router.get('/:id', getInvoiceDetail);
router.post('/:id/payments', authorizeRoles(ROLES.ADMIN, ROLES.FINANCE), recordPayment);

export default router;
