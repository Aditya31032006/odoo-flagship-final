import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import './config/passport.js';
import authRouter from './routes/auth.route.js';
import handleError from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Mount Authentication & OAuth Routes
app.use('/api/auth', authRouter);

// Global Error Handler
app.use(handleError);

export default app;