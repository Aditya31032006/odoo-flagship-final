import { Router } from 'express';
import {
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
} from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All payment endpoints require authentication
router.use(authMiddleware);

// Razorpay Order Creation & Verification
router.post('/razorpay/create-order', createRazorpayOrderController);
router.post('/razorpay/verify-payment', verifyRazorpayPaymentController);

export default router;
