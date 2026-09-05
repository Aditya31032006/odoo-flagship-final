import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/auth.slice.js';
import dashboardReducer from '../features/dashboard/dashboard.slice.js';
import quotationReducer from '../features/quotations/quotation.slice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    quotations: quotationReducer,
  },
});