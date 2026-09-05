import React from 'react';
import { Link } from 'react-router';
import useDashboard from '../hook/useDashboard.js';
import DashboardStatsCard from '../components/DashboardStatsCard.jsx';
import RecentActivityFeed from '../components/RecentActivityFeed.jsx';
import '../styles/dashboard.scss';

export const Dashboard = () => {
  const {
    stats,
    activities,
    isLoading,
    isLoadingStats,
    isLoadingActivity,
    refresh
  } = useDashboard();

  return (
    <div className="df-dashboard">
      <div className="df-dashboard__container">
        {/* Header matching Wireframe #2 */}
        <header className="df-dashboard__header">
          <div className="df-dashboard__title-group">
            <h1>
              Sales Dashboard / Home
              {stats.role && (
                <span className="badge-role">{stats.role.replace('_', ' ')}</span>
              )}
            </h1>
            <p>Central hub, links out to every module below</p>
          </div>

          <button
            className="df-dashboard__refresh-btn"
            onClick={refresh}
            title="Refresh dashboard metrics"
            disabled={isLoading}
          >
            <svg
              className={isLoading ? 'spinning' : ''}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {isLoading ? 'Updating...' : 'Sync Live'}
          </button>
        </header>

        {/* 3 Summary KPI Cards matching Wireframe #2 */}
        <section className="df-dashboard__kpi-grid" aria-label="Sales KPIs">
          <DashboardStatsCard
            title="Pending Approvals"
            count={stats.pending_approvals || 0}
            subtitle={stats.pending_approvals === 1 ? '1 quotation waiting' : `${stats.pending_approvals} quotations waiting`}
            to="/approvals"
            variant="amber"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />

          <DashboardStatsCard
            title="Open Quotations"
            count={stats.open_quotations || 0}
            subtitle={stats.open_quotations === 1 ? '1 active deal' : `${stats.open_quotations} active deals`}
            to="/quotations"
            variant="blue"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>
            }
          />

          <DashboardStatsCard
            title="At-Risk Deals"
            count={stats.at_risk_deals || 0}
            subtitle={stats.at_risk_deals === 1 ? '1 flagged by Deal Health' : `${stats.at_risk_deals} flagged by Deal Health`}
            to="/deal-health"
            variant="rose"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
            }
          />
        </section>

        {/* Action Buttons matching Wireframe #2 */}
        <section className="df-dashboard__actions-row" aria-label="Quick Actions">
          <Link to="/quotations/new" className="df-dashboard__btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="5" y2="19" />
              <line x1="5" x2="19" y1="12" y2="12" />
            </svg>
             New Quotation
          </Link>

          <Link to="/approvals" className="df-dashboard__btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            View Approvals
          </Link>
        </section>

        {/* Recent Activity Feed matching Wireframe #2 */}
        <section className="df-dashboard__activity-card" aria-label="Recent Activity">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Recent Activity
          </h2>
          <RecentActivityFeed
            activities={activities}
            isLoading={isLoadingActivity}
          />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
