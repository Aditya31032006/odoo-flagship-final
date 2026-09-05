import axios from 'axios';

const API_BASE = '/api/reports';

/**
 * Fetch analytics data with optional filters
 * @param {Object} filters - { period, sales_rep_id, status, category_id }
 */
export const getReportAnalytics = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.period) params.append('period', filters.period);
  if (filters.sales_rep_id) params.append('sales_rep_id', filters.sales_rep_id);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.category_id && filters.category_id !== 'all') params.append('category_id', filters.category_id);

  const response = await axios.get(`${API_BASE}/analytics?${params.toString()}`, {
    withCredentials: true,
  });
  return response.data?.data;
};

/**
 * Fetch filter dropdown metadata
 */
export const getReportFilterMeta = async () => {
  const response = await axios.get(`${API_BASE}/meta`, {
    withCredentials: true,
  });
  return response.data?.data;
};

/**
 * Download CSV report file
 * @param {Object} filters
 */
export const downloadReportCSV = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.period) params.append('period', filters.period);
  if (filters.sales_rep_id) params.append('sales_rep_id', filters.sales_rep_id);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);

  const response = await axios.get(`${API_BASE}/export-csv?${params.toString()}`, {
    withCredentials: true,
    responseType: 'blob',
  });

  // Trigger browser file download
  const blob = new Blob([response.data], { type: 'text/csv' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `DealFlow360_Report_${filters.period || 'current'}_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};
