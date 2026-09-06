import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import quotationApi from '../services/quotation.api.js';

/**
 * Custom hook for My Quotations (Customer Portal) with TanStack Query 5-minute caching and infinite scroll pagination.
 */
export const useMyQuotations = ({
  status = 'all',
  search = '',
  limit = 10,
  enabled = true,
} = {}) => {
  const queryClient = useQueryClient();
  const sentinelRef = useRef(null);

  const queryKey = ['my_quotations', status, search, limit];

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await quotationApi.getQuotations({
        view: 'list',
        page: pageParam,
        limit,
        status: status !== 'all' ? status : undefined,
        search: search || undefined,
      });
      const items = res?.data || [];
      const pagination = res?.pagination || {};
      const total = pagination.total ?? (res?.totalCount || items.length);
      const hasNext = pagination.hasNextPage !== undefined ? pagination.hasNextPage : (items.length >= limit && pageParam * limit < total);

      return {
        data: items,
        pagination,
        total,
        nextPage: hasNext ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes fresh data
    gcTime: 10 * 60 * 1000,   // 10 minutes cache retention in memory
  });

  // Flatten all cached pages into a single items array
  const quotations = data?.pages ? data.pages.flatMap((page) => page.data) : [];
  const totalCount = data?.pages?.[0]?.total ?? quotations.length;

  // IntersectionObserver to auto-fetch next page when scrolling
  useEffect(() => {
    const sentinelEl = sentinelRef.current;
    if (!sentinelEl || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: null, rootMargin: '150px', threshold: 0.1 }
    );

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my_quotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
  }, [queryClient]);

  return {
    quotations,
    loadingInitial: isLoading,
    loadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    totalCount,
    sentinelRef,
    error: error ? (error.customMessage || error.message) : null,
    refetch,
    invalidateCache,
  };
};

export default useMyQuotations;
