import React from 'react';
import { useNavigate, Link } from 'react-router';
import '../styles/backButton.scss';

export const BackButton = React.memo(({ to, label = 'Back', className = '', onClick }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (!to) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const content = (
    <>
      <svg className="df-back-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`df-back-button ${className}`} title={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`df-back-button ${className}`}
      onClick={handleClick}
      title={label}
    >
      {content}
    </button>
  );
});

export default BackButton;
