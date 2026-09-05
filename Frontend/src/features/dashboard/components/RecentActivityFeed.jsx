import React from 'react';

// Format relative date / timestamp
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Format human-friendly activity message matching the mock
function renderActivityText(activity) {
  const company = activity.company_name || 'Customer';
  const action = activity.action;
  const user = activity.user_name || 'Team member';
  const quoteNum = activity.quotation_number ? `#${activity.quotation_number}` : '';

  switch (action) {
    case 'approved':
      return (
        <>
          <strong>{company}</strong> quotation approved by {activity.user_role === 'finance' ? 'Finance' : user}
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
    case 'rejected':
      return (
        <>
          <strong>{company}</strong> quotation rejected by {user}
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
    case 'submitted':
      return (
        <>
          <strong>{company}</strong> quotation submitted for approval
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
    case 'returned':
      return (
        <>
          <strong>{company}</strong> requested a discount change / quotation returned
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
    case 'edited':
      return (
        <>
          <strong>{company}</strong> quotation terms modified by {user}
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
    default:
      return (
        <>
          <strong>{company}</strong> quotation activity: {action} by {user}
          <span className="badge-quote">({quoteNum})</span>
        </>
      );
  }
}

export const RecentActivityFeed = ({ activities = [], isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="df-activity-feed__empty">
        Loading latest activity logs...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="df-activity-feed__empty">
        No recent quotation or approval activity logged in the system.
      </div>
    );
  }

  return (
    <ul className="df-activity-feed">
      {activities.map((item) => (
        <li key={item.id} className="df-activity-feed__item">
          <span
            className={`df-activity-feed__bullet df-activity-feed__bullet--${item.action || 'default'}`}
          />
          <div className="df-activity-feed__content">
            <div className="df-activity-feed__main">
              {renderActivityText(item)}
            </div>
            <div className="df-activity-feed__meta">
              <span className="df-activity-feed__time">
                {formatTimeAgo(item.created_at)}
              </span>
              {item.reason && (
                <span className="df-activity-feed__reason">
                  • "{item.reason}"
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default React.memo(RecentActivityFeed);
