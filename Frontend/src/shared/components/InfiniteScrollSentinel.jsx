import React from 'react';

/**
 * Visual Sentinel component placed at the end of scrollable lists and tables.
 * Displays loading spinner when fetching more items, or end-of-records text when all are loaded.
 */
export function InfiniteScrollSentinel({
  sentinelRef,
  loadingMore,
  hasMore,
  itemsCount = 0,
  endMessage = '— All records loaded —',
}) {
  return (
    <div
      ref={sentinelRef}
      className="df-infinite-sentinel"
      style={{
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        minHeight: '60px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {loadingMore && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            color: '#0d9488',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(13, 148, 136, 0.2)',
              borderTopColor: '#0d9488',
              borderRadius: '50%',
              animation: 'df-spin 0.6s linear infinite',
            }}
          />
          <span>Loading more records...</span>
        </div>
      )}

      {!hasMore && itemsCount > 0 && !loadingMore && (
        <div
          style={{
            color: '#9ca3af',
            fontSize: '0.8125rem',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {endMessage}
        </div>
      )}
    </div>
  );
}

export default InfiniteScrollSentinel;
