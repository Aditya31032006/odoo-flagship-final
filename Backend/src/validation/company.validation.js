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

// Indian GST Format: 2 digits (state) + 5 uppercase letters + 4 digits (PAN) + 1 letter + 1 entity digit + 'Z' + 1 checksum
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

export const createCompanyValidation = [
  body('company_name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Company name must be between 2 and 150 characters'),

  body('contact_name')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact person name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(MOBILE_REGEX)
    .withMessage('Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210)'),

  body('gst_number')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .custom((val) => {
      if (!val) return true;
      if (!GST_REGEX.test(val)) {
        throw new Error('Invalid GST Number format (e.g., 29ABCDE1234F1Z5)');
      }
      return true;
    }),

  body('billing_address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Billing address cannot exceed 500 characters'),

  body('shipping_address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Shipping address cannot exceed 500 characters'),

  validate
];

export const toggleCompanyStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid company ID is required'),

  body('is_active')
    .isBoolean()
    .withMessage('is_active must be a boolean (true or false)'),

  validate
];
