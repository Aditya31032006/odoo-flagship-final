import { useState, useEffect, useCallback, useMemo } from 'react';
import companyApi from '../services/company.api.js';

export function useCompany() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { company, tempPassword }
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await companyApi.getCompaniesList();
      setCompanies(res.companies || []);
    } catch (err) {
      setError(err.customMessage || 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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
      await fetchCompanies();
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
      await fetchCompanies();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.customMessage || 'Failed to update company status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.gst_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primary_contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primary_contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company_email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && c.is_active) ||
        (filterStatus === 'inactive' && !c.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, filterStatus]);

  return {
    companies: filteredCompanies,
    totalCount: companies.length,
    loading,
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
    fetchCompanies,
    handleCreateCompany,
    handleToggleStatus,
  };
}

export default useCompany;
