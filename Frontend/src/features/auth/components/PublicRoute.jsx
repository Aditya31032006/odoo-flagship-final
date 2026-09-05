import React from 'react';
import { Navigate, Outlet } from 'react-router';
import useAuth from '../hook/useAuth.js';

/**
 * PublicRoute Component
 * Guards guest-only routes (/login, /register, /onboarding).
 * If the user is already authenticated, strictly redirects them to '/'.
 * If unauthenticated, renders the guest page via Outlet.
 */
export default function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
