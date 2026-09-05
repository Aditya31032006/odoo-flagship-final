import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productsApi = {
  getSummary: async () => {
    const res = await apiClient.get('/catalog/products/summary');
    return res.data?.data;
  },

  getAllProducts: async () => {
    const res = await apiClient.get('/catalog/products/all');
    return res.data?.data || [];
  },

  getCategories: async () => {
    const res = await apiClient.get('/catalog/products/categories');
    return res.data?.data || [];
  },

  createCategory: async (name) => {
    const res = await apiClient.post('/catalog/products/categories', { name });
    return res.data?.data;
  },

  getProductDetail: async (id) => {
    const res = await apiClient.get(`/catalog/products/${id}`);
    return res.data?.data;
  },

  createProduct: async (payload) => {
    const res = await apiClient.post('/catalog/products', payload);
    return res.data?.data;
  },

  updateProduct: async (id, payload) => {
    const res = await apiClient.put(`/catalog/products/${id}`, payload);
    return res.data?.data;
  },

  deleteProduct: async (id) => {
    const res = await apiClient.delete(`/catalog/products/${id}`);
    return res.data;
  },

  deleteVariant: async (variantId) => {
    const res = await apiClient.delete(`/catalog/variants/${variantId}`);
    return res.data;
  },
};

export default productsApi;

