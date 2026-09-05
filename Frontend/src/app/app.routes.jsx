import { createBrowserRouter, Navigate } from 'react-router';
import ProtectedRoute from '../features/auth/components/ProtectedRoute.jsx';
import PublicRoute from '../features/auth/components/PublicRoute.jsx';
import Login from '../features/auth/pages/Login.jsx';
import Register from '../features/auth/pages/Register.jsx';
import Dashboard from '../features/dashboard/pages/Dashboard.jsx';
import QuotationsList from '../features/quotations/pages/QuotationsList.jsx';
import QuotationDetail from '../features/quotations/pages/QuotationDetail.jsx';
import ProductCatalog from '../features/products/pages/ProductCatalog.jsx';
import ProductDetail from '../features/products/pages/ProductDetail.jsx';
import DiscountRulesSetup from '../features/discountRules/pages/DiscountRulesSetup.jsx';
import ApprovalsList from '../features/approvals/pages/ApprovalsList.jsx';
import ApprovalDetail from '../features/approvals/pages/ApprovalDetail.jsx';
import FulfillmentList from '../features/fulfillment/pages/FulfillmentList.jsx';
import FulfillmentDetail from '../features/fulfillment/pages/FulfillmentDetail.jsx';
import Onboarding from '../features/auth/pages/Onboarding.jsx';
import ForgotPassword from '../features/auth/pages/ForgotPassword.jsx';
import Profile from '../features/auth/pages/Profile.jsx';
import StaffManagement from '../features/staff/pages/StaffManagement.jsx';
import MyQuotations from '../features/quotations/pages/MyQuotations.jsx';
import MyInvoices from '../features/invoices/pages/MyInvoices.jsx';
import SubscriptionsList from '../features/subscriptions/pages/SubscriptionsList.jsx';
import SubscriptionDetail from '../features/subscriptions/pages/SubscriptionDetail.jsx';
import DealHealthDashboard from '../features/dealHealth/pages/DealHealthDashboard.jsx';
import InvoicesList from '../features/invoices/pages/InvoicesList.jsx';
import InvoiceDetail from '../features/invoices/pages/InvoiceDetail.jsx';
import InvoiceCreate from '../features/invoices/pages/InvoiceCreate.jsx';
import ReportsDashboard from '../features/reports/pages/ReportsDashboard.jsx';
import './placeholder.scss';

// Lightweight placeholder view component for quick verification
const PagePlaceholder = ({ title, description }) => (
  <div className="df-placeholder-page">
    <div className="df-placeholder-page__card">
      <h1 className="df-placeholder-page__title">{title}</h1>
      <p className="df-placeholder-page__description">{description}</p>
    </div>
  </div>
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
        element: <Dashboard />,
      },
      {
        path: '/quotations',
        element: <QuotationsList />,
      },
      {
        path: '/quotations/new',
        element: <QuotationDetail isNew={true} />,
      },
      {
        path: '/quotations/:id',
        element: <QuotationDetail />,
      },

      // Approvals: Admin, Sales Manager, Finance
      {
        element: <RoleGuard allowedRoles={['admin', 'sales_manager', 'finance']} />,
        children: [
          {
            path: '/approvals',
            element: <ApprovalsList />,
          },
          {
            path: '/approvals/:id',
            element: <ApprovalDetail />,
          },
        ],
      },

      // Fulfillment: Admin, Operations, Finance, Sales Manager
      {
        element: <RoleGuard allowedRoles={['admin', 'operations', 'finance', 'sales_manager']} />,
        children: [
          {
            path: '/fulfillment',
            element: <FulfillmentList />,
          },
          {
            path: '/fulfillment/:orderId',
            element: <FulfillmentDetail />,
          },
        ],
      },

      {
        path: '/subscriptions',
        element: <SubscriptionsList />,
      },
      {
        path: '/subscriptions/:id',
        element: <SubscriptionDetail />,
      },
      {
        path: '/invoices',
        element: <InvoicesList />,
      },
      {
        path: '/invoices/new',
        element: <InvoiceCreate />,
      },
      {
        path: '/invoices/:id',
        element: <InvoiceDetail />,
      },
      {
        path: '/deal-health',
        element: <DealHealthDashboard />,
      },
      {
        path: '/reports',
        element: <ReportsDashboard />,
      },
      {
        path: '/products',
        element: <ProductCatalog />,
      },
      {
        path: '/products/new',
        element: <ProductDetail isNew={true} />,
      },
      {
        path: '/products/:id',
        element: <ProductDetail />,
      },
      {
        path: '/profile',
        element: <Profile />,
      },

      // Staff Management: Admin only
      {
        element: <RoleGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/staff',
            element: <StaffManagement />,
          },
        ],
      },

      // Discount Rules Setup: Admin & Sales Manager
      {
        element: <RoleGuard allowedRoles={['admin', 'sales_manager']} />,
        children: [
          {
            path: '/discount-rules',
            element: <DiscountRulesSetup />,
          },
          {
            path: '/discount-tiers',
            element: <DiscountRulesSetup />,
          },
        ],
      },

      // Customer Portal Views
      {
        element: <RoleGuard allowedRoles={['customer', 'admin']} />,
        children: [
          {
            path: '/my_quotations',
            element: <MyQuotations />,
          },
          {
            path: '/my_invoices',
            element: <MyInvoices />,
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
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/onboarding',
        element: <Onboarding />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
    ],
  },

  // Catch-all route -> redirect to root
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
