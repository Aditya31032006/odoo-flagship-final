import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router';
import useAuth from '../../features/auth/hook/useAuth.js';
import '../styles/navbar.scss';

// Navigation Items Configuration based on DealFlow360 business lifecycle
const NAV_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'finance', 'operations'],
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
    allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'finance', 'operations'],
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
    allowedRoles: ['admin', 'sales_manager', 'finance'],
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
    allowedRoles: ['admin', 'operations', 'finance', 'sales_manager'],
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
    allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
      </svg>
    ),
  },
  {
    name: 'Invoices',
    path: '/invoices',
    allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
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
    allowedRoles: ['admin', 'sales_manager', 'finance', 'sales_rep'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    name: 'Reports',
    path: '/reports',
    allowedRoles: ['admin', 'sales_manager', 'finance', 'operations', 'sales_rep'],
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
    allowedRoles: ['admin', 'sales_manager', 'operations', 'sales_rep'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    name: 'Discount Rules',
    path: '/discount-rules',
    allowedRoles: ['admin', 'sales_manager'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <circle cx="12" cy="12" r="10" />
        <line x1="9" y1="15" x2="15" y2="9" />
        <circle cx="9.5" cy="9.5" r=".5" fill="currentColor" />
        <circle cx="14.5" cy="14.5" r=".5" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'Manage Staff',
    path: '/staff',
    allowedRoles: ['admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// Format user initials
function getInitials(name) {
  if (!name) return 'DF';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Format role label
function formatRole(role) {
  const roleMap = {
    sales_rep: 'Sales Rep',
    sales_manager: 'Sales Mgr',
    finance: 'Finance',
    operations: 'Operations',
    admin: 'Admin',
    customer: 'Customer',
  };
  return roleMap[role] || role || 'Sales Ops';
}

const AUTH_ROUTES = ['/login', '/register', '/auth/login', '/auth/register', '/signup', '/forgot-password'];

function NavbarComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Hide dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAuthRoute = AUTH_ROUTES.some((route) =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  const visibleNavItems = user?.role === 'customer'
    ? [
        {
          name: 'My Quotations',
          path: '/my_quotations',
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
          name: 'My Invoices',
          path: '/my_invoices',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="16" x2="12" y2="16" />
            </svg>
          ),
        },
      ]
    : NAV_ITEMS.filter((item) => {
        if (!item.allowedRoles) return true;
        return user?.role === 'admin' || item.allowedRoles.includes(user?.role);
      });

  if (isAuthRoute) {
    return null;
  }

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const homeDestination = user?.role === 'customer' ? '/my_quotations' : '/dashboard';

  return (
    <header className="df-navbar-wrapper">
      <nav className="df-navbar" aria-label="Main Navigation">
        {/* Brand Section */}
        <Link to={homeDestination} className="df-navbar__brand" onClick={closeMobileMenu} title="DealFlow360 Sales Operations Platform">
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
            {visibleNavItems.map((item) => (
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
          {/* User Profile / Auth State */}
          {isAuthenticated && user ? (
            <div className="df-navbar__user-container" ref={dropdownRef}>
              <div
                className={`df-navbar__user ${location.pathname === '/profile' ? 'active' : ''}`}
                onClick={() => {
                  setProfileDropdownOpen(false);
                  navigate('/profile');
                }}
                title="View & Edit My Profile"
              >
                <div className={`df-navbar__user-avatar ${user.role === 'customer' ? (user.ring_class || 'df-avatar--standard') : ''}`}>
                  {getInitials(user.name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                  <span className="df-navbar__user-role">
                    {user.role === 'customer' ? (user.tier_name ? `${user.tier_name} Tier` : 'Standard Member') : formatRole(user.role)}
                  </span>
                  {user.role === 'customer' && user.company_name && (
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.company_name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="df-navbar__chevron-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileDropdownOpen((prev) => !prev);
                  }}
                  title="More Profile Options"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="df-navbar__chevron">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="df-navbar__dropdown-menu">
                  <div
                    className="df-navbar__dropdown-menu-header"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      navigate('/profile');
                    }}
                    title="Open Full Profile"
                  >
                    <div className="df-navbar__dropdown-menu-name">
                      {user.name}
                    </div>
                    <div className="df-navbar__dropdown-menu-email">
                      {user.email}
                    </div>
                    {user.company_name && (
                      <div className="df-navbar__dropdown-menu-company">
                        🏢 {user.company_name}
                      </div>
                    )}
                    {user.role === 'customer' && (
                      <div style={{ marginTop: '6px' }}>
                        <span className={`df-profile__badge df-profile__badge--tier ${user.ring_class || 'df-avatar--standard'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {user.tier_name === 'Gold' && '🥇 Gold Member (15% max)'}
                          {user.tier_name === 'Silver' && '🥈 Silver Member (10% max)'}
                          {user.tier_name === 'Bronze' && '🥉 Bronze Member (5% max)'}
                          {(!user.tier_name || user.tier_name === 'Standard') && '⚪ Standard Member (0% max)'}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/profile"
                    className="df-navbar__dropdown-menu-profile-link"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    My Profile & Settings
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      to="/staff"
                      className="df-navbar__dropdown-menu-profile-link"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Manage Staff & Access
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="df-navbar__dropdown-menu-logout"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="df-navbar__signin-btn"
            >
              Sign In
            </Link>
          )}


          {/* Mobile Menu Toggle Button */}
          {/* <button
            className="df-navbar__mobile-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button> */}
        </div>

        {/* Mobile Navigation Drawer */}
        {/* <div className={`df-navbar__mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}>
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
        </div> */}
      </nav>
    </header>
  );
}

export default React.memo(NavbarComponent);

