import {
    registerCompanyWithPrimaryUserRepo,
    registerEmployeeUnderCompanyRepo,
    completeUserOnboardingRepo,
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
import { addWelcomeEmailJob, addOtpEmailJob } from '../jobs/emailQueue.js';
import redisClient from '../config/redis.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { MESSAGES } from '../constants/messages.js';
import config from '../config/config.js';

/**
 * Register either:
 * 1. A new Company (B2B organization + primary user)
 * 2. An Employee under an existing Company (requires company_id)
 */
export const registerController = async (req, res, next) => {
    try {
        const {
            register_type = 'company', // 'company' | 'employee'
            name,
            email,
            password,
            mobile,
            // For Company registration:
            company_name,
            gst_number,
            company_email,
            company_phone,
            billing_address,
            shipping_address,
            // For Employee under company registration:
            company_id,
            employee_role = 'customer'
        } = req.body;

        const useEmail = email.toLowerCase().trim();

        const existingUser = await findUserRepo(useEmail);
        if (existingUser) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.ALREADY_EXISTS });
        }

        const hashedPassword = await hashPassword(password);
        let newUser;

        if (register_type === 'company') {
            if (!company_name || !company_name.trim()) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Company name is required for company registration.' });
            }

            newUser = await registerCompanyWithPrimaryUserRepo({
                company: {
                    company_name,
                    gst_number,
                    email: company_email || useEmail,
                    phone: company_phone || mobile,
                    billing_address,
                    shipping_address
                },
                user: {
                    name,
                    email: useEmail,
                    password_hash: hashedPassword,
                    mobile
                }
            });
        } else if (register_type === 'employee') {
            if (!company_id) {
                return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Company ID is required when registering as an employee under a company.' });
            }

            newUser = await registerEmployeeUnderCompanyRepo({
                company_id: Number(company_id),
                user: {
                    name,
                    email: useEmail,
                    password_hash: hashedPassword,
                    mobile
                },
                role: employee_role || 'customer'
            });
        } else {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Invalid registration type. Must be "company" or "employee".' });
        }

        // Send welcome email (non-blocking)
        try {
            await addWelcomeEmailJob({ name: newUser.name, email: newUser.email });
        } catch (queueErr) {
            console.error('Failed to enqueue welcome email:', queueErr.message);
        }

        const { password_hash, ...safeUser } = newUser;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        return res.status(STATUS_CODES.CREATED).json({
            message: MESSAGES.USER.CREATED,
            user: safeUser,
            token
        });
    } catch (error) {
        next(error);
    }
};

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
 * Complete onboarding for users (e.g. after Google OAuth signup)
 */
export const completeOnboardingController = async (req, res, next) => {
    try {
        const {
            register_type = 'company',
            company_name,
            gst_number,
            billing_address,
            company_id,
            mobile
        } = req.body;

        const userId = req.user.id;

        if (register_type === 'company' && (!company_name || !company_name.trim())) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Company name is required.' });
        }

        if (register_type === 'employee' && !company_id) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: 'Company ID is required.' });
        }

        const updatedUser = await completeUserOnboardingRepo({
            user_id: userId,
            register_type,
            company: {
                company_name,
                gst_number,
                billing_address
            },
            company_id: company_id ? Number(company_id) : null,
            mobile
        });

        const token = signToken(updatedUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        return res.status(STATUS_CODES.OK).json({
            message: 'Onboarding completed successfully',
            user: updatedUser,
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
        if (!req.user.isNew && req.user.user) {
            const { password_hash, ...safeUser } = req.user.user;

            if (!safeUser.is_active) {
                return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Your account is deactivated.')}`);
            }

            const token = signToken(safeUser);
            res.cookie("auth_token", token, getAccessCookieOptions());

            return res.redirect(`${frontendUrl}/`);
        }

        // 2. If new user -> Redirect to /onboarding with Google name & email pre-filled
        if (req.user.isNew && req.user.googleProfile) {
            const { name, email, avatar } = req.user.googleProfile;
            const params = new URLSearchParams({
                name: name || '',
                email: email || '',
                avatar: avatar || '',
                is_google: 'true',
            }).toString();

            return res.redirect(`${frontendUrl}/onboarding?${params}`);
        }

        return res.redirect(`${frontendUrl}/login`);
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