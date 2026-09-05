import {
    registerCompanyWithPrimaryUserRepo,
    registerEmployeeUnderCompanyRepo,
    completeUserOnboardingRepo,
    listActiveCompaniesRepo,
    findUserRepo,
    findUserByIdRepo,
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
 * Login user (automatically resolves role and company linkage from database)
 */
export const loginController = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const useEmail = email.toLowerCase().trim();

        const user = await findUserRepo(useEmail);
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
 * Get current logged in user details
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

        return res.status(STATUS_CODES.OK).json({
            message: MESSAGES.USER.RETRIEVED,
            user: freshUser
        });
    } catch (error) {
        next(error);
    }
};

export const googleAuthCallbackController = async (req, res, next) => {
    try {
        const { password_hash, ...safeUser } = req.user;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());

        const frontendUrl = config.FRONTEND_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
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