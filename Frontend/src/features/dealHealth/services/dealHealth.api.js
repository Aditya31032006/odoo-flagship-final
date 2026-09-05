import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dealHealthApi = {
  getDashboard: async (typeFilter = '') => {
    const params = typeFilter && typeFilter !== 'all' ? { type: typeFilter } : {};
    const res = await apiClient.get('/deal-health', { params });
    return res.data?.data;
  },

  getConfig: async () => {
    const res = await apiClient.get('/deal-health/config');
    return res.data?.data;
  },

  updateConfig: async (configData) => {
    const res = await apiClient.put('/deal-health/config', configData);
    return res.data;
  },

  updateAction: async (flagId, { action, detail }) => {
    const res = await apiClient.patch(`/deal-health/flags/${flagId}/action`, { action, detail });
    return res.data;
  },

  triggerScan: async () => {
    const res = await apiClient.post('/deal-health/scan');
    return res.data;
  },
};
