import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { quotationApi } from './services/quotation.api.js';

// Fetch Quotations (Kanban or List view)
export const fetchQuotations = createAsyncThunk(
  'quotations/fetchQuotations',
  async ({ view = 'kanban', status = '', search = '' } = {}, { rejectWithValue }) => {
    try {
      const res = await quotationApi.getQuotations({ view, status, search });
      return {
        view,
        data: res.data,
        summary: res.summary || null,
        totalCount: res.totalCount || 0,
      };
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to fetch quotations');
    }
  }
);

// Fetch Single Quotation Detail
export const fetchQuotationDetail = createAsyncThunk(
  'quotations/fetchDetail',
  async (id, { rejectWithValue }) => {
    try {
      const res = await quotationApi.getQuotationById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to fetch quotation details');
    }
  }
);

const initialState = {
  viewMode: 'kanban', // 'kanban' | 'table'
  kanbanData: {
    draft: [],
    pending_approval: [],
    approved: [],
    negotiating: [],
    confirmed: [],
  },
  listData: [],
  summary: null,
  totalCount: 0,
  searchQuery: '',
  selectedStatus: '',
  activeQuotation: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

const quotationSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {
    setViewMode: (state, action) => {
      state.viewMode = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedStatus: (state, action) => {
      state.selectedStatus = action.payload;
    },
    clearActiveQuotation: (state) => {
      state.activeQuotation = null;
    },
    clearQuotationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Quotations
      .addCase(fetchQuotations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuotations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload.view === 'kanban') {
          state.kanbanData = action.payload.data;
          state.summary = action.payload.summary;
        } else {
          state.listData = action.payload.data;
        }
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchQuotations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Detail
      .addCase(fetchQuotationDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuotationDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeQuotation = action.payload;
      })
      .addCase(fetchQuotationDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setViewMode,
  setSearchQuery,
  setSelectedStatus,
  clearActiveQuotation,
  clearQuotationError,
} = quotationSlice.actions;

export default quotationSlice.reducer;
