import {
    listActiveCompaniesRepo,
    findUserRepo,
    findUserByIdentifierRepo,
    findUserByIdRepo,
    getUserFullProfileRepo,
    updateUserProfileRepo,
    findUserWithPasswordByIdRepo,
    changeUserPasswordByIdRepo,
    updateUserPasswordRepo
} from '../repositories/auth.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.util.js';
import { signToken, getAccessCookieOptions } from '../utils/cookie.util.js';
import { addOtpEmailJob } from '../jobs/emailQueue.js';
import redisClient from '../config/redis.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { MESSAGES } from '../constants/messages.js';
import config from '../config/config.js';

/**
 * Login user via email/mobile and password
 */
export const loginController = async (req, res, next) => {
    try {
        const { email, mobile, identifier, password } = req.body;
        const targetIdentifier = (identifier || email || mobile || '').trim();

        if (!targetIdentifier) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Email address or mobile number is required' });
        }

        const user = await findUserByIdentifierRepo(targetIdentifier);
        if (!user) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.USER_NOT_FOUND });
        }

        if (!user.is_active) {
            return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'Your account is deactivated. Please contact your administrator.' });
        }

        if (!user.password_hash) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.OAUTH_USER_MANUAL_LOGIN_ERROR });
        }

        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.INVALID_CREDENTIALS });
        }

        const { password_hash, ...safeUser } = user;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        return res.status(STATUS_CODES.OK).json({
            message: MESSAGES.AUTH.LOGIN_SUCCESS,
            user: safeUser,
            token
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get list of registered companies for employee registration selection
 */
export const getCompaniesController = async (req, res, next) => {
    try {
        const companies = await listActiveCompaniesRepo();
        return res.status(STATUS_CODES.OK).json({
            companies
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current logged in user details and re-issue fresh JWT token with updated role/permissions
 */
export const getMeController = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: MESSAGES.AUTH.UNAUTHORIZED });
        }

        const freshUser = await findUserByIdRepo(req.user.id);
        if (!freshUser) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER.NOT_FOUND });
        }

        if (freshUser.is_active === false) {
            res.clearCookie("auth_token", getAccessCookieOptions());
            return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'Your account has been deactivated. Please contact your administrator.' });
        }

        // Auto re-issue fresh JWT token containing the latest role & user properties
        const { password_hash, ...safeUser } = freshUser;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        return res.status(STATUS_CODES.OK).json({
            message: MESSAGES.USER.RETRIEVED,
            user: safeUser,
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Magic Link verification and auto-login for 15-minute quotation action links
 */
export const magicLoginController = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Magic access token is required.' });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(STATUS_CODES.UNAUTHORIZED).json({
                    expired: true,
                    message: 'This instant-access link has expired (15-minute limit). Please log in with your credentials to view your quotation.'
                });
            }
            return res.status(STATUS_CODES.UNAUTHORIZED).json({
                message: 'Invalid magic access link. Please log in with your credentials.'
            });
        }

        if (!decoded || decoded.type !== 'magic_quotation_link' || !decoded.id) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({
                message: 'This access token is not valid for quotation instant-access.'
            });
        }

        const user = await findUserByIdRepo(decoded.id);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: 'User account not found.' });
        }

        if (user.is_active === false) {
            return res.status(STATUS_CODES.FORBIDDEN).json({ message: 'User account has been deactivated.' });
        }

        const { password_hash, ...safeUser } = user;
        // Issue 15-minute temporary session cookie on unauthenticated device
        const sessionToken = signToken(safeUser, '15m');
        res.cookie("auth_token", sessionToken, getAccessCookieOptions(15 * 60 * 1000));

        return res.status(STATUS_CODES.OK).json({
            message: 'Magic access authenticated successfully.',
            user: safeUser,
            token: sessionToken,
            quotation_id: decoded.quotation_id
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed profile information (User + Company/Customer details)
 */
export const getProfileController = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profile = await getUserFullProfileRepo(userId);
        if (!profile) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER.NOT_FOUND });
        }

        return res.status(STATUS_CODES.OK).json({
            message: 'Profile retrieved successfully',
            profile
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update editable profile information (Name, Mobile, Company Details if primary)
 */
export const updateProfileController = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const {
            name,
            mobile,
            company_name,
            gst_number,
            billing_address,
            shipping_address
        } = req.body;

        const updatedProfile = await updateUserProfileRepo(userId, {
            name,
            mobile,
            company_name,
            gst_number,
            billing_address,
            shipping_address
        });

        // Sign updated token and refresh cookie
        const { password_hash, ...safeUser } = updatedProfile;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        return res.status(STATUS_CODES.OK).json({
            message: 'Profile updated successfully',
            user: safeUser,
            profile: updatedProfile,
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change current user password (verifies old password first)
 */
export const changePasswordController = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        const user = await findUserWithPasswordByIdRepo(userId);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.USER.NOT_FOUND });
        }

        // If user already has a password set, enforce current password verification
        const hasExistingPassword = Boolean(user.password_hash && user.password_hash.trim());
        if (hasExistingPassword) {
            if (!current_password) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                    message: 'Current password is required to change your password.' 
                });
            }
            const isCurrentValid = await verifyPassword(current_password, user.password_hash);
            if (!isCurrentValid) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                    message: 'Current password is incorrect.' 
                });
            }
        }

        const hashedNewPassword = await hashPassword(new_password);
        await changeUserPasswordByIdRepo(userId, hashedNewPassword);

        return res.status(STATUS_CODES.OK).json({
            message: hasExistingPassword 
                ? 'Password changed successfully!' 
                : 'Password set successfully! You can now log in using your email and password.'
        });
    } catch (error) {
        next(error);
    }
};

export const googleAuthCallbackController = async (req, res, next) => {
    try {
        const frontendUrl = config.FRONTEND_ORIGIN || 'http://localhost:5173';

        // 1. If user already exists in DB -> Log them in directly via httpOnly cookie
        if (req.user && req.user.user) {
            const { password_hash, ...safeUser } = req.user.user;

            if (!safeUser.is_active) {
                return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Your account is deactivated. Please contact your administrator.')}`);
            }

            const token = signToken(safeUser);
            res.cookie("auth_token", token, getAccessCookieOptions());

            return res.redirect(`${frontendUrl}/`);
        }

        // 2. If user is not registered in the system -> redirect to login with error
        return res.redirect(`${frontendUrl}/login?error=account_not_found`);
    } catch (error) {
        next(error);
    }
};

export const logoutController = async (req, res, next) => {
    try {
        res.clearCookie("auth_token", getAccessCookieOptions());
        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.AUTH.LOGOUT_SUCCESS });
    } catch (error) {
        next(error);
    }
};

export const forgotPasswordController = async (req, res, next) => {
    try {
        const { email } = req.body;
        const useEmail = email.toLowerCase().trim();

        const user = await findUserRepo(useEmail);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.AUTH.USER_NOT_FOUND });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await hashPassword(otp);

        await redisClient.set(`otp:forgot-password:${useEmail}`, hashedOtp, 'EX', 300);

        try {
            await addOtpEmailJob({ email: useEmail, otp });
        } catch (queueErr) {
            console.error('Failed to enqueue OTP email:', queueErr.message);
        }

        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.AUTH.OTP_SENT });
    } catch (error) {
        next(error);
    }
};

export const resetPasswordController = async (req, res, next) => {
    try {
        const { email, otp, new_password } = req.body;
        const useEmail = email.toLowerCase().trim();

        const storedHashedOtp = await redisClient.get(`otp:forgot-password:${useEmail}`);
        if (!storedHashedOtp) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.OTP_EXPIRED_OR_NOT_FOUND });
        }

        const isOtpValid = await verifyPassword(otp, storedHashedOtp);
        if (!isOtpValid) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.INVALID_OTP });
        }

        const hashedPassword = await hashPassword(new_password);
        await updateUserPasswordRepo(useEmail, hashedPassword);
        await redisClient.del(`otp:forgot-password:${useEmail}`);

        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS });
    } catch (error) {
        next(error);
    }
};