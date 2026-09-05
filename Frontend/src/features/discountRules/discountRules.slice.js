import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { discountRulesApi } from './services/discountRules.api.js';

export const fetchDiscountConfig = createAsyncThunk(
  'discountRules/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const data = await discountRulesApi.getConfig();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load configuration');
    }
  }
);

export const saveDiscountConfig = createAsyncThunk(
  'discountRules/saveConfig',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await discountRulesApi.saveConfig(payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to save configuration');
    }
  }
);

const initialState = {
  customerTiers: [],
  categoryCeilings: [],
  approvalRules: [],
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  error: null,
  successMsg: null,
};

export const discountRulesSlice = createSlice({
  name: 'discountRules',
  initialState,
  reducers: {
    setCustomerTiers: (state, action) => {
      state.customerTiers = action.payload;
    },
    setCategoryCeilings: (state, action) => {
      state.categoryCeilings = action.payload;
    },
    setApprovalRules: (state, action) => {
      state.approvalRules = action.payload;
    },
    clearMessages: (state) => {
      state.error = null;
      state.successMsg = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Config
      .addCase(fetchDiscountConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDiscountConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.customerTiers = (action.payload?.customer_tiers || []).filter((t) => t.name?.toLowerCase() !== 'platinum');
        state.categoryCeilings = action.payload?.category_ceilings || [];
        state.approvalRules = action.payload?.approval_rules || [];
      })
      .addCase(fetchDiscountConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Save Config
      .addCase(saveDiscountConfig.pending, (state) => {
        state.isSaving = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(saveDiscountConfig.fulfilled, (state, action) => {
        state.isSaving = false;
        state.successMsg = 'Configuration saved successfully!';
        if (action.payload?.data) {
          state.customerTiers = action.payload.data.customer_tiers || state.customerTiers;
          state.categoryCeilings = action.payload.data.category_ceilings || state.categoryCeilings;
          state.approvalRules = action.payload.data.approval_rules || state.approvalRules;
        }
      })
      .addCase(saveDiscountConfig.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload;
      });
  },
});

export const { setCustomerTiers, setCategoryCeilings, setApprovalRules, clearMessages } =
  discountRulesSlice.actions;

export default discountRulesSlice.reducer;
