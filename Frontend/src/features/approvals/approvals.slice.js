import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { approvalsApi } from './services/approvals.api.js';

export const fetchApprovalsList = createAsyncThunk(
  'approvals/fetchList',
  async (_, { rejectWithValue }) => {
    try {
      const data = await approvalsApi.getApprovalsList();
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load approvals list'
      );
    }
  }
);

export const fetchApprovalDetail = createAsyncThunk(
  'approvals/fetchDetail',
  async (quotationId, { rejectWithValue }) => {
    try {
      const data = await approvalsApi.getApprovalDetail(quotationId);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load approval detail'
      );
    }
  }
);

export const submitApprovalDecision = createAsyncThunk(
  'approvals/submitDecision',
  async ({ quotationId, action, reason }, { rejectWithValue }) => {
    try {
      const data = await approvalsApi.submitDecision(quotationId, { action, reason });
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to submit approval decision'
      );
    }
  }
);

const initialState = {
  counts: {
    pending_count: 0,
    returned_count: 0,
    approved_count: 0,
    total_count: 0,
  },
  approvals: [],
  currentDetail: null,
  isLoadingList: false,
  isLoadingDetail: false,
  isSubmittingDecision: false,
  error: null,
  successMsg: null,
  filterPendingOnly: false,
};

export const approvalsSlice = createSlice({
  name: 'approvals',
  initialState,
  reducers: {
    setFilterPendingOnly: (state, action) => {
      state.filterPendingOnly = action.payload;
    },
    toggleFilterPendingOnly: (state) => {
      state.filterPendingOnly = !state.filterPendingOnly;
    },
    clearApprovalMessages: (state) => {
      state.error = null;
      state.successMsg = null;
    },
    clearCurrentDetail: (state) => {
      state.currentDetail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchApprovalsList.pending, (state) => {
        state.isLoadingList = true;
        state.error = null;
      })
      .addCase(fetchApprovalsList.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.counts = action.payload?.counts || state.counts;
        state.approvals = action.payload?.approvals || [];
      })
      .addCase(fetchApprovalsList.rejected, (state, action) => {
        state.isLoadingList = false;
        state.error = action.payload;
      })

      // Fetch Detail
      .addCase(fetchApprovalDetail.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchApprovalDetail.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.currentDetail = action.payload;
      })
      .addCase(fetchApprovalDetail.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload;
      })

      // Submit Decision
      .addCase(submitApprovalDecision.pending, (state) => {
        state.isSubmittingDecision = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(submitApprovalDecision.fulfilled, (state, action) => {
        state.isSubmittingDecision = false;
        state.successMsg = action.payload?.message || 'Approval decision submitted successfully!';
        if (action.payload?.data) {
          state.currentDetail = action.payload.data;
        }
      })
      .addCase(submitApprovalDecision.rejected, (state, action) => {
        state.isSubmittingDecision = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilterPendingOnly,
  toggleFilterPendingOnly,
  clearApprovalMessages,
  clearCurrentDetail,
} = approvalsSlice.actions;

export default approvalsSlice.reducer;
