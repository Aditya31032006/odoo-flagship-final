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
      'An unexpected error occurred';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export const staffApi = {
  /**
   * Fetch all staff members
   */
  async getStaffList() {
    const response = await apiClient.get('/staff');
    return response.data;
  },

  /**
   * Invite / Create new staff user
   */
  async createStaff(payload) {
    const response = await apiClient.post('/staff', payload);
    return response.data;
  },

  /**
   * Toggle staff status (active / inactive)
   */
  async toggleStaffStatus(id, isActive) {
    const response = await apiClient.patch(`/staff/${id}/status`, { is_active: isActive });
    return response.data;
  },

  /**
   * Update staff member profile & role
   */
  async updateStaff(id, payload) {
    const response = await apiClient.put(`/staff/${id}`, payload);
    return response.data;
  },

  /**
   * Delete a staff user
   */
  async deleteStaff(id) {
    const response = await apiClient.delete(`/staff/${id}`);
    return response.data;
  }
};

export default staffApi;
