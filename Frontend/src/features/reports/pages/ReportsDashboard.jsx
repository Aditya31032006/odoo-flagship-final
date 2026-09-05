import React, { useState, useEffect, useCallback } from 'react';
import { getReportAnalytics, getReportFilterMeta, downloadReportCSV } from '../services/report.service.js';
import useAuth from '../../auth/hook/useAuth.js';
import ReportFilterBar from '../components/ReportFilterBar.jsx';
import ReportKPIs from '../components/ReportKPIs.jsx';
import SalesTrendChart from '../components/SalesTrendChart.jsx';
import ApprovalBottleneckChart from '../components/ApprovalBottleneckChart.jsx';
import ProductUpsellMatrix from '../components/ProductUpsellMatrix.jsx';
import SalesRepLeaderboard from '../components/SalesRepLeaderboard.jsx';
import ReportPrintModal from '../components/ReportPrintModal.jsx';
import '../styles/reports.scss';

function ReportsDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [filterMeta, setFilterMeta] = useState({ sales_reps: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    period: 'this_month',
    sales_rep_id: '',
    status: 'all',
    category_id: 'all',
  });

  // Fetch Filter Dropdown Metadata once on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await getReportFilterMeta();
        setFilterMeta(meta || { sales_reps: [], categories: [] });
      } catch (err) {
        console.error('Error fetching filter metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Analytics data whenever filters change
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReportAnalytics(filters);
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading report analytics:', err);
      setError(err.response?.data?.message || 'Failed to load report analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleOpenPrintModal = () => {
    setIsPrintModalOpen(true);
  };

  const handleClosePrintModal = () => {
    setIsPrintModalOpen(false);
  };

  const handleExportCSV = async () => {
    try {
      await downloadReportCSV(filters);
    } catch (err) {
      console.error('Error exporting CSV report:', err);
      alert('Failed to download CSV report. Please try again.');
    }
  };

  return (
    <div className="df-reports">
      {/* Header */}
      <div className="df-reports__header">
        <div className="df-reports__header-left">
          <h1 className="df-reports__header-title">
            Admin / Reporting Dashboard
            <span className="df-reports__badge-tag">Executive Intelligence</span>
          </h1>
          <p className="df-reports__header-subtitle">
            Sales velocity, approval bottlenecks, product upsell attach rates, and rep performance metrics
          </p>
        </div>
      </div>

      {/* Filter Bar with Export Actions */}
      <ReportFilterBar
        filters={filters}
        filterMeta={filterMeta}
        onFilterChange={handleFilterChange}
        onExportPDF={handleOpenPrintModal}
        onExportCSV={handleExportCSV}
      />

      {/* Error Alert */}
      {error && (
        <div className="df-reports__error-card">
          <span>{error}</span>
          <button type="button" onClick={fetchAnalytics} className="df-reports__filter-bar-btn df-reports__filter-bar-btn--pdf">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="df-reports__loading-skeleton">
          <div className="spinner" />
          <p>Compiling executive reporting metrics & revenue analytics...</p>
        </div>
      ) : (
        <>
          {/* 1. Top KPI Summary Cards */}
          <ReportKPIs
            summary={analytics?.summaryKpis}
            bottlenecks={analytics?.approvalBottlenecks}
            topProducts={analytics?.topProducts}
          />

          {/* 2. Middle Row: Sales Revenue Timeline Trend & Approval Bottlenecks */}
          <div className="df-reports__charts-grid">
            <SalesTrendChart data={analytics?.salesTrends} />
            <ApprovalBottleneckChart data={analytics?.approvalBottlenecks} />
          </div>

          {/* 3. Product Performance, Upsell Attach Rates & Revenue Mix */}
          <div className="df-reports__charts-grid">
            <ProductUpsellMatrix
              topProducts={analytics?.topProducts}
              revenueMix={analytics?.revenueMix}
            />
          </div>

          {/* 4. Sales Rep Performance Leaderboard */}
          <div className="df-reports__charts-grid">
            <SalesRepLeaderboard leaderboard={analytics?.salesRepLeaderboard} />
          </div>
        </>
      )}

      {/* Dedicated Executive PDF Document Preview & Print Modal */}
      {isPrintModalOpen && (
        <ReportPrintModal
          isOpen={isPrintModalOpen}
          onClose={handleClosePrintModal}
          analytics={analytics}
          filters={filters}
          filterMeta={filterMeta}
          user={user}
        />
      )}
    </div>
  );
}

export default React.memo(ReportsDashboard);
