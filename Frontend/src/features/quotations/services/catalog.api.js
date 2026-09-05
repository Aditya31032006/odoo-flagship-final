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

export const catalogApi = {
  getCustomers: async () => {
    const res = await apiClient.get('/catalog/customers');
    return res.data?.data || [];
  },

  getPriceLists: async () => {
    const res = await apiClient.get('/catalog/price-lists');
    return res.data?.data || [];
  },

  getPriceListItems: async (priceListId) => {
    const res = await apiClient.get(`/catalog/price-lists/${priceListId}/items`);
    return res.data?.data || [];
  },

  getProducts: async () => {
    const res = await apiClient.get('/catalog/products');
    return res.data?.data || [];
  },

  getUpsells: async (productIds = []) => {
    const ids = productIds.filter(Boolean).join(',');
    const res = await apiClient.get(`/catalog/upsells?productIds=${ids}`);
    return res.data?.data || [];
  },

  getApprovalRules: async () => {
    const res = await apiClient.get('/catalog/approval-rules');
    return res.data?.data || [];
  },
};

export default catalogApi;
