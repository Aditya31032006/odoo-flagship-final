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

export const discountRulesApi = {
  getConfig: async () => {
    const res = await apiClient.get('/discount-rules/config');
    return res.data?.data;
  },

  saveConfig: async (payload) => {
    const res = await apiClient.put('/discount-rules/config', payload);
    return res.data;
  },
};

export default discountRulesApi;
