import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial auth state from localStorage if present
const getSavedToken = () => {
  try {
    return localStorage.getItem('df_token') || null;
  } catch {
    return null;
  }
};

const getSavedUser = () => {
  try {
    const user = localStorage.getItem('df_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const initialToken = getSavedToken();
const initialUser = getSavedUser();

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    token: initialToken,
    isAuthenticated: Boolean(initialToken || initialUser),
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = Boolean(action.payload);
      if (action.payload) {
        state.error = null;
      }
    },
    setAuthSuccess: (state, action) => {
      const { user, token, message } = action.payload;
      state.user = user || state.user;
      state.token = token || state.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.successMessage = message || null;

      if (token) {
        try {
          localStorage.setItem('df_token', token);
        } catch (e) {
          console.error('LocalStorage write error', e);
        }
      }
      if (user) {
        try {
          localStorage.setItem('df_user', JSON.stringify(user));
        } catch (e) {
          console.error('LocalStorage write error', e);
        }
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.loading = false;

      if (action.payload) {
        try {
          localStorage.setItem('df_user', JSON.stringify(action.payload));
        } catch (e) {
          console.error('LocalStorage write error', e);
        }
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.successMessage = null;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.successMessage = null;

      try {
        localStorage.removeItem('df_token');
        localStorage.removeItem('df_user');
      } catch (e) {
        console.error('LocalStorage remove error', e);
      }
    },
  },
});

export const {
  setLoading,
  setAuthSuccess,
  setUser,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} = authSlice.actions;

export default authSlice.reducer;