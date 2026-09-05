import express from 'express'
import multer from "multer";
import {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation
} from "../validation/auth.validation.js"
import passport from 'passport';
import {
    registerController,
    loginController,
    logoutController,
    forgotPasswordController,
    resetPasswordController,
    googleAuthCallbackController
} from '../controllers/auth.controller.js'
import authMiddleware from '../middleware/auth.middleware.js'

import { STATUS_CODES } from '../constants/statusCodes.js';
import { MESSAGES } from '../constants/messages.js';

const authRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage() });

authRouter.post('/register', upload.single('profile_photo'), registerValidation, registerController);
authRouter.post('/login', loginValidation, loginController);
authRouter.get('/logout', authMiddleware, logoutController);
authRouter.post('/forgot-password', forgotPasswordValidation, forgotPasswordController);
authRouter.post('/reset-password', resetPasswordValidation, resetPasswordController);

// Google OAuth Routes
authRouter.get(
    '/google',
    passport.authenticate('google', {
        scope: ['email', 'profile'],
        session: false,
    })
);

authRouter.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login',
    }),
    googleAuthCallbackController
);

authRouter.get('/me', authMiddleware, (req, res) => {
    res.status(STATUS_CODES.OK).json({ message: MESSAGES.USER.RETRIEVED, user: req.user });
});

export default authRouter;