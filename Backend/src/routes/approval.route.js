import { Router } from 'express';
import {
  getApprovalsListController,
  getApprovalDetailController,
  submitApprovalDecisionController,
} from '../controllers/approval.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getApprovalsListController);
router.get('/:id', getApprovalDetailController);
router.post('/:id/decision', submitApprovalDecisionController);

export default router;
