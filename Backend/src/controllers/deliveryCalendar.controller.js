import { getDeliveryCalendarRepo } from '../repositories/deliveryCalendar.repository.js';

export const getDeliveryCalendarController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userEmail = req.user?.email || '';

    const data = await getDeliveryCalendarRepo(userId, userRole, userEmail);

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
