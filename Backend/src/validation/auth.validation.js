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



export const loginValidation = [
  body('identifier')
    .optional({ values: 'falsy' })
    .trim(),
  body('email')
    .optional({ values: 'falsy' })
    .trim(),
  body('mobile')
    .optional({ values: 'falsy' })
    .trim(),
  body().custom((value, { req }) => {
    const identifier = (req.body.identifier || req.body.email || req.body.mobile || '').trim();
    if (!identifier) {
      throw new Error('Please enter your email address or mobile number');
    }
    return true;
  }),
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

export const updateProfileValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long'),
  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210)'),
  body('company_name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('gst_number')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format (15 characters, e.g. 27AABCU9603R1ZM)'),
  body('billing_address')
    .optional({ values: 'falsy' })
    .trim(),
  body('shipping_address')
    .optional({ values: 'falsy' })
    .trim(),
  validate
];

export const changePasswordValidation = [
  body('current_password')
    .optional({ values: 'falsy' })
    .trim(),
  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  validate
];

export const magicLoginValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Magic access token is required')
    .isJWT()
    .withMessage('Invalid magic token format'),
  validate
];