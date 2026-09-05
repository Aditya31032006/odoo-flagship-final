import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export function getAccessCookieOptions() {
  const isProd = config.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    path: "/",
  };
}

/**
 * Signs a JWT containing essential user identity, role, and organization data
 */
export function signToken(user) {
  const payload = {
    id: user.id || user.user_id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobile: user.mobile || null,
    customer_id: user.customer_id || null,
    company_name: user.company_name || null,
    gst_number: user.gst_number || null,
    is_active: user.is_active !== undefined ? user.is_active : true,
  };
  return jwt.sign(payload, config.JWT_SECRET || 'dealflow360_secret_key_jwt', { expiresIn: "15d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET || 'dealflow360_secret_key_jwt');
  } catch (error) {
    console.error("Error in verifyToken:", error.message);
    throw error;
  }
}