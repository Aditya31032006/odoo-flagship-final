import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const invoiceApi = {
  getInvoices: async (params = {}) => {
    const queryParams = typeof params === 'string'
      ? (params && params !== 'all' ? { status: params } : {})
      : {
          ...(params.status && params.status !== 'all' ? { status: params.status } : {}),
          ...(params.search ? { search: params.search } : {}),
          ...(params.page ? { page: params.page } : {}),
          ...(params.limit ? { limit: params.limit } : {}),
        };
    const res = await apiClient.get('/invoices', { params: queryParams });
    return res.data?.data;
  },

  getMeta: async () => {
    const res = await apiClient.get('/invoices/meta');
    return res.data?.data;
  },

  getInvoiceDetail: async (id) => {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data?.data;
  },

  createInvoice: async (invoiceData) => {
    const res = await apiClient.post('/invoices', invoiceData);
    return res.data;
  },

  recordPayment: async (id, paymentData) => {
    const res = await apiClient.post(`/invoices/${id}/payments`, paymentData);
    return res.data;
  },

  getInvoiceById: async (id) => {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data?.data;
  },
};

export default invoiceApi;

