import express from 'express';
import {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    completeOnboardingValidation,
    updateProfileValidation,
    changePasswordValidation
} from "../validation/auth.validation.js";
import passport from 'passport';
import {
    registerController,
    loginController,
    logoutController,
    getMeController,
    getCompaniesController,
    completeOnboardingController,
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
authRouter.post('/register', registerValidation, registerController);
authRouter.post('/login', loginValidation, loginController);
authRouter.get('/logout', authMiddleware, logoutController);
authRouter.get('/me', authMiddleware, getMeController);
authRouter.get('/companies', getCompaniesController);
authRouter.post('/complete-onboarding', authMiddleware, completeOnboardingValidation, completeOnboardingController);
authRouter.post('/forgot-password', forgotPasswordValidation, forgotPasswordController);
authRouter.post('/reset-password', resetPasswordValidation, resetPasswordController);

// Profile Management Routes
authRouter.get('/profile', authMiddleware, getProfileController);
authRouter.put('/profile', authMiddleware, updateProfileValidation, updateProfileController);
authRouter.put('/change-password', authMiddleware, changePasswordValidation, changePasswordController);

// Google OAuth Routes
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
        failureRedirect: '/login',
    }),
    googleAuthCallbackController
);

export default authRouter;