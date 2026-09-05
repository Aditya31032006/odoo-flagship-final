import { Router } from 'express';
import { getDeliveryCalendarController } from '../controllers/deliveryCalendar.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// GET /api/delivery-calendar - Returns scheduled delivery events filtered by role
router.get('/', getDeliveryCalendarController);

export default router;
