import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStaffMembers,
  createStaffMember,
  toggleStaffActiveStatus,
  updateStaffMember,
  deleteStaffMember,
} from '../staff.slice.js';

export function useStaff() {
  const dispatch = useDispatch();
  const { staffList, loading, isInitialized, error } = useSelector((state) => state.staff);

  /**
   * Fetch all staff members with store caching
   */
  const fetchStaff = useCallback(
    async (force = false) => {
      if (force || !isInitialized) {
        const resultAction = await dispatch(fetchStaffMembers());
        if (fetchStaffMembers.fulfilled.match(resultAction)) {
          return { success: true, staff: resultAction.payload };
        }
        return { success: false, error: resultAction.payload };
      }
      return { success: true, staff: staffList };
    },
    [dispatch, isInitialized, staffList]
  );

  /**
   * Create & invite a new staff member
   */
  const createStaff = useCallback(
    async (data) => {
      const resultAction = await dispatch(createStaffMember(data));
      if (createStaffMember.fulfilled.match(resultAction)) {
        return {
          success: true,
          staff: resultAction.payload.staff,
          message: resultAction.payload.message,
          tempPassword: resultAction.payload.tempPassword,
        };
      }
      return { success: false, error: resultAction.payload };
    },
    [dispatch]
  );

  /**
   * Toggle staff status (active / inactive)
   */
  const toggleStatus = useCallback(
    async (id, isActive) => {
      const resultAction = await dispatch(toggleStaffActiveStatus({ id, isActive }));
      if (toggleStaffActiveStatus.fulfilled.match(resultAction)) {
        return {
          success: true,
          staff: resultAction.payload.staff,
          message: resultAction.payload.message,
        };
      }
      return { success: false, error: resultAction.payload };
    },
    [dispatch]
  );

  /**
   * Update staff details
   */
  const updateStaff = useCallback(
    async (id, data) => {
      const resultAction = await dispatch(updateStaffMember({ id, data }));
      if (updateStaffMember.fulfilled.match(resultAction)) {
        return {
          success: true,
          staff: resultAction.payload.staff,
          message: resultAction.payload.message,
        };
      }
      return { success: false, error: resultAction.payload };
    },
    [dispatch]
  );

  /**
   * Delete a staff user
   */
  const deleteStaff = useCallback(
    async (id) => {
      const resultAction = await dispatch(deleteStaffMember(id));
      if (deleteStaffMember.fulfilled.match(resultAction)) {
        return { success: true, message: resultAction.payload.message };
      }
      return { success: false, error: resultAction.payload };
    },
    [dispatch]
  );

  return {
    staffList,
    loading,
    isInitialized,
    error,
    fetchStaff,
    createStaff,
    toggleStatus,
    updateStaff,
    deleteStaff,
  };
}

export default useStaff;
