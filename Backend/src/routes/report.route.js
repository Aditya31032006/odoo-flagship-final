import express from 'express';
import {
  getReportAnalytics,
  getReportFilterMeta,
  exportReportCSV,
} from '../controllers/report.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protected reporting endpoints
router.get('/analytics', authMiddleware, getReportAnalytics);
router.get('/meta', authMiddleware, getReportFilterMeta);
router.get('/export-csv', authMiddleware, exportReportCSV);

export default router;
