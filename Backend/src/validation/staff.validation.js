import { body, param, validationResult } from "express-validator";
import { STATUS_CODES } from "../constants/statusCodes.js";

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
      message: errors.array()[0].msg, 
      errors: errors.array() 
    });
  }
  next();
}

const STAFF_ROLES = ['sales_rep', 'sales_manager', 'finance', 'operations', 'admin'];

export const createStaffValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Staff member full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Staff email address is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  body('role')
    .trim()
    .notEmpty()
    .withMessage('Staff role is required')
    .isIn(STAFF_ROLES)
    .withMessage('Role must be one of: sales_rep, sales_manager, finance, operations, admin'),

  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210)'),

  validate
];

export const updateStaffValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid staff user ID is required'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('role')
    .optional()
    .trim()
    .isIn(STAFF_ROLES)
    .withMessage('Role must be one of: sales_rep, sales_manager, finance, operations, admin'),

  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210)'),

  validate
];

export const toggleStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid staff user ID is required'),

  body('is_active')
    .isBoolean()
    .withMessage('is_active must be a boolean (true or false)'),

  validate
];
