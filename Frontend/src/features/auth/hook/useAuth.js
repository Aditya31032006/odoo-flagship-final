import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLoading,
  setAuthSuccess,
  setUser,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} from '../auth.slice.js';
import { authApi } from '../services/auth.api.js';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, loading, error, successMessage } = useSelector(
    (state) => state.auth
  );

  /**
   * Log in user (role is returned directly from backend DB)
   */
  const login = useCallback(
    async (credentials) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.login(credentials);
        dispatch(
          setAuthSuccess({
            user: response.user,
            token: response.token,
            message: response.message,
          })
        );
        return { success: true, user: response.user };
      } catch (err) {
        const msg = err.customMessage || 'Invalid email or password';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Register as a Company or as an Employee under a Company
   */
  const register = useCallback(
    async (userData) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.register(userData);
        dispatch(
          setAuthSuccess({
            user: response.user,
            token: response.token,
            message: response.message,
          })
        );
        return { success: true, user: response.user };
      } catch (err) {
        const msg = err.customMessage || 'Registration failed. Please check the entered details.';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Complete onboarding for OAuth users
   */
  const completeOnboarding = useCallback(
    async (onboardingData) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.completeOnboarding(onboardingData);
        dispatch(
          setAuthSuccess({
            user: response.user,
            token: response.token,
            message: response.message,
          })
        );
        return { success: true, user: response.user };
      } catch (err) {
        const msg = err.customMessage || 'Failed to complete onboarding.';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Request password reset OTP
   */
  const forgotPassword = useCallback(async (email) => {
    try {
      const response = await authApi.forgotPassword(email);
      return { success: true, message: response.message };
    } catch (err) {
      const msg = err.customMessage || 'Failed to request password reset OTP.';
      return { success: false, error: msg };
    }
  }, []);

  /**
   * Reset password with OTP
   */
  const resetPassword = useCallback(async (data) => {
    try {
      const response = await authApi.resetPassword(data);
      return { success: true, message: response.message };
    } catch (err) {
      const msg = err.customMessage || 'Failed to reset password.';
      return { success: false, error: msg };
    }
  }, []);

  /**
   * Fetch active companies list
   */
  const getCompanies = useCallback(async () => {
    try {
      const response = await authApi.getCompanies();
      return response.companies || [];
    } catch {
      return [];
    }
  }, []);

  /**
   * Fetch latest profile of currently authenticated user
   */
  const fetchCurrentUser = useCallback(async () => {
    if (!token && !localStorage.getItem('df_token')) return;
    dispatch(setLoading(true));
    try {
      const response = await authApi.getMe();
      dispatch(setUser(response.user));
      return { success: true, user: response.user };
    } catch {
      dispatch(logoutSuccess());
      return { success: false };
    }
  }, [dispatch, token]);

  /**
   * Log out user and clear stored credentials
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Backend logout cleanup notice:', e);
    } finally {
      dispatch(logoutSuccess());
    }
  }, [dispatch]);

  /**
   * Clear error message
   */
  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Clear success message
   */
  const resetSuccess = useCallback(() => {
    dispatch(clearSuccess());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    successMessage,
    login,
    register,
    completeOnboarding,
    forgotPassword,
    resetPassword,
    getCompanies,
    logout,
    fetchCurrentUser,
    resetError,
    resetSuccess,
  };
}

export default useAuth;
