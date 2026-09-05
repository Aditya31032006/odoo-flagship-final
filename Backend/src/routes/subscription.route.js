import { Router } from 'express';
import {
  getSubscriptionsList,
  getSubscriptionDetail,
  getSubscriptionPlans,
  createSubscriptionPlan,
  modifySubscription,
  cancelSubscription,
} from '../controllers/subscription.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

// Subscriptions & Plans
router.get('/', getSubscriptionsList);
router.get('/plans', getSubscriptionPlans);
router.post('/plans', authorizeRoles(ROLES.ADMIN, ROLES.FINANCE), createSubscriptionPlan);
router.get('/:id', getSubscriptionDetail);
router.patch('/:id/modify', authorizeRoles(ROLES.ADMIN, ROLES.FINANCE), modifySubscription);
router.post('/:id/cancel', authorizeRoles(ROLES.ADMIN, ROLES.FINANCE), cancelSubscription);

export default router;
