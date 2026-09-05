import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'Failed to load dashboard data';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const dashboardApi = {
  /**
   * Fetch KPI statistics for the dashboard
   */
  getStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  /**
   * Fetch recent audit activity feed
   * @param {number} limit
   */
  getActivity: async (limit = 15) => {
    const response = await apiClient.get(`/dashboard/activity?limit=${limit}`);
    return response.data;
  },
};

export default dashboardApi;
