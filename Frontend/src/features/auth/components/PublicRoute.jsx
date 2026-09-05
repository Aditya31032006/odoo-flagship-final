import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';

/**
 * PublicRoute Component
 * Guards guest-only routes (such as /login and /register).
 * If the user is already authenticated, redirects them to /dashboard or previous path.
 * If unauthenticated, renders Outlet.
 */
export default function PublicRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
