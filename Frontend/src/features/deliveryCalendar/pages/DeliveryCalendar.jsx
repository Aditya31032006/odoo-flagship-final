import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { deliveryCalendarApi } from '../services/deliveryCalendar.api.js';
import BackButton from '../../../shared/components/BackButton.jsx';
import '../styles/deliveryCalendar.scss';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatCurrency(amount) {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Format a date string in Indian Standard Time (IST)
 */
export function formatISTDate(dateStr, includeWeekday = true) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const options = {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    if (includeWeekday) {
      options.weekday = 'short';
    }
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Format a timestamp with time in Indian Standard Time (IST)
 */
export function formatISTDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return `${formatted} IST`;
  } catch {
    return dateStr;
  }
}

export const DeliveryCalendar = () => {
  const navigate = useNavigate();

  const [calendarData, setCalendarData] = useState({
    summary: { today_count: 0, total_pending: 0, overdue_count: 0, delivered_count: 0, total_orders: 0 },
    events: [],
    isCustomer: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Current Calendar View Date in IST
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchCalendar = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await deliveryCalendarApi.getCalendarData();
      if (data) {
        setCalendarData(data);
      }
    } catch (err) {
      console.error('Failed to load delivery calendar:', err);
      setError('Unable to load delivery schedule.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group events by delivery date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    (calendarData.events || []).forEach((ev) => {
      if (ev.scheduled_delivery_date) {
        if (!map[ev.scheduled_delivery_date]) {
          map[ev.scheduled_delivery_date] = [];
        }
        map[ev.scheduled_delivery_date].push(ev);
      }
    });
    return map;
  }, [calendarData.events]);

  // Generate Calendar Grid Matrix (Mon-Sun)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();

    // In JS, getDay() returns 0 for Sunday, 1 for Monday... 6 for Saturday.
    // We want Mon=0, Tue=1 ... Sun=6
    let startingDayIndex = firstDayOfMonth.getDay() - 1;
    if (startingDayIndex === -1) startingDayIndex = 6;

    const days = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateKey = prevDate.toISOString().split('T')[0];
      days.push({
        dayNum,
        dateKey,
        isCurrentMonth: false,
        events: eventsByDate[dateKey] || [],
      });
    }

    // Current month days (IST local)
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        events: eventsByDate[dateKey] || [],
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateKey = nextDate.toISOString().split('T')[0];
      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: false,
        events: eventsByDate[dateKey] || [],
      });
    }

    return days;
  }, [year, month, eventsByDate]);

  // Upcoming Deliveries Feed (sorted ascending by scheduled delivery date)
  const upcomingDeliveries = useMemo(() => {
    return [...(calendarData.events || [])]
      .filter((e) => e.delivery_status !== 'delivered')
      .sort((a, b) => (a.scheduled_delivery_date || '').localeCompare(b.scheduled_delivery_date || ''))
      .slice(0, 10);
  }, [calendarData.events]);

  const summary = calendarData.summary || { today_count: 0, total_pending: 0, overdue_count: 0 };

  return (
    <div className="df-calendar-page">
      <div className="df-calendar-page__container">
        {/* Uniform Back Navigation */}
        <BackButton to="/dashboard" label="Back to Dashboard" />

        {/* Header matching Reference */}
        <div className="df-calendar-page__header">
          <h1 className="df-calendar-page__header-title">
            <span>📅</span>
            {calendarData.isCustomer ? 'My Delivery Schedule' : 'Service & Delivery Operations'}
          </h1>
          <p className="df-calendar-page__header-subtitle">
            {calendarData.isCustomer
              ? 'Real-time scheduled shipment arrivals computed in Indian Standard Time (IST) using maximum product lead times'
              : 'Multi-warehouse shipment schedules and delivery operations tracking (All times in IST)'}
          </p>
        </div>

        {/* Top 3 KPI Metric Cards matching Reference */}
        <div className="df-calendar-page__kpi-grid">
          {/* Card 1: Today's Schedule */}
          <div className="df-calendar-page__kpi-card">
            <div className="df-calendar-page__kpi-card-label">
              <span>Today's Schedule (IST)</span>
              <span>📦</span>
            </div>
            <div className="df-calendar-page__kpi-card-count df-calendar-page__kpi-card-count--today">
              {summary.today_count} {summary.today_count === 1 ? 'Delivery' : 'Deliveries'}
            </div>
            <div className="df-calendar-page__kpi-card-desc">
              <span>📅</span> Scheduled to arrive today
            </div>
          </div>

          {/* Card 2: Total Pending */}
          <div className="df-calendar-page__kpi-card">
            <div className="df-calendar-page__kpi-card-label">
              <span>Total Pending</span>
              <span>📋</span>
            </div>
            <div className="df-calendar-page__kpi-card-count df-calendar-page__kpi-card-count--pending">
              {summary.total_pending} {summary.total_pending === 1 ? 'Order' : 'Orders'}
            </div>
            <div className="df-calendar-page__kpi-card-desc">
              <span>🚚</span> In transit or scheduled for dispatch
            </div>
          </div>

          {/* Card 3: Overdue Work */}
          <div className="df-calendar-page__kpi-card">
            <div className="df-calendar-page__kpi-card-label">
              <span>Overdue Work</span>
              <span>⚠️</span>
            </div>
            <div className="df-calendar-page__kpi-card-count df-calendar-page__kpi-card-count--overdue">
              {summary.overdue_count} {summary.overdue_count === 1 ? 'Overdue' : 'Overdue'}
            </div>
            <div className="df-calendar-page__kpi-card-desc">
              <span>⏱</span> Exceeded estimated lead time date
            </div>
          </div>
        </div>

        {/* Main Layout: Left Sidebar + Monthly Calendar Grid */}
        <div className="df-calendar-page__layout">
          {/* Left Sidebar: Legend & Upcoming Feed */}
          <div className="df-calendar-page__sidebar">
            {/* Task Legend Card */}
            <div className="df-calendar-page__sidebar-card">
              <h3 className="df-calendar-page__sidebar-card-title">Delivery Legend</h3>
              <ul className="df-calendar-page__legend-list">
                <li className="df-calendar-page__legend-item">
                  <span className="df-dot df-dot--delivered" />
                  <span>Delivered / Completed</span>
                </li>
                <li className="df-calendar-page__legend-item">
                  <span className="df-dot df-dot--shipped" />
                  <span>In Transit / Shipped</span>
                </li>
                <li className="df-calendar-page__legend-item">
                  <span className="df-dot df-dot--pending" />
                  <span>Scheduled / Processing</span>
                </li>
                <li className="df-calendar-page__legend-item">
                  <span className="df-dot df-dot--overdue" />
                  <span>Delivery Delayed</span>
                </li>
              </ul>
            </div>

            {/* Upcoming Deliveries Quick Feed */}
            <div className="df-calendar-page__sidebar-card">
              <h3 className="df-calendar-page__sidebar-card-title">
                {calendarData.isCustomer ? 'My Upcoming Deliveries' : 'Upcoming Queue'}
              </h3>
              {upcomingDeliveries.length === 0 ? (
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>
                  No pending deliveries in queue.
                </div>
              ) : (
                <div className="df-calendar-page__upcoming-list">
                  {upcomingDeliveries.map((item) => (
                    <div
                      key={item.order_id}
                      className="df-calendar-page__upcoming-item"
                      onClick={() => setSelectedEvent(item)}
                    >
                      <div className="df-calendar-page__upcoming-item-header">
                        <span className="df-calendar-page__upcoming-item-code">{item.order_number}</span>
                        <span className="df-calendar-page__upcoming-item-date">
                          {formatISTDate(item.scheduled_delivery_date, false)}
                        </span>
                      </div>
                      <div className="df-calendar-page__upcoming-item-customer">
                        {item.customer_name}
                      </div>
                      <div className="df-calendar-page__upcoming-item-lead">
                        Max Lead Time: {item.max_lead_time_days}d ({item.items?.length || 1} items)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Monthly Calendar */}
          <div className="df-calendar-page__main">
            {/* Calendar Controls */}
            <div className="df-calendar-page__controls">
              <div className="df-calendar-page__controls-left">
                <h2 className="df-calendar-page__controls-title">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <div className="df-calendar-page__controls-nav">
                  <button
                    type="button"
                    className="df-calendar-page__controls-btn"
                    onClick={handlePrevMonth}
                    title="Previous Month"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="df-calendar-page__controls-btn df-calendar-page__controls-btn--today"
                    onClick={handleToday}
                  >
                    TODAY
                  </button>
                  <button
                    type="button"
                    className="df-calendar-page__controls-btn"
                    onClick={handleNextMonth}
                    title="Next Month"
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="df-calendar-page__controls-view-badge">
                MONTH
              </div>
            </div>

            {/* Days Header (MON - SUN) */}
            <div className="df-calendar-page__days-header">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="df-calendar-page__day-name">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="df-calendar-page__grid">
              {calendarDays.map((cell, idx) => (
                <div
                  key={`${cell.dateKey}-${idx}`}
                  className={`df-calendar-page__cell ${
                    !cell.isCurrentMonth ? 'df-calendar-page__cell--other-month' : ''
                  } ${cell.isToday ? 'df-calendar-page__cell--today' : ''}`}
                >
                  <div className="df-calendar-page__cell-header">
                    <span className="df-calendar-page__cell-number">{cell.dayNum}</span>
                    {cell.events.length > 0 && (
                      <span className="df-calendar-page__cell-count-badge">
                        {cell.events.length} {cell.events.length === 1 ? 'order' : 'orders'}
                      </span>
                    )}
                  </div>

                  <div className="df-calendar-page__cell-events">
                    {cell.events.map((ev) => (
                      <div
                        key={ev.order_id}
                        className={`df-calendar-page__event-pill df-calendar-page__event-pill--${ev.delivery_status}`}
                        onClick={() => setSelectedEvent(ev)}
                        title={`${ev.order_number} (${ev.customer_name}) - Lead Time: ${ev.max_lead_time_days}d (IST)`}
                      >
                        <span className={`df-calendar-page__event-pill-dot df-calendar-page__event-pill-dot--${ev.delivery_status}`} />
                        <span className="df-calendar-page__event-pill-code">{ev.order_number}</span>
                        {ev.customer_name && (
                          <span className="df-calendar-page__event-pill-cust">
                            {ev.customer_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Order Delivery Detail Modal */}
      {selectedEvent && (
        <div
          className="df-calendar-page__modal-backdrop"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="df-calendar-page__modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="df-calendar-page__modal-header">
              <div className="df-calendar-page__modal-header-left">
                <div className="df-calendar-page__modal-status-badge-row">
                  <span className={`df-delivery-badge df-delivery-badge--${selectedEvent.delivery_status}`}>
                    {selectedEvent.delivery_status === 'delivered' && '🟢 Delivered'}
                    {selectedEvent.delivery_status === 'shipped' && '🔵 In Transit / Shipped'}
                    {selectedEvent.delivery_status === 'pending' && '🟡 Scheduled / Processing'}
                    {selectedEvent.delivery_status === 'overdue' && '🔴 Delayed / Overdue'}
                  </span>
                  {selectedEvent.order_date && (
                    <span className="df-calendar-page__modal-placed-time">
                      Placed: {formatISTDateTime(selectedEvent.order_date)}
                    </span>
                  )}
                </div>
                <h3 className="df-calendar-page__modal-title">
                  Delivery Details: <span className="df-highlight-code">{selectedEvent.order_number}</span>
                </h3>
                <div className="df-calendar-page__modal-customer-info">
                  <span className="df-customer-pill">
                    🏢 <strong>{selectedEvent.customer_name}</strong>
                  </span>
                  {selectedEvent.customer_email && (
                    <span className="df-email-pill">✉ {selectedEvent.customer_email}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="df-calendar-page__modal-close-btn"
                onClick={() => setSelectedEvent(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Lead Time Rule Highlight Banner */}
            <div className="df-calendar-page__modal-lead-banner">
              <div className="df-calendar-page__modal-lead-banner-icon">
                ⏱
              </div>
              <div className="df-calendar-page__modal-lead-banner-content">
                <div className="df-lead-title">
                  Max Lead Time Window: <strong>{selectedEvent.max_lead_time_days} {selectedEvent.max_lead_time_days === 1 ? 'Day' : 'Days'}</strong>
                </div>
                <div className="df-lead-desc">
                  Based on the maximum delivery lead time among all {selectedEvent.items?.length || 1} ordered products.
                </div>
              </div>
            </div>

            {/* Logistics & Financial Overview Grid */}
            <div className="df-calendar-page__modal-info-grid">
              <div className="df-calendar-page__modal-info-item">
                <label>Expected Delivery Date (IST)</label>
                <span className="df-delivery-date-highlight">
                  📅 {formatISTDate(selectedEvent.scheduled_delivery_date)}
                </span>
              </div>
              <div className="df-calendar-page__modal-info-item">
                <label>Fulfilling Warehouse(s)</label>
                <span>🏬 {selectedEvent.warehouses_display || 'Main Warehouse'}</span>
              </div>
              <div className="df-calendar-page__modal-info-item">
                <label>Linked Quotation</label>
                <span style={{ color: '#38bdf8' }}>
                  {selectedEvent.quotation_number || 'Direct Order'}
                </span>
              </div>
              <div className="df-calendar-page__modal-info-item">
                <label>Total Order Amount</label>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  {formatCurrency(selectedEvent.grand_total)}
                </span>
              </div>
            </div>

            {/* Products Breakdown Table with Lead Times */}
            <div className="df-calendar-page__modal-products-section">
              <div className="df-products-section-header">
                <h4>Ordered Products & Lead Time Analysis</h4>
                <span className="df-badge-count">{selectedEvent.items?.length || 1} Items</span>
              </div>

              <div className="df-modal-table-container">
                <table className="df-calendar-page__modal-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Item Lead Time</th>
                      <th style={{ textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedEvent.items || []).map((item, idx) => {
                      const isMax = item.lead_time_days === selectedEvent.max_lead_time_days;
                      return (
                        <tr key={item.order_item_id || idx} className={isMax ? 'is-max-lead-row' : ''}>
                          <td>
                            <div className="df-prod-cell">
                              <span className="df-prod-icon">📦</span>
                              <div>
                                <strong className="df-prod-name">{item.product_name}</strong>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="df-sku-pill">{item.sku || '-'}</span>
                          </td>
                          <td>
                            <span className="df-qty-pill">{item.quantity} units</span>
                          </td>
                          <td>
                            <span className={`df-lead-time-pill ${isMax ? 'df-lead-time-pill--max' : ''}`}>
                              {isMax && '⚡ '}
                              {item.lead_time_days || 2} {item.lead_time_days === 1 ? 'day' : 'days'}
                              {isMax ? ' (Max)' : ''}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="df-line-total">{formatCurrency(item.line_total)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer with Premium Action Buttons */}
            <div className="df-calendar-page__modal-footer">
              <button
                type="button"
                className="df-btn-secondary df-calendar-page__modal-btn-close"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
              {!calendarData.isCustomer && (
                <button
                  type="button"
                  className="df-btn-primary df-calendar-page__modal-btn-action"
                  onClick={() => {
                    setSelectedEvent(null);
                    navigate(`/fulfillment/${selectedEvent.order_number || selectedEvent.order_id}`);
                  }}
                >
                  <span>View Fulfillment Details</span>
                  <span>➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DeliveryCalendar);
