import { Router } from 'express';
import {
  listCompaniesController,
  getCompanyByIdController,
  createCompanyController,
  toggleCompanyStatusController,
} from '../controllers/company.controller.js';
import {
  createCompanyValidation,
  toggleCompanyStatusValidation,
} from '../validation/company.validation.js';
import { authMiddleware, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all company endpoints for authenticated staff/admin
router.use(authMiddleware);

// List companies accessible to admin, sales reps, sales managers, operations
router.get('/', authorizeRoles('admin', 'sales_manager', 'sales_rep', 'operations'), listCompaniesController);
router.get('/:id', authorizeRoles('admin', 'sales_manager', 'sales_rep', 'operations'), getCompanyByIdController);

// Creation & status toggling restricted to admin and sales managers with strict express-validator
router.post('/', authorizeRoles('admin', 'sales_manager'), createCompanyValidation, createCompanyController);
router.patch('/:id/status', authorizeRoles('admin', 'sales_manager'), toggleCompanyStatusValidation, toggleCompanyStatusController);

export default router;
