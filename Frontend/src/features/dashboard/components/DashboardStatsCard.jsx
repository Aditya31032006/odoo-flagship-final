import React from 'react';
import { Link } from 'react-router';

/**
 * Summary KPI Widget Card matching Sales Dashboard wireframe
 */
export const DashboardStatsCard = ({
  title,
  count,
  subtitle,
  to,
  variant = 'blue',
  icon
}) => {
  return (
    <Link to={to} className={`df-kpi-card df-kpi-card--${variant}`}>
      <div className="df-kpi-card__top">
        <span className="df-kpi-card__title">{title}</span>
        {icon && <div className="df-kpi-card__icon-wrapper">{icon}</div>}
      </div>

      <div className="df-kpi-card__body">
        <span className="df-kpi-card__count">{count}</span>
        <span className="df-kpi-card__subtitle">{subtitle}</span>
      </div>

      <div className="df-kpi-card__footer">
        <span>Click to view details</span>
        <span className="view-link">
          Open
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
};

export default DashboardStatsCard;
