import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import useAuth from '../hook/useAuth.js';
import Navbar from '../../../shared/components/Navbar.jsx';
import { useToast } from '../../../shared/context/ToastContext.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes. If the user is unauthenticated, checks for a magic access token.
 * If valid, authenticates the session; otherwise redirects to /login.
 */
export default function ProtectedRoute() {
  const { user, isAuthenticated, loading, magicLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifyingMagicToken, setVerifyingMagicToken] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const tokenParam = searchParams.get('token');

  useEffect(() => {
    // If not authenticated and a magic token is provided in the URL:
    if (!loading && !isAuthenticated && tokenParam && !verifyingMagicToken) {
      setVerifyingMagicToken(true);
      magicLogin(tokenParam).then((res) => {
        setVerifyingMagicToken(false);
        if (!res.success) {
          toast.error(res.error || 'Magic access link has expired (15-minute limit). Please log in.');
          navigate('/login', { state: { from: location }, replace: true });
        }
      });
    }
  }, [loading, isAuthenticated, tokenParam, verifyingMagicToken, magicLogin, toast, navigate, location]);

  if (loading || verifyingMagicToken) {
    return (
      <div className="df-auth-loading">
        <div className="df-auth-loading__content">
          <div className="df-auth-loading__spinner" />
          <p className="df-auth-loading__text">
            {verifyingMagicToken ? 'Authenticating via instant-access link...' : 'Verifying DealFlow360 session...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !tokenParam) {
    // Redirect unauthenticated visitors to login, preserving intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthenticated && tokenParam) {
    // While still in verification cycle, show loader
    return (
      <div className="df-auth-loading">
        <div className="df-auth-loading__content">
          <div className="df-auth-loading__spinner" />
          <p className="df-auth-loading__text">Authenticating via instant-access link...</p>
        </div>
      </div>
    );
  }

  // Customer Access Policy: Customers can access /my_quotations, /my_invoices, /calendar (/my_deliveries), and /profile
  if (user?.role === 'customer') {
    const isCustomerAllowedPath =
      location.pathname === '/my_quotations' ||
      location.pathname.startsWith('/my_quotations/') ||
      location.pathname === '/my_invoices' ||
      location.pathname.startsWith('/my_invoices/') ||
      location.pathname === '/my_deliveries' ||
      location.pathname.startsWith('/my_deliveries/') ||
      location.pathname === '/calendar' ||
      location.pathname.startsWith('/calendar/') ||
      location.pathname === '/delivery-calendar' ||
      location.pathname.startsWith('/delivery-calendar/') ||
      location.pathname === '/profile' ||
      location.pathname.startsWith('/profile/');

    if (!isCustomerAllowedPath) {
      return <Navigate to="/my_quotations" replace />;
    }
  } else {
    // Internal staff visiting customer-specific URLs are redirected to staff views
    if (location.pathname === '/my_quotations' || location.pathname.startsWith('/my_quotations/')) {
      return <Navigate to="/quotations" replace />;
    }
    if (location.pathname === '/my_invoices' || location.pathname.startsWith('/my_invoices/')) {
      return <Navigate to="/invoices" replace />;
    }
    if (location.pathname === '/my_deliveries' || location.pathname.startsWith('/my_deliveries/')) {
      return <Navigate to="/calendar" replace />;
    }
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  );
}
