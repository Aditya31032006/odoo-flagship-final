import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export function getAccessCookieOptions() {
    const isProd = config.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000,
      path: "/",
    };
  }

export function signToken(user){
    const payload = {
        id: user.id || user.user_id,
        email: user.email,
        name: user.name,
    };
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "15d" });
}

export function verifyToken(token){
    try {
        return jwt.verify(token, config.JWT_SECRET)
    } catch (error) {
        console.error("Error in verifyToken:", error);
        throw error;
    }
}