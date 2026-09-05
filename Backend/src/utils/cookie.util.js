import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export function getAccessCookieOptions(maxAgeMs = 15 * 24 * 60 * 60 * 1000) {
  const isProd = config.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
}

/**
 * Signs a JWT containing essential user identity, role, and organization data
 */
export function signToken(user, expiresIn = "15d") {
  const payload = {
    id: user.id || user.user_id,
    name: user.name || user.user_name || 'Customer',
    email: user.email,
    role: user.role || 'customer',
    mobile: user.mobile || null,
    customer_id: user.customer_id || null,
    company_name: user.company_name || null,
    gst_number: user.gst_number || null,
    is_active: user.is_active !== undefined ? user.is_active : true,
    ...(user.quotation_id ? { quotation_id: user.quotation_id } : {}),
    ...(user.type ? { type: user.type } : {}),
  };
  return jwt.sign(payload, config.JWT_SECRET || 'dealflow360_secret_key_jwt', { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET || 'dealflow360_secret_key_jwt');
  } catch (error) {
    console.warn("verifyToken warning:", error.message);
    throw error;
  }
}