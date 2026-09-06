import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router';
import useAuth from '../../features/auth/hook/useAuth.js';
import '../styles/navbar.scss';

// Categorized Mega-Menu Modules Configuration
const MEGA_MENU_SECTIONS = [
  {
    category: 'Sales & Deals',
    description: 'Commercial quotes & product catalog',
    items: [
      {
        name: 'Quotations',
        path: '/quotations',
        desc: 'Interactive Kanban & deal builder',
        allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'finance', 'operations'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
          </svg>
        ),
      },
      {
        name: 'Product Catalog',
        path: '/products',
        desc: 'Hardware, services & software licenses',
        allowedRoles: ['admin', 'sales_manager', 'operations', 'sales_rep'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        ),
      },
    ],
  },
  {
    category: 'Risk & Governance',
    description: 'Multi-level approval & deal scanner',
    items: [
      {
        name: 'Approvals Queue',
        path: '/approvals',
        desc: 'Manager & Finance risk review',
        allowedRoles: ['admin', 'sales_manager', 'finance'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ),
      },
      {
        name: 'Discount Rules',
        path: '/discount-rules',
        desc: 'Customer tier limits & category ceilings',
        allowedRoles: ['admin', 'sales_manager'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="9" y1="15" x2="15" y2="9" />
            <circle cx="9.5" cy="9.5" r=".5" fill="currentColor" />
            <circle cx="14.5" cy="14.5" r=".5" fill="currentColor" />
          </svg>
        ),
      },
      {
        name: 'Deal Health',
        path: '/deal-health',
        desc: 'Stalled deals & anomaly detection',
        hasPulse: true,
        allowedRoles: ['admin', 'sales_manager', 'finance', 'sales_rep'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
    ],
  },
  {
    category: 'Logistics & Stock',
    description: 'Fulfillment & shipment schedules',
    items: [
      {
        name: 'Multi-Warehouse',
        path: '/fulfillment',
        desc: 'Greedy stock splitting & backorders',
        allowedRoles: ['admin', 'operations', 'finance', 'sales_manager'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" x2="12" y1="22" y2="12" />
          </svg>
        ),
      },
      {
        name: 'Delivery Calendar',
        path: '/calendar',
        desc: 'Shipment timelines & promise dates',
        allowedRoles: ['admin', 'operations', 'sales_manager', 'sales_rep', 'finance'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
    ],
  },
  {
    category: 'Financials & Team',
    description: 'SaaS billing, invoices & team',
    items: [
      {
        name: 'Subscriptions',
        path: '/subscriptions',
        desc: 'Recurring lifecycle, proration & plans',
        allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        ),
      },
      {
        name: 'Invoices',
        path: '/invoices',
        desc: 'Customer statements & wire payments',
        allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
      {
        name: 'Analytics Reports',
        path: '/reports',
        desc: 'Pipeline conversion & rep leaderboards',
        allowedRoles: ['admin', 'sales_manager', 'finance', 'operations', 'sales_rep'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
          </svg>
        ),
      },
      {
        name: 'Client Companies',
        path: '/companies',
        desc: 'B2B client organizations & portals',
        allowedRoles: ['admin', 'sales_manager', 'sales_rep', 'operations'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      },
      {
        name: 'Staff Management',
        path: '/staff',
        desc: 'Internal roles & access control',
        allowedRoles: ['admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
];

// Quick Access Primary Links shown directly on the nav row
const PRIMARY_LINKS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'finance', 'operations'],
  },
  {
    name: 'Quotations',
    path: '/quotations',
    allowedRoles: ['admin', 'sales_rep', 'sales_manager', 'finance', 'operations'],
  },
  {
    name: 'Companies',
    path: '/companies',
    allowedRoles: ['admin', 'sales_manager', 'sales_rep', 'operations'],
  },
  {
    name: 'Approvals',
    path: '/approvals',
    allowedRoles: ['admin', 'sales_manager', 'finance'],
  },
  {
    name: 'Subscriptions',
    path: '/subscriptions',
    allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
  },
  {
    name: 'Invoices',
    path: '/invoices',
    allowedRoles: ['admin', 'finance', 'sales_manager', 'sales_rep'],
  },
  {
    name: 'Deal Health',
    path: '/deal-health',
    hasPulse: true,
    allowedRoles: ['admin', 'sales_manager', 'finance', 'sales_rep'],
  },
];

// Paths already shown in primary links — mega-menu will exclude these
const PRIMARY_LINK_PATHS = new Set(PRIMARY_LINKS.map((l) => l.path));

function getInitials(name) {
  if (!name) return 'DF';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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

const AUTH_ROUTES = ['/login', '/forgot-password'];

function NavbarComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  // Sliding indicator state
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0, opacity: 0 });
  const [hoverStyle, setHoverStyle] = useState({ width: 0, left: 0, opacity: 0 });
  // Per-column hover pill in mega menu: keyed by section category
  const [megaHoverStyle, setMegaHoverStyle] = useState({});
  const megaColRefs = useRef({});

  const navRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const megaHoverTimerRef = useRef(null);
  const profileHoverTimerRef = useRef(null);
  const navListRef = useRef(null);
  const linkRefsMap = useRef({});

  const isCustomer = user?.role === 'customer';

  // Update the active sliding indicator whenever route changes
  useEffect(() => {
    const updateIndicator = () => {
      const listEl = navListRef.current;
      if (!listEl) return;
      const activeEl = listEl.querySelector('a.active');
      if (!activeEl) {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      const listRect = listEl.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        width: elRect.width,
        left: elRect.left - listRect.left,
        opacity: 1,
      });
    };
    // Small delay to let NavLink apply .active class first
    const t = setTimeout(updateIndicator, 30);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Mega Menu Hover Handlers
  const handleMegaMouseEnter = () => {
    if (megaHoverTimerRef.current) {
      clearTimeout(megaHoverTimerRef.current);
      megaHoverTimerRef.current = null;
    }
    setIsMegaOpen(true);
  };

  const handleMegaMouseLeave = () => {
    megaHoverTimerRef.current = setTimeout(() => {
      setIsMegaOpen(false);
    }, 220);
  };

  // Profile Hover Handlers
  const handleProfileMouseEnter = () => {
    if (profileHoverTimerRef.current) {
      clearTimeout(profileHoverTimerRef.current);
      profileHoverTimerRef.current = null;
    }
    setProfileDropdownOpen(true);
  };

  const handleProfileMouseLeave = () => {
    profileHoverTimerRef.current = setTimeout(() => {
      setProfileDropdownOpen(false);
    }, 220);
  };

  // Close menus on route change or outside click
  useEffect(() => {
    setIsMegaOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMegaOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (megaHoverTimerRef.current) clearTimeout(megaHoverTimerRef.current);
      if (profileHoverTimerRef.current) clearTimeout(profileHoverTimerRef.current);
    };
  }, []);

  const isAuthRoute = AUTH_ROUTES.some((route) =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  if (isAuthRoute) {
    return null;
  }

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    setIsMegaOpen(false);
    await logout();
    navigate('/login');
  };

  const visiblePrimaryLinks = isCustomer
    ? [
        { name: 'My Quotations', path: '/my_quotations' },
        { name: 'My Invoices', path: '/my_invoices' },
        { name: 'My Deliveries', path: '/calendar' },
      ]
    : PRIMARY_LINKS.filter((item) => {
        if (!item.allowedRoles) return true;
        return user?.role === 'admin' || item.allowedRoles.includes(user?.role);
      });

  const homeDestination = isCustomer ? '/my_quotations' : '/dashboard';

  return (
    <header className="df-navbar-wrapper" ref={navRef}>
      <nav className={`df-navbar ${isMegaOpen ? 'df-navbar--expanded' : ''}`} aria-label="Main Navigation">
        
        {/* Main Fixed Top Row */}
        <div className="df-navbar__top-row">
          
          {/* Brand Logo */}
          <Link to={homeDestination} className="df-navbar__brand" title="DealFlow360 Platform">
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

          {/* Center Navigation Links & Explore Button */}
          <div className="df-navbar__center-group">
            {/* Nav list — onMouseLeave here (not per-link) so pill only hides when leaving the whole group */}
            <div
              className="df-navbar__nav-track"
              ref={navListRef}
              onMouseLeave={() => setHoverStyle((prev) => ({ ...prev, opacity: 0 }))}
            >
              {/* Sliding active indicator */}
              <span
                className="df-navbar__active-indicator"
                aria-hidden="true"
                style={{
                  width: indicatorStyle.width,
                  transform: `translateX(${indicatorStyle.left}px)`,
                  opacity: indicatorStyle.opacity,
                }}
              />
              {/* Hover highlight — slides between items, fades out on leave */}
              <span
                className="df-navbar__hover-indicator"
                aria-hidden="true"
                style={{
                  width: hoverStyle.width,
                  transform: `translateX(${hoverStyle.left}px)`,
                  opacity: hoverStyle.opacity,
                }}
              />
              <ul className="df-navbar__primary-links">
                {visiblePrimaryLinks.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `df-navbar__nav-pill ${isActive || (item.path === '/dashboard' && location.pathname === '/') ? 'active' : ''}`
                      }
                      onMouseEnter={(e) => {
                        const listRect = navListRef.current?.getBoundingClientRect();
                        const elRect = e.currentTarget.getBoundingClientRect();
                        if (!listRect) return;
                        // On active item: hide hover pill (active indicator already shows it)
                        if (e.currentTarget.classList.contains('active')) {
                          setHoverStyle((prev) => ({ ...prev, opacity: 0 }));
                          return;
                        }
                        setHoverStyle({
                          width: elRect.width,
                          left: elRect.left - listRect.left,
                          opacity: 1,
                        });
                      }}
                      onClick={() => {
                        // Hide hover pill immediately when clicking — active indicator takes over
                        setHoverStyle((prev) => ({ ...prev, opacity: 0 }));
                      }}
                    >
                      <span>{item.name}</span>
                      {item.hasPulse && <span className="df-navbar__dot-pulse" title="Live Monitoring" />}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Center + More / Explore Trigger */}
            {!isCustomer && (
              <button
                type="button"
                className={`df-navbar__expand-trigger ${isMegaOpen ? 'active' : ''}`}
                onMouseEnter={handleMegaMouseEnter}
                onClick={() => setIsMegaOpen((prev) => !prev)}
                aria-expanded={isMegaOpen}
                title="Explore all modules"
              >
                <span className="plus-icon">{isMegaOpen ? '−' : '+'}</span>
                <span className="label">Modules</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
          </div>

          {/* Right User Profile & Action Pill */}
          <div className="df-navbar__actions">
            {isAuthenticated && user ? (
              <div
                className="df-navbar__user-container"
                ref={profileDropdownRef}
                onMouseEnter={handleProfileMouseEnter}
                onMouseLeave={handleProfileMouseLeave}
              >
                <div
                  className={`df-navbar__user-pill ${location.pathname === '/profile' ? 'active' : ''}`}
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  title="Profile & Options"
                >
                  <div className={`df-navbar__avatar ${isCustomer ? (user.ring_class || 'df-avatar--standard') : ''}`}>
                    {getInitials(user.name)}
                  </div>
                  <span className="df-navbar__role-name">{formatRole(user.role)}</span>
                  <span className={`df-navbar__profile-arrow ${profileDropdownOpen ? 'open' : ''}`}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="df-navbar__profile-dropdown">
                    <div className="df-navbar__profile-header">
                      <div className="name">{user.name}</div>
                      <div className="email">{user.email}</div>
                      {user.company_name && <div className="company">🏢 {user.company_name}</div>}
                    </div>

                    <div className="df-navbar__profile-links">
                      <Link
                        to="/profile"
                        className="profile-link-item"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profile & Settings</span>
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          to="/staff"
                          className="profile-link-item"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>Manage Staff Access</span>
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="profile-link-item profile-link-item--logout"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="df-navbar__signin-btn">
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Soft Animated Expanding Mega-Menu Drawer */}
        <div
          className={`df-navbar__mega-drawer ${isMegaOpen ? 'df-navbar__mega-drawer--open' : ''}`}
          onMouseEnter={handleMegaMouseEnter}
          onMouseLeave={handleMegaMouseLeave}
        >
          <div className="df-navbar__mega-grid">
            {MEGA_MENU_SECTIONS.map((sec) => {
              const allowedItems = sec.items.filter(
                (item) =>
                  !PRIMARY_LINK_PATHS.has(item.path) &&
                  (!item.allowedRoles || user?.role === 'admin' || item.allowedRoles.includes(user?.role))
              );
              if (allowedItems.length === 0) return null;
              const colKey = sec.category;
              const colHover = megaHoverStyle[colKey] || { width: 0, left: 0, opacity: 0 };

              return (
                <div key={colKey} className="df-navbar__mega-col">
                  <div className="df-navbar__mega-col-title">
                    <h4>{sec.category}</h4>
                    <span>{sec.description}</span>
                  </div>

                  {/* Per-column hover pill track */}
                  <div
                    className="df-navbar__mega-items-track"
                    ref={(el) => { megaColRefs.current[colKey] = el; }}
                    onMouseLeave={() =>
                      setMegaHoverStyle((prev) => ({
                        ...prev,
                        [colKey]: { ...colHover, opacity: 0 },
                      }))
                    }
                  >
                    <span
                      className="df-navbar__mega-hover-indicator"
                      aria-hidden="true"
                      style={{
                        width: colHover.width,
                        transform: `translateY(${colHover.top}px)`,
                        height: colHover.height,
                        opacity: colHover.opacity,
                      }}
                    />
                    <ul className="df-navbar__mega-items">
                      {allowedItems.map((item) => (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                              `df-navbar__mega-card ${isActive ? 'active' : ''}`
                            }
                            onClick={() => setIsMegaOpen(false)}
                            onMouseEnter={(e) => {
                              const colEl = megaColRefs.current[colKey];
                              if (!colEl) return;
                              const colRect = colEl.getBoundingClientRect();
                              const elRect = e.currentTarget.getBoundingClientRect();
                              setMegaHoverStyle((prev) => ({
                                ...prev,
                                [colKey]: {
                                  width: elRect.width,
                                  top: elRect.top - colRect.top,
                                  height: elRect.height,
                                  opacity: 1,
                                },
                              }));
                            }}
                          >
                            <div className="icon-wrap">{item.icon}</div>
                            <div className="text-wrap">
                              <div className="item-name">
                                {item.name}
                                {item.hasPulse && <span className="pulse-dot" />}
                              </div>
                              <div className="item-desc">{item.desc}</div>
                            </div>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </nav>
    </header>
  );
}

export default React.memo(NavbarComponent);
