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
  getInvoices: async (statusFilter = '') => {
    const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
    const res = await apiClient.get('/invoices', { params });
    return res.data?.data;
  },

  getInvoiceDetail: async (id) => {
    const res = await apiClient.get(`/invoices/${id}`);
    return res.data?.data;
  },

  recordPayment: async (id, paymentData) => {
    const res = await apiClient.post(`/invoices/${id}/payments`, paymentData);
    return res.data;
  },
};
