import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchApprovalsList,
  fetchApprovalDetail,
  submitApprovalDecision,
  setFilterPendingOnly,
  toggleFilterPendingOnly,
  clearApprovalMessages,
  clearCurrentDetail,
} from '../approvals.slice.js';

export const useApprovals = (quotationId = null) => {
  const dispatch = useDispatch();
  const {
    counts,
    approvals,
    currentDetail,
    isLoadingList,
    isLoadingDetail,
    isSubmittingDecision,
    isInitialized,
    error,
    successMsg,
    filterPendingOnly,
  } = useSelector((state) => state.approvals);

  useEffect(() => {
    if (quotationId) {
      dispatch(fetchApprovalDetail(quotationId));
    } else if (!isInitialized) {
      dispatch(fetchApprovalsList());
    }

    return () => {
      dispatch(clearApprovalMessages());
    };
  }, [dispatch, quotationId, isInitialized]);

  const refreshList = useCallback(() => {
    return dispatch(fetchApprovalsList());
  }, [dispatch]);

  const refreshDetail = useCallback(() => {
    if (quotationId) {
      return dispatch(fetchApprovalDetail(quotationId));
    }
  }, [dispatch, quotationId]);

  const makeDecision = useCallback(
    async (action, reason) => {
      if (!quotationId) return;
      const res = await dispatch(
        submitApprovalDecision({ quotationId, action, reason })
      ).unwrap();
      return res;
    },
    [dispatch, quotationId]
  );

  const handleTogglePendingOnly = useCallback(() => {
    dispatch(toggleFilterPendingOnly());
  }, [dispatch]);

  const filteredApprovals = filterPendingOnly
    ? approvals.filter((item) => item.status === 'pending_approval' || item.stage === 'Sales Manager' || item.stage === 'Finance')
    : approvals;

  return {
    counts,
    approvals: filteredApprovals,
    allApprovals: approvals,
    currentDetail,
    isLoadingList,
    isLoadingDetail,
    isSubmittingDecision,
    error,
    successMsg,
    filterPendingOnly,
    refreshList,
    refreshDetail,
    makeDecision,
    handleTogglePendingOnly,
    clearMessages: () => dispatch(clearApprovalMessages()),
    clearDetail: () => dispatch(clearCurrentDetail()),
  };
};

export default useApprovals;
