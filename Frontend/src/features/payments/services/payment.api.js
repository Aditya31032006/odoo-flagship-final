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
      'An unexpected payment error occurred';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const paymentApi = {
  /**
   * Create Razorpay Order for a specific Quotation
   */
  async createQuotationOrder(quotationId) {
    const response = await apiClient.post('/payments/razorpay/create-order', {
      quotation_id: quotationId,
    });
    return response.data?.data;
  },

  /**
   * Verify Razorpay Payment Signature & finalize transaction
   */
  async verifyPayment(verificationData) {
    const response = await apiClient.post('/payments/razorpay/verify-payment', verificationData);
    return response.data;
  },
};

export default paymentApi;
