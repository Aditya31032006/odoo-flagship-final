import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'Failed to execute quotation operation';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const quotationApi = {
  getQuotations: async ({ view = 'kanban', status = '', search = '', page = 1, limit = 10 } = {}) => {
    const queryParams = new URLSearchParams();
    if (view) queryParams.append('view', view);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);

    const response = await apiClient.get(`/quotations?${queryParams.toString()}`);
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get('/quotations/summary');
    return response.data;
  },

  getQuotationById: async (id) => {
    const response = await apiClient.get(`/quotations/${id}`);
    return response.data?.data || null;
  },

  createQuotation: async (payload) => {
    const response = await apiClient.post('/quotations', payload);
    return response.data?.data;
  },

  updateQuotation: async (id, payload) => {
    const response = await apiClient.put(`/quotations/${id}`, payload);
    return response.data?.data;
  },

  submitForApproval: async (id, payload) => {
    const response = await apiClient.post(`/quotations/${id}/submit-approval`, payload);
    return response.data;
  },

  payQuotation: async (id, payload = {}) => {
    const response = await apiClient.post(`/quotations/${id}/pay`, payload);
    return response.data;
  },
};

export default quotationApi;
