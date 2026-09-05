import { body, validationResult } from "express-validator";
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

export const registerValidation = [
  body('register_type')
    .optional()
    .isIn(['company', 'employee'])
    .withMessage('Register type must be either "company" or "employee"'),
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('mobile').optional().trim(),
  // If register_type === 'company' or default:
  body('company_name')
    .if((value, { req }) => !req.body.register_type || req.body.register_type === 'company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required when registering a company'),
  // If register_type === 'employee':
  body('company_id')
    .if(body('register_type').equals('employee'))
    .notEmpty()
    .withMessage('Company ID is required when registering as an employee under a company'),
  validate
];

export const completeOnboardingValidation = [
  body('register_type')
    .optional()
    .isIn(['company', 'employee'])
    .withMessage('Register type must be either "company" or "employee"'),
  body('company_name')
    .if((value, { req }) => !req.body.register_type || req.body.register_type === 'company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required when registering a company'),
  body('company_id')
    .if(body('register_type').equals('employee'))
    .notEmpty()
    .withMessage('Company ID is required when registering as an employee under a company'),
  body('mobile').optional().trim(),
  validate
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

export const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  validate
];

export const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('A valid 6-digit numeric OTP is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validate
];