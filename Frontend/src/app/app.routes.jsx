import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import Navbar from '../shared/components/Navbar';

// Layout wrapper for authenticated/main pages that includes the Navbar
const AppLayout = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="app-main-content">
        <Outlet />
      </main>
    </div>
  );
};

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

// Auth Page Placeholder (Navbar is excluded outside this layout)
const AuthPlaceholder = ({ type }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }}>
    <div style={{
      background: '#1e293b',
      padding: '2.5rem',
      borderRadius: '16px',
      border: '1px solid #334155',
      textAlign: 'center',
      maxWidth: '400px',
      width: '90%'
    }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        {type === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        DealFlow360 Authentication Portal (Navbar is excluded on this page)
      </p>
      <a href="/dashboard" style={{
        display: 'inline-block',
        background: '#2563eb',
        color: '#ffffff',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '0.875rem'
      }}>
        Back to Dashboard
      </a>
    </div>
  </div>
);

// Create router configuration using createBrowserRouter
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: (
          <PagePlaceholder
            title="DealFlow360 Dashboard"
            description="Sales Operations 360 overview, deal velocity, conversion rates, and real-time operational alerts."
          />
        ),
      },
      {
        path: '/quotations',
        element: (
          <PagePlaceholder
            title="Quotations Management"
            description="Create and manage customer quotations with line-item pricing, tier discounts, and governance."
          />
        ),
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
  // Auth routes placed outside AppLayout so Navbar is automatically excluded
  {
    path: '/login',
    element: <AuthPlaceholder type="login" />,
  },
  {
    path: '/register',
    element: <AuthPlaceholder type="register" />,
  },
]);
