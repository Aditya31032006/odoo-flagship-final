import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchQuotations,
  fetchQuotationDetail,
  setViewMode,
  setSearchQuery,
  setSelectedStatus,
  clearActiveQuotation,
  clearQuotationError,
} from '../quotation.slice.js';

export const useQuotations = (autoFetch = true) => {
  const dispatch = useDispatch();
  const {
    viewMode,
    kanbanData,
    listData,
    summary,
    totalCount,
    searchQuery,
    selectedStatus,
    activeQuotation,
    isLoading,
    error,
  } = useSelector((state) => state.quotations);

  const loadQuotations = useCallback(() => {
    dispatch(
      fetchQuotations({
        view: viewMode === 'kanban' ? 'kanban' : 'list',
        status: selectedStatus,
        search: searchQuery,
      })
    );
  }, [dispatch, viewMode, selectedStatus, searchQuery]);

  useEffect(() => {
    if (autoFetch) {
      loadQuotations();
    }
  }, [autoFetch, loadQuotations]);

  const toggleViewMode = useCallback(
    (mode) => {
      dispatch(setViewMode(mode));
    },
    [dispatch]
  );

  const handleSearch = useCallback(
    (query) => {
      dispatch(setSearchQuery(query));
    },
    [dispatch]
  );

  const handleStatusFilter = useCallback(
    (status) => {
      dispatch(setSelectedStatus(status));
    },
    [dispatch]
  );

  const getDetail = useCallback(
    (id) => {
      dispatch(fetchQuotationDetail(id));
    },
    [dispatch]
  );

  const clearDetail = useCallback(() => {
    dispatch(clearActiveQuotation());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearQuotationError());
  }, [dispatch]);

  return {
    viewMode,
    kanbanData,
    listData,
    summary,
    totalCount,
    searchQuery,
    selectedStatus,
    activeQuotation,
    isLoading,
    error,
    refresh: loadQuotations,
    toggleViewMode,
    setSearch: handleSearch,
    setStatus: handleStatusFilter,
    getDetail,
    clearDetail,
    clearError,
  };
};

export default useQuotations;
