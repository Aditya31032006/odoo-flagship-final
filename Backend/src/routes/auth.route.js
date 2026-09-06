import express from 'express';
import {
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    updateProfileValidation,
    changePasswordValidation,
    magicLoginValidation
} from "../validation/auth.validation.js";
import passport from 'passport';
import config from '../config/config.js';
import {
    loginController,
    magicLoginController,
    logoutController,
    getMeController,
    getCompaniesController,
    forgotPasswordController,
    resetPasswordController,
    googleAuthCallbackController,
    getProfileController,
    updateProfileController,
    changePasswordController
} from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const authRouter = express.Router();

// Direct Auth & Session Routes
authRouter.post('/login', loginValidation, loginController);
authRouter.post('/magic-login', magicLoginValidation, magicLoginController);
authRouter.get('/logout', authMiddleware, logoutController);
authRouter.get('/me', authMiddleware, getMeController);
authRouter.get('/companies', getCompaniesController);
authRouter.post('/forgot-password', forgotPasswordValidation, forgotPasswordController);
authRouter.post('/reset-password', resetPasswordValidation, resetPasswordController);

// Profile Management Routes
authRouter.get('/profile', authMiddleware, getProfileController);
authRouter.put('/profile', authMiddleware, updateProfileValidation, updateProfileController);
authRouter.put('/change-password', authMiddleware, changePasswordValidation, changePasswordController);

// Google OAuth Routes (Login only)
const frontendUrl = config.FRONTEND_ORIGIN || 'http://localhost:5173';

authRouter.get(
    '/google',
    (req, res, next) => {
        const state = req.query.state ? req.query.state.toString() : undefined;
        passport.authenticate('google', {
            scope: ['email', 'profile'],
            session: false,
            state: state,
        })(req, res, next);
    }
);

authRouter.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${frontendUrl}/login?error=account_not_found`,
    }),
    googleAuthCallbackController
);

export default authRouter;