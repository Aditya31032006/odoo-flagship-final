import React from 'react';
import useAuth from '../../features/auth/hook/useAuth.js';

/**
 * PermissionGate Component:
 * Conditionally renders children if the logged-in user matches any of the allowedRoles.
 * If user.role is 'admin', it always renders children.
 */
export const PermissionGate = ({ allowedRoles = [], children, fallback = null }) => {
  const { user } = useAuth();

  if (!user) return fallback;
  if (user.role === 'admin') return <>{children}</>;

  const hasAccess = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  if (!hasAccess) return fallback;

  return <>{children}</>;
};

export default PermissionGate;
