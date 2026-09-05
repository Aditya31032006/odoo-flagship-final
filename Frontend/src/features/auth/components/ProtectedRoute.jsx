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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#38bdf8',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Verifying DealFlow360 session...</p>
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
