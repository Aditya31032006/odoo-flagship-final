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
      'An unexpected error occurred';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const companyApi = {
  /**
   * Fetch all companies with primary contact info, filters, and pagination
   */
  async getCompaniesList(params = {}) {
    const response = await apiClient.get('/companies', { params });
    return response.data;
  },

  /**
   * Fetch specific company by ID
   */
  async getCompanyById(id) {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },

  /**
   * Admin creates a new client company with primary contact
   */
  async createCompany(payload) {
    const response = await apiClient.post('/companies', payload);
    return response.data;
  },

  /**
   * Toggle company status (active / inactive)
   */
  async toggleCompanyStatus(id, isActive) {
    const response = await apiClient.patch(`/companies/${id}/status`, { is_active: isActive });
    return response.data;
  },
};

export default companyApi;
