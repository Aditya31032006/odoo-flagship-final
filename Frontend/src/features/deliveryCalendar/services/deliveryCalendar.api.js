import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deliveryCalendarApi = {
  getCalendarData: async () => {
    const res = await apiClient.get('/delivery-calendar');
    return res.data?.data || res.data;
  },
};

export default deliveryCalendarApi;
