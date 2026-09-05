import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardStats,
  fetchDashboardActivity,
  clearDashboardErrors
} from '../dashboard.slice.js';

export const useDashboard = (autoFetch = true) => {
  const dispatch = useDispatch();
  const {
    stats,
    activities,
    isLoadingStats,
    isLoadingActivity,
    statsError,
    activityError,
    lastUpdated,
  } = useSelector((state) => state.dashboard);

  const loadData = useCallback(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchDashboardActivity(15));
  }, [dispatch]);

  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [autoFetch, loadData]);

  const clearErrors = useCallback(() => {
    dispatch(clearDashboardErrors());
  }, [dispatch]);

  return {
    stats,
    activities,
    isLoading: isLoadingStats || isLoadingActivity,
    isLoadingStats,
    isLoadingActivity,
    statsError,
    activityError,
    lastUpdated,
    refresh: loadData,
    clearErrors,
  };
};

export default useDashboard;
