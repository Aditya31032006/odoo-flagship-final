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
  getSubscriptions: async (statusFilter = '') => {
    const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
    const res = await apiClient.get('/subscriptions', { params });
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
};
