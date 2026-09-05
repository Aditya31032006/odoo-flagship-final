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
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/reports.scss';

function ReportsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, metaData] = await Promise.all([
        getReportAnalytics(filters),
        getReportFilterMeta(),
      ]);
      setAnalytics(analyticsData);
      if (metaData) setFilterMeta(metaData);
    } catch (err) {
      console.error('Error fetching reporting data:', err);
      setError('Unable to load reporting analytics. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
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
      toast.success('CSV report download started successfully!');
    } catch (err) {
      console.error('Error exporting CSV report:', err);
      toast.error('Failed to download CSV report. Please try again.');
    }
  };

  return (
    <div className="df-reports">
      {/* Header with Top-Right Actions */}
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

        <div className="df-reports__header-right">
          <button
            type="button"
            className="df-btn-primary df-reports__filter-bar-btn--pdf"
            onClick={handleOpenPrintModal}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF / Print
          </button>

          <button
            type="button"
            className="df-btn-secondary df-reports__filter-bar-btn--csv"
            onClick={handleExportCSV}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
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
