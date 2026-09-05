import { getDeliveryCalendarRepo } from '../repositories/deliveryCalendar.repository.js';
import { resolveUserCustomerId } from './quotation.controller.js';

export const getDeliveryCalendarController = async (req, res) => {
  try {
    const user = req.user;
    const userId = user?.id;
    const userRole = user?.role;
    const userEmail = user?.email || '';
    let customerId = null;

    if (userRole === 'customer') {
      customerId = await resolveUserCustomerId(user);
    }

    const data = await getDeliveryCalendarRepo(userId, userRole, userEmail, customerId);

    return res.status(200).json({
      success: true,
      message: 'Delivery calendar data retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Error in getDeliveryCalendarController:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch delivery calendar data',
    });
  }
};
