import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization header if token exists in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('df_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global responses and error standardizations
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const authApi = {
  /**
   * Log in user with email & password (role is resolved automatically by backend)
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register as a new Company or an Employee under a Company
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Complete onboarding for OAuth users
   */
  async completeOnboarding(data) {
    const response = await apiClient.post('/auth/complete-onboarding', data);
    return response.data;
  },

  /**
   * Get active companies list for employee registration selection
   */
  async getCompanies() {
    const response = await apiClient.get('/auth/companies');
    return response.data;
  },

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user from backend session & clear cookies
   */
  async logout() {
    const response = await apiClient.get('/auth/logout');
    return response.data;
  },

  /**
   * Request password reset OTP
   */
  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password using OTP
   */
  async resetPassword(data) {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },
};

export default apiClient;
