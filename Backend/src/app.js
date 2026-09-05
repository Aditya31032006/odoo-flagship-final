import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import './config/passport.js';
import authRouter from './routes/auth.route.js';
import dashboardRouter from './routes/dashboard.route.js';
import quotationRouter from './routes/quotation.route.js';
import catalogRouter from './routes/catalog.route.js';
import staffRouter from './routes/staff.route.js';
import handleError from './middleware/error.middleware.js';
import config from './config/config.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_ORIGIN ? [config.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'] : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Mount Feature API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/quotations', quotationRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/staff', staffRouter);
app.use('/staff', staffRouter);

// Global Error Handler
app.use(handleError);

export default app;