import React from 'react';
import useCompany from '../hooks/useCompany.js';
import CompanyTable from '../components/CompanyTable.jsx';
import CreateCompanyModal from '../components/CreateCompanyModal.jsx';
import CompanyCredentialsModal from '../components/CompanyCredentialsModal.jsx';
import InfiniteScrollSentinel from '../../../shared/components/InfiniteScrollSentinel.jsx';
import '../styles/company.scss';

export function CompanyManagement() {
  const {
    companies,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    actionLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createdCredentials,
    setCreatedCredentials,
    feedbackMessage,
    handleCreateCompany,
    handleToggleStatus,
  } = useCompany();

  const activeCount = companies.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="df-company">
      <div className="df-company__container">
        {/* Header */}
        <div className="df-company__header">
          <div className="df-company__header-left">
            <h1>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Company Management
            </h1>
            <p>Onboard, provision, and monitor B2B client organizations and their primary contacts.</p>
          </div>

          <div className="df-company__header-right">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Add Client Company
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage.text && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: feedbackMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
              color: feedbackMessage.type === 'error' ? '#dc2626' : '#16a34a',
              border: `1px solid ${feedbackMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Summary Metrics */}
        <div className="df-company__metrics">
          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--total">🏢</div>
            <div className="metric-card-info">
              <span className="metric-card-val">{totalCount}</span>
              <span className="metric-card-label">Total Organizations</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--active">✅</div>
            <div className="metric-card-info">
              <span className="metric-card-val">{activeCount}</span>
              <span className="metric-card-label">Active Portals</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-icon metric-card-icon--inactive">⏸️</div>
            <div className="metric-card-info">
              <span className="metric-card-val">{inactiveCount}</span>
              <span className="metric-card-label">Deactivated</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="df-company__controls">
          <div className="search-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search companies, GST, or contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              type="button"
              className={filterStatus === 'all' ? 'active' : ''}
              onClick={() => setFilterStatus('all')}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={filterStatus === 'active' ? 'active' : ''}
              onClick={() => setFilterStatus('active')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={filterStatus === 'inactive' ? 'active' : ''}
              onClick={() => setFilterStatus('inactive')}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Company Table Card */}
        <div className="df-company__card">
          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#6b7280' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>Loading organizations...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#dc2626' }}>
              <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
            </div>
          ) : (
            <>
              <CompanyTable
                companies={companies}
                onToggleStatus={handleToggleStatus}
                actionLoading={actionLoading}
              />
              <InfiniteScrollSentinel
                sentinelRef={sentinelRef}
                loadingMore={loadingMore}
                hasMore={hasMore}
                itemCount={companies.length}
                totalCount={totalCount}
                emptyMessage="No organizations found matching your criteria."
              />
            </>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCompany}
        loading={actionLoading}
        error={feedbackMessage.type === 'error' ? feedbackMessage.text : null}
      />

      {/* Credentials Modal */}
      <CompanyCredentialsModal
        data={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
      />
    </div>
  );
}

export default CompanyManagement;
