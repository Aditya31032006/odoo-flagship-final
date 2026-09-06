import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fulfillmentApi } from './services/fulfillment.api.js';

export const fetchFulfillmentList = createAsyncThunk(
  'fulfillment/fetchList',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.getList();
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load fulfillment list'
      );
    }
  }
);

export const fetchFulfillmentMeta = createAsyncThunk(
  'fulfillment/fetchMeta',
  async (_, { rejectWithValue }) => {
    try {
      const data = await fulfillmentApi.getMeta();
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load metadata'
      );
    }
  }
);

export const fetchFulfillmentDetail = createAsyncThunk(
  'fulfillment/fetchDetail',
  async (orderId, { rejectWithValue }) => {
    try {
      const data = await fulfillmentApi.getDetail(orderId);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to load fulfillment detail'
      );
    }
  }
);

export const acceptSuggestedSplit = createAsyncThunk(
  'fulfillment/acceptSplit',
  async (orderId, { dispatch, rejectWithValue }) => {
    try {
      const data = await fulfillmentApi.acceptSplit(orderId);
      dispatch(fetchFulfillmentList());
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to accept suggested split'
      );
    }
  }
);

export const saveManualOverride = createAsyncThunk(
  'fulfillment/saveManualOverride',
  async ({ orderId, splits, backorderQty }, { dispatch, rejectWithValue }) => {
    try {
      const data = await fulfillmentApi.saveManualOverride(orderId, { splits, backorderQty });
      dispatch(fetchFulfillmentList());
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to save manual split override'
      );
    }
  }
);

export const completeShipment = createAsyncThunk(
  'fulfillment/completeShipment',
  async (orderId, { dispatch, rejectWithValue }) => {
    try {
      const data = await fulfillmentApi.completeShipment(orderId);
      dispatch(fetchFulfillmentList());
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to complete shipment'
      );
    }
  }
);

// Stock CRUD Thunks
export const createWarehouseStock = createAsyncThunk(
  'fulfillment/createStock',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.createStock(payload);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to add warehouse stock'
      );
    }
  }
);

export const updateWarehouseStock = createAsyncThunk(
  'fulfillment/updateStock',
  async ({ stockId, payload }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.updateStock(stockId, payload);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to update warehouse stock'
      );
    }
  }
);

export const deleteWarehouseStock = createAsyncThunk(
  'fulfillment/deleteStock',
  async (stockId, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.deleteStock(stockId);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to delete warehouse stock'
      );
    }
  }
);

// Order CRUD Thunks
export const createFulfillmentOrder = createAsyncThunk(
  'fulfillment/createOrder',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.createOrder(payload);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to create order'
      );
    }
  }
);

export const updateFulfillmentOrder = createAsyncThunk(
  'fulfillment/updateOrder',
  async ({ orderId, payload }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.updateOrder(orderId, payload);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to update order'
      );
    }
  }
);

export const deleteFulfillmentOrder = createAsyncThunk(
  'fulfillment/deleteOrder',
  async (orderId, { dispatch, rejectWithValue }) => {
    try {
      const res = await fulfillmentApi.deleteOrder(orderId);
      dispatch(fetchFulfillmentList());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || 'Failed to delete order'
      );
    }
  }
);

const initialState = {
  stock: [],
  orders: [],
  meta: {
    warehouses: [],
    customers: [],
    variants: [],
  },
  currentDetail: null,
  isLoadingList: false,
  isLoadingDetail: false,
  isMutating: false,
  isSavingSplit: false,
  isInitialized: false,
  error: null,
  successMsg: null,
};

export const fulfillmentSlice = createSlice({
  name: 'fulfillment',
  initialState,
  reducers: {
    clearFulfillmentMessages: (state) => {
      state.error = null;
      state.successMsg = null;
    },
    clearFulfillmentDetail: (state) => {
      state.currentDetail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(fetchFulfillmentList.pending, (state) => {
        state.isLoadingList = true;
        state.error = null;
      })
      .addCase(fetchFulfillmentList.fulfilled, (state, action) => {
        state.isLoadingList = false;
        state.isInitialized = true;
        const payload = action.payload?.data || action.payload;
        state.stock = payload?.stock || [];
        state.orders = payload?.orders || [];
      })
      .addCase(fetchFulfillmentList.rejected, (state, action) => {
        state.isLoadingList = false;
        state.error = action.payload;
      })

      // Meta
      .addCase(fetchFulfillmentMeta.fulfilled, (state, action) => {
        state.meta = action.payload || state.meta;
      })

      // Detail
      .addCase(fetchFulfillmentDetail.pending, (state) => {
        state.isLoadingDetail = true;
        state.error = null;
      })
      .addCase(fetchFulfillmentDetail.fulfilled, (state, action) => {
        state.isLoadingDetail = false;
        state.currentDetail = action.payload;
      })
      .addCase(fetchFulfillmentDetail.rejected, (state, action) => {
        state.isLoadingDetail = false;
        state.error = action.payload;
      })

      // Accept Split
      .addCase(acceptSuggestedSplit.pending, (state) => {
        state.isSavingSplit = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(acceptSuggestedSplit.fulfilled, (state, action) => {
        state.isSavingSplit = false;
        state.successMsg = action.payload?.message || 'Warehouse split accepted! Order is now being shipped.';
        if (action.payload?.data) {
          state.currentDetail = action.payload.data;
        }
        const orderIdTarget = action.meta.arg;
        if (orderIdTarget) {
          state.orders = state.orders.filter(
            (o) =>
              String(o.order_id) !== String(orderIdTarget) &&
              String(o.order_number) !== String(orderIdTarget)
          );
        }
      })
      .addCase(acceptSuggestedSplit.rejected, (state, action) => {
        state.isSavingSplit = false;
        state.error = action.payload;
      })

      // Manual Override
      .addCase(saveManualOverride.pending, (state) => {
        state.isSavingSplit = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(saveManualOverride.fulfilled, (state, action) => {
        state.isSavingSplit = false;
        state.successMsg = action.payload?.message || 'Manual override saved successfully!';
        if (action.payload?.data) {
          state.currentDetail = action.payload.data;
        }
        const orderIdTarget = action.meta.arg?.orderId;
        if (orderIdTarget) {
          state.orders = state.orders.filter(
            (o) =>
              String(o.order_id) !== String(orderIdTarget) &&
              String(o.order_number) !== String(orderIdTarget)
          );
        }
      })
      .addCase(saveManualOverride.rejected, (state, action) => {
        state.isSavingSplit = false;
        state.error = action.payload;
      })

      // Complete Shipment → Payment
      .addCase(completeShipment.pending, (state) => {
        state.isSavingSplit = true;
        state.error = null;
        state.successMsg = null;
      })
      .addCase(completeShipment.fulfilled, (state, action) => {
        state.isSavingSplit = false;
        state.successMsg = action.payload?.message || 'Shipment completed! Order moved to Payment.';
        if (action.payload?.data) {
          state.currentDetail = action.payload.data;
        }
        const orderIdTarget = action.meta.arg;
        if (orderIdTarget) {
          state.orders = state.orders.filter(
            (o) =>
              String(o.order_id) !== String(orderIdTarget) &&
              String(o.order_number) !== String(orderIdTarget)
          );
        }
      })
      .addCase(completeShipment.rejected, (state, action) => {
        state.isSavingSplit = false;
        state.error = action.payload;
      })

      // Mutation handlers (stock & orders CRUD)
      .addMatcher(
        (action) =>
          [
            createWarehouseStock.pending,
            updateWarehouseStock.pending,
            deleteWarehouseStock.pending,
            createFulfillmentOrder.pending,
            updateFulfillmentOrder.pending,
            deleteFulfillmentOrder.pending,
          ].includes(action.type),
        (state) => {
          state.isMutating = true;
          state.error = null;
          state.successMsg = null;
        }
      )
      .addMatcher(
        (action) =>
          [
            createWarehouseStock.fulfilled,
            updateWarehouseStock.fulfilled,
            deleteWarehouseStock.fulfilled,
            createFulfillmentOrder.fulfilled,
            updateFulfillmentOrder.fulfilled,
            deleteFulfillmentOrder.fulfilled,
          ].includes(action.type),
        (state, action) => {
          state.isMutating = false;
          state.successMsg = action.payload?.message || 'Operation successful!';
        }
      )
      .addMatcher(
        (action) =>
          [
            createWarehouseStock.rejected,
            updateWarehouseStock.rejected,
            deleteWarehouseStock.rejected,
            createFulfillmentOrder.rejected,
            updateFulfillmentOrder.rejected,
            deleteFulfillmentOrder.rejected,
          ].includes(action.type),
        (state, action) => {
          state.isMutating = false;
          state.error = action.payload;
        }
      );
  },
});

export const { clearFulfillmentMessages, clearFulfillmentDetail } = fulfillmentSlice.actions;

export default fulfillmentSlice.reducer;
