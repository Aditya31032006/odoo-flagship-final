import {
    createUserRepo,
    findUserRepo,
    updateUserPasswordRepo
} from '../repositories/auth.repository.js'
import {processImageToBase64} from "../utils/image.util.js"
import {hashPassword , verifyPassword} from '../utils/password.util.js'
import {signToken , getAccessCookieOptions} from '../utils/cookie.util.js'
import {addWelcomeEmailJob, addOtpEmailJob} from '../jobs/emailQueue.js'
import redisClient from '../config/redis.js'
import { STATUS_CODES } from '../constants/statusCodes.js'
import { MESSAGES } from '../constants/messages.js'

import config from '../config/config.js'

export const registerController = async (req , res , next)=>{
    try {
        const {name , email , password} = req.body

        const useEmail = email.toLowerCase()

        const user = await findUserRepo(useEmail)
        
        if(user){
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.ALREADY_EXISTS })
        }

        const hashedPassword = await hashPassword(password)
        const profileImage = processImageToBase64(req.file)

        const newUser = await createUserRepo({name,email:useEmail,password:hashedPassword,profile_photo_base64:profileImage})

        try {
            await addWelcomeEmailJob({ name: newUser.name, email: newUser.email });
        } catch (queueErr) {
            console.error('Failed to enqueue welcome email:', queueErr.message);
        }

        const token = signToken(newUser)
        res.cookie("auth_token", token, getAccessCookieOptions());
        return res.status(STATUS_CODES.CREATED).json({ message: MESSAGES.USER.CREATED, data: newUser })

    } catch (error) {
        next(error)
    }
}

export const loginController = async (req , res , next)=>{
    try {
        const {email , password} = req.body

        const useEmail = email.toLowerCase()

        const user = await findUserRepo(useEmail)
        
        if(!user){
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.USER_NOT_FOUND })
        }

        // Prevent password login for users registered strictly via Google OAuth
        if (!user.password_hash) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.OAUTH_USER_MANUAL_LOGIN_ERROR })
        }

        const isPasswordValid = await verifyPassword(password, user.password_hash)
        if(!isPasswordValid){
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.INVALID_CREDENTIALS })
        }

        const { password_hash, ...safeUser } = user;

        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());
        res.status(STATUS_CODES.OK).json({ message: MESSAGES.AUTH.LOGIN_SUCCESS, user: safeUser });

    } catch (error) {
        next(error)
    }
}

export const googleAuthCallbackController = async (req, res, next) => {
    try {
        const { password_hash, ...safeUser } = req.user;
        const token = signToken(safeUser);
        res.cookie("auth_token", token, getAccessCookieOptions());
        
        // Redirect to frontend application
        const frontendUrl = config.FRONTEND_ORIGIN || 'http://localhost:5173';
        return res.redirect(frontendUrl);
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
        const useEmail = email.toLowerCase();

        const user = await findUserRepo(useEmail);
        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ message: MESSAGES.AUTH.USER_NOT_FOUND });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP before storing in Redis
        const hashedOtp = await hashPassword(otp);

        // Store in Redis with TTL of 5 minutes (300 seconds)
        await redisClient.set(`otp:forgot-password:${useEmail}`, hashedOtp, 'EX', 300);

        // Send OTP email via BullMQ queue
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
        const useEmail = email.toLowerCase();

        // Retrieve hashed OTP from Redis
        const storedHashedOtp = await redisClient.get(`otp:forgot-password:${useEmail}`);
        if (!storedHashedOtp) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.OTP_EXPIRED_OR_NOT_FOUND });
        }

        // Verify provided OTP against the hashed OTP in Redis
        const isOtpValid = await verifyPassword(otp, storedHashedOtp);
        if (!isOtpValid) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ message: MESSAGES.AUTH.INVALID_OTP });
        }

        // Hash new password and update in database
        const hashedPassword = await hashPassword(new_password);
        await updateUserPasswordRepo(useEmail, hashedPassword);

        // Invalidate OTP in Redis
        await redisClient.del(`otp:forgot-password:${useEmail}`);

        return res.status(STATUS_CODES.OK).json({ message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS });
    } catch (error) {
        next(error);
    }
};