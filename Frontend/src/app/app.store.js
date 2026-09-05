import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/auth.slice.js';
import dashboardReducer from '../features/dashboard/dashboard.slice.js';
import quotationReducer from '../features/quotations/quotation.slice.js';
import productsReducer from '../features/products/products.slice.js';
import discountRulesReducer from '../features/discountRules/discountRules.slice.js';
import approvalsReducer from '../features/approvals/approvals.slice.js';
import fulfillmentReducer from '../features/fulfillment/fulfillment.slice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    quotations: quotationReducer,
    products: productsReducer,
    discountRules: discountRulesReducer,
    approvals: approvalsReducer,
    fulfillment: fulfillmentReducer,
  },
});
