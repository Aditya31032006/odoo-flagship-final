import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';

// Lazy-loaded page components for on-demand bundle downloading
const Login = lazy(() => import('../features/auth/pages/Login.jsx'));
const Register = lazy(() => import('../features/auth/pages/Register.jsx'));
const Onboarding = lazy(() => import('../features/auth/pages/Onboarding.jsx'));
const ForgotPassword = lazy(() => import('../features/auth/pages/ForgotPassword.jsx'));
const Profile = lazy(() => import('../features/auth/pages/Profile.jsx'));

const Dashboard = lazy(() => import('../features/dashboard/pages/Dashboard.jsx'));
const QuotationsList = lazy(() => import('../features/quotations/pages/QuotationsList.jsx'));
const QuotationDetail = lazy(() => import('../features/quotations/pages/QuotationDetail.jsx'));
const MyQuotations = lazy(() => import('../features/quotations/pages/MyQuotations.jsx'));

const ProductCatalog = lazy(() => import('../features/products/pages/ProductCatalog.jsx'));
const ProductDetail = lazy(() => import('../features/products/pages/ProductDetail.jsx'));
const DiscountRulesSetup = lazy(() => import('../features/discountRules/pages/DiscountRulesSetup.jsx'));

const ApprovalsList = lazy(() => import('../features/approvals/pages/ApprovalsList.jsx'));
const ApprovalDetail = lazy(() => import('../features/approvals/pages/ApprovalDetail.jsx'));

const FulfillmentList = lazy(() => import('../features/fulfillment/pages/FulfillmentList.jsx'));
const FulfillmentDetail = lazy(() => import('../features/fulfillment/pages/FulfillmentDetail.jsx'));

const SubscriptionsList = lazy(() => import('../features/subscriptions/pages/SubscriptionsList.jsx'));
const SubscriptionDetail = lazy(() => import('../features/subscriptions/pages/SubscriptionDetail.jsx'));

const InvoicesList = lazy(() => import('../features/invoices/pages/InvoicesList.jsx'));
const InvoiceDetail = lazy(() => import('../features/invoices/pages/InvoiceDetail.jsx'));
const InvoiceCreate = lazy(() => import('../features/invoices/pages/InvoiceCreate.jsx'));
const MyInvoices = lazy(() => import('../features/invoices/pages/MyInvoices.jsx'));

const DealHealthDashboard = lazy(() => import('../features/dealHealth/pages/DealHealthDashboard.jsx'));
const ReportsDashboard = lazy(() => import('../features/reports/pages/ReportsDashboard.jsx'));
const StaffManagement = lazy(() => import('../features/staff/pages/StaffManagement.jsx'));
const DeliveryCalendar = lazy(() => import('../features/deliveryCalendar/pages/DeliveryCalendar.jsx'));

// Sleek loading fallback for Suspense
const RouteLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
    color: '#94a3b8',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid rgba(59, 130, 246, 0.2)',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'df-spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loading view...</span>
  </div>
);

const withSuspense = (Component, props = {}) => (
  <Suspense fallback={<RouteLoader />}>
    <Component {...props} />
  </Suspense>
);

import RoleGuard from '../features/auth/components/RoleGuard.jsx';

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
        element: withSuspense(Dashboard),
      },
      {
        path: '/quotations',
        element: withSuspense(QuotationsList),
      },
      {
        path: '/quotations/new',
        element: withSuspense(QuotationDetail, { isNew: true }),
      },
      {
        path: '/quotations/:id',
        element: withSuspense(QuotationDetail),
      },

      // Approvals: Admin, Sales Manager, Finance
      {
        element: <RoleGuard allowedRoles={['admin', 'sales_manager', 'finance']} />,
        children: [
          {
            path: '/approvals',
            element: withSuspense(ApprovalsList),
          },
          {
            path: '/approvals/:id',
            element: withSuspense(ApprovalDetail),
          },
        ],
      },

      // Fulfillment: Admin, Operations, Finance, Sales Manager
      {
        element: <RoleGuard allowedRoles={['admin', 'operations', 'finance', 'sales_manager']} />,
        children: [
          {
            path: '/fulfillment',
            element: withSuspense(FulfillmentList),
          },
          {
            path: '/fulfillment/:orderId',
            element: withSuspense(FulfillmentDetail),
          },
        ],
      },

      {
        path: '/subscriptions',
        element: withSuspense(SubscriptionsList),
      },
      {
        path: '/subscriptions/:id',
        element: withSuspense(SubscriptionDetail),
      },
      {
        path: '/invoices',
        element: withSuspense(InvoicesList),
      },
      {
        path: '/invoices/new',
        element: withSuspense(InvoiceCreate),
      },
      {
        path: '/invoices/:id',
        element: withSuspense(InvoiceDetail),
      },
      {
        path: '/deal-health',
        element: withSuspense(DealHealthDashboard),
      },
      {
        path: '/reports',
        element: withSuspense(ReportsDashboard),
      },
      {
        path: '/products',
        element: withSuspense(ProductCatalog),
      },
      {
        path: '/products/new',
        element: withSuspense(ProductDetail, { isNew: true }),
      },
      {
        path: '/products/:id',
        element: withSuspense(ProductDetail),
      },
      {
        path: '/profile',
        element: withSuspense(Profile),
      },
      {
        path: '/calendar',
        element: withSuspense(DeliveryCalendar),
      },
      {
        path: '/delivery-calendar',
        element: withSuspense(DeliveryCalendar),
      },

      // Staff Management: Admin only
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/staff',
            element: withSuspense(StaffManagement),
          },
        ],
      },

      // Discount Rules Setup: Admin & Sales Manager
      {
        element: <RoleGuard allowedRoles={['admin', 'sales_manager']} />,
        children: [
          {
            path: '/discount-rules',
            element: withSuspense(DiscountRulesSetup),
          },
          {
            path: '/discount-tiers',
            element: withSuspense(DiscountRulesSetup),
          },
        ],
      },

      // Customer Portal Views
      {
        element: <RoleGuard allowedRoles={['customer', 'admin']} />,
        children: [
          {
            path: '/my_quotations',
            element: withSuspense(MyQuotations),
          },
          {
            path: '/my_invoices',
            element: withSuspense(MyInvoices),
          },
        ],
      },
    ],
  },

  // Public Guest Routes (Accessible Only When NOT Logged In)
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: withSuspense(Login),
      },
      {
        path: '/register',
        element: withSuspense(Register),
      },
      {
        path: '/onboarding',
        element: withSuspense(Onboarding),
      },
      {
        path: '/forgot-password',
        element: withSuspense(ForgotPassword),
      },
    ],
  },

  // Catch-all route -> redirect to root
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
