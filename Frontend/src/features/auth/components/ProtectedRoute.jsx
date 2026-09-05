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
  const { isAuthenticated, loading } = useAuth();
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

  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  );
}
