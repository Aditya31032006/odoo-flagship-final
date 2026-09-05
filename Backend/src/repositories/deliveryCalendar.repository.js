import { pool } from '../config/database.js';
import {
  GET_DELIVERY_CALENDAR_EVENTS_ALL,
  GET_DELIVERY_CALENDAR_EVENTS_BY_CUSTOMER_USER,
} from '../queries/deliveryCalendar.query.js';

export const getDeliveryCalendarRepo = async (userId, userRole, userEmail = '') => {
  const client = await pool.connect();
  try {
    let result;
    const isCustomer = userRole === 'customer';

    if (isCustomer) {
      result = await client.query(GET_DELIVERY_CALENDAR_EVENTS_BY_CUSTOMER_USER, [userId, userEmail]);
    } else {
      result = await client.query(GET_DELIVERY_CALENDAR_EVENTS_ALL);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let todayCount = 0;
    let totalPendingCount = 0;
    let overdueCount = 0;
    let deliveredCount = 0;

    const events = result.rows.map((row) => {
      let deliveryDateStr = '';
      if (row.scheduled_delivery_date) {
        try {
          const d = new Date(row.scheduled_delivery_date);
          deliveryDateStr = d.toISOString().split('T')[0];
        } catch {
          deliveryDateStr = String(row.scheduled_delivery_date).split('T')[0];
        }
      }

      // Determine delivery status
      let deliveryStatus = 'pending';
      const orderStatus = (row.order_status || '').toLowerCase();

      if (orderStatus === 'fulfilled') {
        deliveryStatus = 'delivered';
        deliveredCount++;
      } else if (deliveryDateStr && deliveryDateStr < todayStr) {
        deliveryStatus = 'overdue';
        overdueCount++;
      } else if (orderStatus === 'processing') {
        deliveryStatus = 'shipped';
        totalPendingCount++;
      } else {
        deliveryStatus = 'pending';
        totalPendingCount++;
      }

      if (deliveryDateStr === todayStr && deliveryStatus !== 'delivered') {
        todayCount++;
      }

      return {
        order_id: row.order_id,
        order_number: row.order_number,
        order_status: row.order_status,
        order_date: row.order_date,
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        quotation_number: row.quotation_number,
        grand_total: row.grand_total,
        max_lead_time_days: parseInt(row.max_lead_time_days, 10) || 2,
        items: row.items || [],
        warehouses_display: row.warehouses_display || 'Main Warehouse',
        scheduled_delivery_date: deliveryDateStr,
        delivery_status: deliveryStatus,
      };
    });

    return {
      summary: {
        today_count: todayCount,
        total_pending: totalPendingCount,
        overdue_count: overdueCount,
        delivered_count: deliveredCount,
        total_orders: events.length,
      },
      events,
      isCustomer,
    };
  } catch (error) {
    console.error('Error in getDeliveryCalendarRepo:', error);
    throw error;
  } finally {
    client.release();
  }
};
