import { useState, useCallback } from 'react';
import { staffApi } from '../services/staff.api.js';

export function useStaff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all staff members from backend
   */
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffApi.getStaffList();
      if (res?.staff) {
        setStaffList(res.staff);
      }
      return { success: true, staff: res.staff };
    } catch (err) {
      const msg = err.customMessage || 'Failed to fetch staff members.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create & invite a new staff member
   */
  const createStaff = useCallback(async (data) => {
    setError(null);
    try {
      const res = await staffApi.createStaff(data);
      if (res?.staff) {
        setStaffList((prev) => [res.staff, ...prev]);
      }
      return { success: true, staff: res.staff, message: res.message, tempPassword: res.tempPassword };
    } catch (err) {
      const msg = err.customMessage || 'Failed to invite staff member.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  /**
   * Toggle staff status (active / inactive)
   */
  const toggleStatus = useCallback(async (id, isActive) => {
    setError(null);
    try {
      const res = await staffApi.toggleStaffStatus(id, isActive);
      if (res?.staff) {
        setStaffList((prev) =>
          prev.map((item) => (item.id === id ? { ...item, is_active: res.staff.is_active } : item))
        );
      }
      return { success: true, staff: res.staff, message: res.message };
    } catch (err) {
      const msg = err.customMessage || 'Failed to update staff status.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  /**
   * Update staff details
   */
  const updateStaff = useCallback(async (id, data) => {
    setError(null);
    try {
      const res = await staffApi.updateStaff(id, data);
      if (res?.staff) {
        setStaffList((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...res.staff } : item))
        );
      }
      return { success: true, staff: res.staff, message: res.message };
    } catch (err) {
      const msg = err.customMessage || 'Failed to update staff details.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  /**
   * Delete a staff user
   */
  const deleteStaff = useCallback(async (id) => {
    setError(null);
    try {
      const res = await staffApi.deleteStaff(id);
      setStaffList((prev) => prev.filter((item) => item.id !== id));
      return { success: true, message: res.message };
    } catch (err) {
      const msg = err.customMessage || 'Failed to delete staff member.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  return {
    staffList,
    loading,
    error,
    fetchStaff,
    createStaff,
    toggleStatus,
    updateStaff,
    deleteStaff,
  };
}

export default useStaff;
