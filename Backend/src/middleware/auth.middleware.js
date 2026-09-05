import { verifyToken } from '../utils/cookie.util.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { MESSAGES } from '../constants/messages.js';

/**
 * Authentication middleware that verifies JWT from cookies or Authorization Bearer header.
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.AUTH.INVALID_TOKEN });
  }
};

export default authMiddleware;
