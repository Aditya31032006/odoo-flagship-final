import { verifyToken } from '../utils/cookie.util.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { MESSAGES } from '../constants/messages.js';

/**
 * Authentication middleware that verifies JWT from cookies or Authorization Bearer header.
 * Attaches decoded user payload ({ id, name, email, role, customer_id, company_name, is_active }) to req.user.
 */
export const authMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.auth_token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.AUTH.NO_TOKEN });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.AUTH.INVALID_TOKEN });
    }

    if (decoded.is_active === false) {
      return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'User account is deactivated.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.AUTH.INVALID_TOKEN });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(STATUS_CODES.FORBIDDEN).json({
        message: 'Access forbidden: You do not have the required role permissions.'
      });
    }
    next();
  };
};

export default authMiddleware;
