import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router';
import '../styles/navbar.scss';

// Navigation Items Configuration based on DealFlow360 business lifecycle
const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    name: 'Quotations',
    path: '/quotations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    name: 'Approvals',
    path: '/approvals',
    badge: '3', // Dynamic pending approval badge
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    name: 'Fulfillment',
    path: '/fulfillment',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.29 7 12 12 20.71 7" />
        <line x1="12" x2="12" y1="22" y2="12" />
      </svg>
    ),
  },
  {
    name: 'Subscriptions',
    path: '/subscriptions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
      </svg>
    ),
  },
  {
    name: 'Invoices',
    path: '/invoices',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: 'Deal Health',
    path: '/deal-health',
    hasPulse: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    ),
  },
  {
    name: 'Product',
    path: '/products',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
];

// Routes where Navbar should NOT be shown
const AUTH_ROUTES = ['/login', '/register', '/auth/login', '/auth/register', '/signup', '/forgot-password'];

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current route is auth/login/register
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  if (isAuthRoute) {
    return null;
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="df-navbar-wrapper">
      <nav className="df-navbar" aria-label="Main Navigation">
        {/* Brand Section */}
        <Link to="/dashboard" className="df-navbar__brand" onClick={closeMobileMenu} title="DealFlow360 Sales Operations Platform">
          <div className="df-navbar__brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <span className="df-navbar__brand-title">
            DealFlow<span className="accent">360</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="df-navbar__nav-container">
          <ul className="df-navbar__nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} className="df-navbar__nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `df-navbar__link ${isActive || (item.path === '/dashboard' && location.pathname === '/') ? 'active' : ''}`
                  }
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {item.badge && <span className="df-navbar__badge">{item.badge}</span>}
                  {item.hasPulse && <span className="df-navbar__badge--health" title="Active Monitoring" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Action Utilities */}
        <div className="df-navbar__actions">
          {/* Quick Search Trigger */}
          <button className="df-navbar__action-btn" title="Search deals & SKUs (Ctrl+K)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
          </button>

          {/* Notifications Bell */}
          <button className="df-navbar__action-btn has-indicator" title="Notifications & Approvals">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          {/* User Profile Badge */}
          <div className="df-navbar__user" title="Sales Representative (Odoo B2B)">
            <div className="df-navbar__user-avatar">SR</div>
            <span className="df-navbar__user-role">Sales Ops</span>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="df-navbar__mobile-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`df-navbar__mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}>
          <ul className="df-navbar__mobile-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `df-navbar__mobile-link ${isActive || (item.path === '/dashboard' && location.pathname === '/') ? 'active' : ''}`
                  }
                >
                  {item.icon}
                  <span>{item.name}</span>
                  {item.badge && <span className="df-navbar__badge">{item.badge}</span>}
                  {item.hasPulse && <span className="df-navbar__badge--health" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
