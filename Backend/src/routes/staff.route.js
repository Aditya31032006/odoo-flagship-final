import { Router } from 'express';
import {
    listStaffController,
    createStaffController,
    toggleStaffStatusController,
    updateStaffController,
    deleteStaffController
} from '../controllers/staff.controller.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';
import {
    createStaffValidation,
    updateStaffValidation,
    toggleStatusValidation
} from '../validation/staff.validation.js';

const router = Router();

// Protect all staff management endpoints for Admin only
router.use(authMiddleware);
router.use(authorizeRoles('admin'));

router.get('/', listStaffController);
router.post('/', createStaffValidation, createStaffController);
router.patch('/:id/status', toggleStatusValidation, toggleStaffStatusController);
router.put('/:id', updateStaffValidation, updateStaffController);
router.delete('/:id', deleteStaffController);

export default router;
