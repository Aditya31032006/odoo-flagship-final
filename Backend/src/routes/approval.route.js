import { Router } from 'express';
import {
  getApprovalsListController,
  getApprovalDetailController,
  submitApprovalDecisionController,
} from '../controllers/approval.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authMiddleware);

// Only Managers, Finance, and Admin can access the discount approval queue
router.get(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE),
  getApprovalsListController
);

router.get(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE),
  getApprovalDetailController
);

router.post(
  '/:id/decision',
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE),
  submitApprovalDecisionController
);

export default router;
