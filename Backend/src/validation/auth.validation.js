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
  body('email').trim().isEmail().withMessage('A valid email address is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('mobile').optional().trim(),
  // If register_type === 'company':
  body('company_name')
    .if(body('register_type').equals('company'))
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

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

export const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  validate
];

export const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('A valid 6-digit OTP is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validate
];