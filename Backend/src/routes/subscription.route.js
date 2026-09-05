import { Router } from 'express';
import {
  getSubscriptionsList,
  getSubscriptionDetail,
  getSubscriptionPlans,
  createSubscriptionPlan,
  modifySubscription,
  cancelSubscription,
} from '../controllers/subscription.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Subscriptions & Plans
router.get('/', getSubscriptionsList);
router.get('/plans', getSubscriptionPlans);
router.post('/plans', createSubscriptionPlan);
router.get('/:id', getSubscriptionDetail);
router.patch('/:id/modify', modifySubscription);
router.post('/:id/cancel', cancelSubscription);

export default router;
