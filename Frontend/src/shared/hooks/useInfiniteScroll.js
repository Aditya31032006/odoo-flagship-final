import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Robust Custom Hook for Infinite Scroll Pagination
 * @param {Object} options
 * @param {Function} options.fetchFunction - Async function receiving `(page, limit)`
 * @param {Array} [options.dependencies=[]] - Array of primitive filter/search values that trigger a reset to page 1
 * @param {number} [options.limit=10] - Items per page
 * @param {boolean} [options.enabled=true] - Whether fetching is active
 */
export function useInfiniteScroll({
  fetchFunction,
  dependencies = [],
  limit = 10,
  enabled = true,
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);
  const fetchFunctionRef = useRef(fetchFunction);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);

  // Keep fetchFunction updated without causing effect re-runs
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  });

  // Core fetch execution
  const executeFetch = useCallback(
    async (targetPage, isReset = false) => {
      if (!enabled || isFetchingRef.current) return;

      isFetchingRef.current = true;
      if (isReset) {
        setLoadingInitial(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetchFunctionRef.current(targetPage, limit);

        // Extract items from any standard response format
        const newItems =
          response?.data ||
          response?.items ||
          response?.companies ||
          response?.staff ||
          response?.quotations ||
          response?.invoices ||
          response?.approvals ||
          response?.subscriptions ||
          (Array.isArray(response) ? response : []);

        const pagination = response?.pagination || {};
        const totalCount =
          pagination.total !== undefined
            ? pagination.total
            : response?.totalCount !== undefined
            ? response?.totalCount
            : response?.total !== undefined
            ? response?.total
            : isReset
            ? newItems.length
            : total + newItems.length;

        const hasNext =
          pagination.hasNextPage !== undefined
            ? pagination.hasNextPage
            : newItems.length >= limit && targetPage * limit < totalCount;

        setItems((prev) => (isReset ? newItems : [...prev, ...newItems]));
        setTotal(totalCount);
        setHasMore(hasNext);
        hasMoreRef.current = hasNext;
        setPage(targetPage);
        pageRef.current = targetPage;
      } catch (err) {
        console.error('[InfiniteScroll] Fetch error:', err);
        setError(err.customMessage || err.message || 'Failed to load records.');
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit, enabled]
  );

  // Reset and fetch page 1 whenever dependencies change or enabled toggles
  const depsKey = JSON.stringify(dependencies);
  useEffect(() => {
    if (!enabled) return;
    setPage(1);
    pageRef.current = 1;
    executeFetch(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, enabled, limit]);

  // Load next page function
  const loadMore = useCallback(() => {
    if (!enabled || isFetchingRef.current || loadingInitial || loadingMore || !hasMoreRef.current) {
      return;
    }
    executeFetch(pageRef.current + 1, false);
  }, [enabled, executeFetch, loadingInitial, loadingMore]);

  // IntersectionObserver to auto-trigger loadMore when sentinel is in view
  useEffect(() => {
    const sentinelEl = sentinelRef.current;
    if (!sentinelEl || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (!isFetchingRef.current && hasMoreRef.current && !loadingInitial && !loadingMore) {
            loadMore();
          }
        }
      },
      {
        root: null,
        rootMargin: '150px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinelEl);

    return () => {
      observer.disconnect();
    };
  }, [enabled, hasMore, loadingInitial, loadingMore, loadMore]);

  const mutateItems = useCallback((updater) => {
    setItems((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const refetch = useCallback(() => {
    return executeFetch(1, true);
  }, [executeFetch]);

  return {
    items,
    setItems: mutateItems,
    page,
    total,
    totalCount: total,
    loadingInitial,
    loadingMore,
    hasMore,
    error,
    sentinelRef,
    loadMore,
    refetch,
  };
}

export default useInfiniteScroll;
