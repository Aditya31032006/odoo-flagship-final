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
      'Failed to load quotations';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const quotationApi = {
  /**
   * Fetch quotations with optional view type, status, and search filters
   * @param {Object} params
   * @param {'kanban'|'list'} params.view
   * @param {string} params.status
   * @param {string} params.search
   */
  getQuotations: async ({ view = 'kanban', status = '', search = '' } = {}) => {
    const queryParams = new URLSearchParams();
    if (view) queryParams.append('view', view);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);

    const response = await apiClient.get(`/quotations?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Fetch pipeline summary counts and amounts
   */
  getSummary: async () => {
    const response = await apiClient.get('/quotations/summary');
    return response.data;
  },

  /**
   * Fetch single quotation by ID
   * @param {string|number} id
   */
  getQuotationById: async (id) => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data;
  },
};

export default quotationApi;
