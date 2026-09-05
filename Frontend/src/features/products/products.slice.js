import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsApi } from './services/products.api.js';

export const fetchProductSummary = createAsyncThunk(
  'products/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      return await productsApi.getSummary();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch catalog metrics');
    }
  }
);

export const fetchAllProducts = createAsyncThunk(
  'products/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await productsApi.getAllProducts();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch products');
    }
  }
);

const initialState = {
  summary: {
    active_products: 0,
    archived_products: 0,
    pricelists: 0,
    currencies: 0,
    total_variants: 0,
  },
  productsList: [],
  categories: [],
  isLoading: false,
  isInitialized: false,
  error: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(fetchAllProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.productsList = action.payload;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export default productsSlice.reducer;
