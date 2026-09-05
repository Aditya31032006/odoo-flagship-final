import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import Navbar from '../../../shared/components/Navbar.jsx';

/**
 * ProtectedRoute Component
 * Guards private routes. If the user is unauthenticated, redirects to /login.
 * If authenticated, renders the private shell layout with Navbar and Outlet.
 */
export default function ProtectedRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="df-auth-loading">
        <div className="df-auth-loading__content">
          <div className="df-auth-loading__spinner" />
          <p className="df-auth-loading__text">Verifying DealFlow360 session...</p>
        </div>
      </div>
    );
  }


  if (!isAuthenticated) {
    // Redirect unauthenticated visitors to login, preserving intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Customer Access Policy: Customers can ONLY access /my_quotations and /profile
  if (user?.role === 'customer') {
    const isCustomerAllowedPath =
      location.pathname === '/my_quotations' ||
      location.pathname.startsWith('/my_quotations/') ||
      location.pathname === '/profile' ||
      location.pathname.startsWith('/profile/');

    if (!isCustomerAllowedPath) {
      return <Navigate to="/my_quotations" replace />;
    }
  } else {
    // Internal staff visiting /my_quotations are redirected to /quotations
    if (location.pathname === '/my_quotations' || location.pathname.startsWith('/my_quotations/')) {
      return <Navigate to="/quotations" replace />;
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
