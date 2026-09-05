import React from 'react';
import { Navigate, Outlet } from 'react-router';
import useAuth from '../hook/useAuth.js';

/**
 * RoleGuard Component:
 * Restricts access to a route based on allowed user roles.
 * If user does not have permission, redirects to dashboard (or portal if customer).
 */
const RoleGuard = ({ allowedRoles = [], fallback = null }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#94a3b8' }}>
        Checking permissions...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Admin always has universal access
  if (user.role === 'admin') {
    return <Outlet />;
  }

  // Customer should be restricted to portal routes
  if (user.role === 'customer' && !allowedRoles.includes('customer')) {
    return <Navigate to={`/portal/quotations/${user.customer_id || ''}`} replace />;
  }

  // Check if user's role is in allowedRoles
  const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(user.role);

  if (!isAllowed) {
    if (fallback) return fallback;
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: '600px', margin: '4rem auto', textAlign: 'center', background: '#111827', borderRadius: '1rem', border: '1px solid #1f2937' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f8fafc', marginBottom: '0.75rem', fontSize: '1.5rem' }}>Access Restricted</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Your current account role (<strong style={{ color: '#38bdf8' }}>{user.role}</strong>) does not have permission to access this module.
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.625rem 1.25rem',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleGuard;
