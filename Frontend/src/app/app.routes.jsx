import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';
import Login from '../features/auth/pages/Login.jsx';
import Register from '../features/auth/pages/Register.jsx';
import Dashboard from '../features/dashboard/pages/Dashboard.jsx';
import QuotationsList from '../features/quotations/pages/QuotationsList.jsx';

// Lightweight placeholder view component for quick verification
const PagePlaceholder = ({ title, description }) => (
  <div style={{
    padding: '2.5rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    color: '#0f172a',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <div style={{
      background: '#ffffff',
      padding: '2rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>{title}</h1>
      <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5' }}>{description}</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  // Protected Routes (Require Authentication, Includes Navbar Layout & Outlet)
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/quotations',
        element: <QuotationsList />,
      },
      {
        path: '/approvals',
        element: (
          <PagePlaceholder
            title="Discount & Deal Approvals"
            description="Review high-risk deal discount requests against tier limits and category ceilings."
          />
        ),
      },
      {
        path: '/fulfillment',
        element: (
          <PagePlaceholder
            title="Warehouse Fulfillment"
            description="SKU-level multi-warehouse split fulfillment and backorder management."
          />
        ),
      },
      {
        path: '/subscriptions',
        element: (
          <PagePlaceholder
            title="Subscription & AMC Lifecycle"
            description="Manage recurring billing periods, software licenses, AMC contracts, and prorations."
          />
        ),
      },
      {
        path: '/invoices',
        element: (
          <PagePlaceholder
            title="Invoices & KUBER Accounting"
            description="Connect order items with KUBER accounting entries, invoices, and ledger journals."
          />
        ),
      },
      {
        path: '/deal-health',
        element: (
          <PagePlaceholder
            title="Deal Health & Risk Intelligence"
            description="Blended risk scores, stalled negotiation flags, and discount anomaly warnings."
          />
        ),
      },
      {
        path: '/reports',
        element: (
          <PagePlaceholder
            title="Analytics & Post-Deal Reports"
            description="Comprehensive revenue analytics, fulfillment turnaround times, and sales performance."
          />
        ),
      },
      {
        path: '/products',
        element: (
          <PagePlaceholder
            title="Product Catalog & SKUs"
            description="Manage products, variants, price lists, customer tier pricing, and warehouse stocks."
          />
        ),
      },
    ],
  },

  // Public Guest Routes (Accessible Only When NOT Logged In)
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
    ],
  },

  // Catch-all route -> redirect to dashboard
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
