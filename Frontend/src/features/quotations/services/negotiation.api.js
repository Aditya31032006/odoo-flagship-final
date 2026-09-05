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
      'An unexpected error occurred during negotiation.';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const negotiationApi = {
  getNegotiation: async (quotationId) => {
    const res = await apiClient.get(`/negotiations/${quotationId}`);
    return res.data?.data;
  },

  submitCounterOffer: async (quotationId, payload) => {
    const res = await apiClient.post(`/negotiations/${quotationId}/counter`, payload);
    return res.data;
  },

  sendMessage: async (quotationId, payload) => {
    const res = await apiClient.post(`/negotiations/${quotationId}/messages`, payload);
    return res.data;
  },

  acceptQuotation: async (quotationId) => {
    const res = await apiClient.post(`/negotiations/${quotationId}/accept`);
    return res.data;
  },
};

export default negotiationApi;
