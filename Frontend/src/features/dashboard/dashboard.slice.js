import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from './services/dashboard.api.js';

// Fetch Dashboard Stats
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await dashboardApi.getStats();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to fetch dashboard metrics');
    }
  }
);

// Fetch Dashboard Activity Logs
export const fetchDashboardActivity = createAsyncThunk(
  'dashboard/fetchActivity',
  async (limit = 15, { rejectWithValue }) => {
    try {
      const res = await dashboardApi.getActivity(limit);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to fetch activity feed');
    }
  }
);

const initialState = {
  stats: {
    pending_approvals: 0,
    open_quotations: 0,
    at_risk_deals: 0,
    confirmed_orders: 0,
    total_pipeline_value: 0,
    role: null,
    user_name: null,
  },
  activities: [],
  isLoadingStats: false,
  isLoadingActivity: false,
  statsError: null,
  activityError: null,
  lastUpdated: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardErrors: (state) => {
      state.statsError = null;
      state.activityError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoadingStats = true;
        state.statsError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.stats = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.statsError = action.payload;
      })

      // Fetch Activities
      .addCase(fetchDashboardActivity.pending, (state) => {
        state.isLoadingActivity = true;
        state.activityError = null;
      })
      .addCase(fetchDashboardActivity.fulfilled, (state, action) => {
        state.isLoadingActivity = false;
        state.activities = action.payload;
      })
      .addCase(fetchDashboardActivity.rejected, (state, action) => {
        state.isLoadingActivity = false;
        state.activityError = action.payload;
      });
  },
});

export const { clearDashboardErrors } = dashboardSlice.actions;
export default dashboardSlice.reducer;
