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
      {
        path: '/approvals',
        element: <ApprovalsList />,
      },
      {
        path: '/approvals/:id',
        element: <ApprovalDetail />,
      },
      {
        path: '/fulfillment',
        element: <FulfillmentList />,
      },
      {
        path: '/fulfillment/:orderId',
        element: <FulfillmentDetail />,
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
      {
        path: '/staff',
        element: <StaffManagement />,
        path: '/discount-rules',
        element: <DiscountRulesSetup />,
      },
      {
        path: '/discount-tiers',
        element: <DiscountRulesSetup />,
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
