import { useState, useCallback } from 'react';
import companyApi from '../services/company.api.js';
import { useInfiniteScroll } from '../../../shared/hooks/useInfiniteScroll.js';

export function useCompany() {
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { company, tempPassword }
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const [counts, setCounts] = useState({ total_count: 0, active_count: 0, inactive_count: 0 });

  // Define fetchFunction for infinite scroll
  const fetchCompanies = useCallback(
    async (page, limit) => {
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      const res = await companyApi.getCompaniesList(params);
      if (res?.counts) {
        setCounts(res.counts);
      }
      return res;
    },
    [searchTerm, filterStatus]
  );

  const {
    items: companies,
    setItems: setCompanies,
    total: totalCount,
    loadingInitial,
    loadingMore,
    hasMore,
    error,
    sentinelRef,
    refetch,
  } = useInfiniteScroll({
    fetchFunction: fetchCompanies,
    dependencies: [searchTerm, filterStatus],
    limit: 10,
  });

  const handleCreateCompany = async (payload) => {
    setActionLoading(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      const res = await companyApi.createCompany(payload);
      setCreatedCredentials({
        company: res.company,
        tempPassword: res.tempPassword,
      });
      setIsCreateModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Company provisioned successfully!',
      });
      await refetch();
      return { success: true };
    } catch (err) {
      const msg = err.customMessage || 'Failed to create company.';
      setFeedbackMessage({ type: 'error', text: msg });
      return { success: false, error: msg };
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setActionLoading(true);
    try {
      await companyApi.toggleCompanyStatus(id, !currentStatus);
      setFeedbackMessage({
        type: 'success',
        text: `Company ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });
      // Optimistic update + refetch
      setCompanies((prev) =>
        prev.map((c) => (c.company_id === id ? { ...c, is_active: !currentStatus } : c))
      );
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.customMessage || 'Failed to update company status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return {
    companies,
    counts,
    totalCount: counts.total_count ?? totalCount,
    loading: loadingInitial,
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
    setFeedbackMessage,
    refetch,
    handleCreateCompany,
    handleToggleStatus,
  };
}

export default useCompany;
