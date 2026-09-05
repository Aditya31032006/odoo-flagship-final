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

export const fulfillmentApi = {
  getList: async () => {
    const res = await apiClient.get('/fulfillment');
    return res.data?.data;
  },

  getMeta: async () => {
    const res = await apiClient.get('/fulfillment/meta');
    return res.data?.data;
  },

  getDetail: async (orderId) => {
    const res = await apiClient.get(`/fulfillment/${orderId}`);
    return res.data?.data;
  },

  acceptSplit: async (orderId) => {
    const res = await apiClient.post(`/fulfillment/${orderId}/accept-split`);
    return res.data;
  },

  saveManualOverride: async (orderId, { splits, backorderQty }) => {
    const res = await apiClient.post(`/fulfillment/${orderId}/manual-override`, {
      splits,
      backorderQty,
    });
    return res.data;
  },

  // Stock CRUD
  createStock: async (payload) => {
    const res = await apiClient.post('/fulfillment/stock', payload);
    return res.data;
  },

  updateStock: async (stockId, payload) => {
    const res = await apiClient.put(`/fulfillment/stock/${stockId}`, payload);
    return res.data;
  },

  deleteStock: async (stockId) => {
    const res = await apiClient.delete(`/fulfillment/stock/${stockId}`);
    return res.data;
  },

  // Order CRUD
  createOrder: async (payload) => {
    const res = await apiClient.post('/fulfillment/orders', payload);
    return res.data;
  },

  updateOrder: async (orderId, payload) => {
    const res = await apiClient.put(`/fulfillment/orders/${orderId}`, payload);
    return res.data;
  },

  deleteOrder: async (orderId) => {
    const res = await apiClient.delete(`/fulfillment/orders/${orderId}`);
    return res.data;
  },
};

export default fulfillmentApi;
