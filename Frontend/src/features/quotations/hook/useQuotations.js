import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { quotationApi } from '../services/quotation.api.js';
import {
  setViewMode,
  setSearchQuery,
  setSelectedStatus,
  fetchQuotationDetail,
  clearActiveQuotation,
  clearQuotationError,
} from '../quotation.slice.js';

export const useQuotations = (autoFetch = true) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const {
    viewMode,
    searchQuery,
    selectedStatus,
    activeQuotation,
  } = useSelector((state) => state.quotations);

  const currentView = viewMode === 'kanban' ? 'kanban' : 'list';

  // 5-Minute Cached TanStack Query for Quotations
  const {
    data: queryResult,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['quotations', currentView, selectedStatus, searchQuery],
    queryFn: async () => {
      const res = await quotationApi.getQuotations({
        view: currentView,
        status: selectedStatus,
        search: searchQuery,
      });
      return {
        data: res?.data || (currentView === 'kanban' ? {} : []),
        summary: res?.summary || null,
        totalCount: res?.totalCount || 0,
      };
    },
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes fresh data
    gcTime: 10 * 60 * 1000,   // 10 minutes cache retention
  });

  const kanbanData = currentView === 'kanban' && queryResult?.data ? queryResult.data : {
    draft: [],
    pending_approval: [],
    approved: [],
    negotiating: [],
    confirmed: [],
  };

  const listData = currentView === 'list' && Array.isArray(queryResult?.data) ? queryResult.data : [];
  const summary = queryResult?.summary || null;
  const totalCount = queryResult?.totalCount || 0;
  const error = queryError ? (queryError.customMessage || queryError.message || 'Failed to fetch quotations') : null;

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

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  }, [queryClient]);

  return {
    viewMode,
    kanbanData,
    listData,
    summary,
    totalCount,
    searchQuery,
    selectedStatus,
    activeQuotation,
    isLoading: isLoading || (isFetching && !queryResult),
    isFetching,
    error,
    refresh: refetch,
    invalidateCache,
    toggleViewMode,
    setSearch: handleSearch,
    setStatus: handleStatusFilter,
    getDetail,
    clearDetail,
    clearError,
  };
};

export default useQuotations;

