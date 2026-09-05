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

export const approvalsApi = {
  getApprovalsList: async () => {
    const res = await apiClient.get('/approvals');
    return res.data?.data;
  },

  getApprovalDetail: async (quotationId) => {
    const res = await apiClient.get(`/approvals/${quotationId}`);
    return res.data?.data;
  },

  submitDecision: async (quotationId, { action, reason }) => {
    const res = await apiClient.post(`/approvals/${quotationId}/decision`, {
      action,
      reason,
    });
    return res.data;
  },
};

export default approvalsApi;
