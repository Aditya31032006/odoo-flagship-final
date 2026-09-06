import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const subscriptionApi = {
  getSubscriptions: async (params = {}) => {
    const queryParams = typeof params === 'string'
      ? (params && params !== 'all' ? { status: params } : {})
      : {
          ...(params.status && params.status !== 'all' ? { status: params.status } : {}),
          ...(params.search ? { search: params.search } : {}),
          ...(params.page ? { page: params.page } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        };
    const res = await apiClient.get('/subscriptions', { params: queryParams });
    return res.data?.data;
  },

  getSubscriptionDetail: async (id) => {
    const res = await apiClient.get(`/subscriptions/${id}`);
    return res.data?.data;
  },

  getPlans: async () => {
    const res = await apiClient.get('/subscriptions/plans');
    return res.data?.data;
  },

  createPlan: async (planData) => {
    const res = await apiClient.post('/subscriptions/plans', planData);
    return res.data;
  },

  modifySubscription: async (id, updateData) => {
    const res = await apiClient.patch(`/subscriptions/${id}/modify`, updateData);
    return res.data;
  },

  cancelSubscription: async (id, payload) => {
    const res = await apiClient.post(`/subscriptions/${id}/cancel`, payload);
    return res.data;
  },

  pauseSubscription: async (id) => {
    const res = await apiClient.post(`/subscriptions/${id}/pause`);
    return res.data;
  },

  resumeSubscription: async (id) => {
    const res = await apiClient.post(`/subscriptions/${id}/resume`);
    return res.data;
  },
};
