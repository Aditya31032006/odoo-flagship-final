import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { staffApi } from './services/staff.api.js';

export const fetchStaffMembers = createAsyncThunk(
  'staff/fetchStaffMembers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await staffApi.getStaffList();
      return res.staff || [];
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to fetch staff members');
    }
  }
);

export const createStaffMember = createAsyncThunk(
  'staff/createStaffMember',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await staffApi.createStaff(payload);
      return res;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to invite staff member');
    }
  }
);

export const toggleStaffActiveStatus = createAsyncThunk(
  'staff/toggleStaffActiveStatus',
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const res = await staffApi.toggleStaffStatus(id, isActive);
      return { id, staff: res.staff, message: res.message };
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to update staff status');
    }
  }
);

export const updateStaffMember = createAsyncThunk(
  'staff/updateStaffMember',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await staffApi.updateStaff(id, data);
      return { id, staff: res.staff, message: res.message };
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to update staff details');
    }
  }
);

export const deleteStaffMember = createAsyncThunk(
  'staff/deleteStaffMember',
  async (id, { rejectWithValue }) => {
    try {
      const res = await staffApi.deleteStaff(id);
      return { id, message: res.message };
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to delete staff member');
    }
  }
);

const initialState = {
  staffList: [],
  loading: false,
  isInitialized: false,
  error: null,
};

export const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    clearStaffError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchStaffMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.isInitialized = true;
        state.staffList = action.payload;
      })
      .addCase(fetchStaffMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createStaffMember.fulfilled, (state, action) => {
        if (action.payload?.staff) {
          state.staffList.unshift(action.payload.staff);
        }
      })

      // Toggle status
      .addCase(toggleStaffActiveStatus.fulfilled, (state, action) => {
        const idx = state.staffList.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1 && action.payload.staff) {
          state.staffList[idx] = { ...state.staffList[idx], ...action.payload.staff };
        }
      })

      // Update
      .addCase(updateStaffMember.fulfilled, (state, action) => {
        const idx = state.staffList.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1 && action.payload.staff) {
          state.staffList[idx] = { ...state.staffList[idx], ...action.payload.staff };
        }
      })

      // Delete
      .addCase(deleteStaffMember.fulfilled, (state, action) => {
        state.staffList = state.staffList.filter((s) => s.id !== action.payload.id);
      });
  },
});

export const { clearStaffError } = staffSlice.actions;
export default staffSlice.reducer;
