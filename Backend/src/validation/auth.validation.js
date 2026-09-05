import { body, validationResult } from "express-validator"
import { STATUS_CODES } from "../constants/statusCodes.js"

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({ errors: errors.array() });
  }
  next();
}

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validate
]

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
]

export const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  validate
]

export const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('A valid 6-digit OTP is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validate
]