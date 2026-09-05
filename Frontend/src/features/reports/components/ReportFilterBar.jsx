import React from 'react';

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'confirmed', label: 'Confirmed / Ordered' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'rejected', label: 'Rejected' },
];

function ReportFilterBar({
  filters,
  filterMeta,
  onFilterChange,
  onExportPDF,
  onExportCSV,
}) {
  return (
    <div className="df-reports__filter-bar">
      <div className="df-reports__filter-bar-controls">
        {/* Period Selector */}
        <div className="df-reports__filter-bar-group">
          <label htmlFor="report-period">Period</label>
          <select
            id="report-period"
            value={filters.period || 'this_month'}
            onChange={(e) => onFilterChange('period', e.target.value)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sales Rep Selector */}
        <div className="df-reports__filter-bar-group">
          <label htmlFor="report-sales-rep">Sales Rep</label>
          <select
            id="report-sales-rep"
            value={filters.sales_rep_id || ''}
            onChange={(e) => onFilterChange('sales_rep_id', e.target.value)}
          >
            <option value="">All Sales Reps</option>
            {filterMeta?.sales_reps?.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </div>

        {/* Approval Status Selector */}
        <div className="df-reports__filter-bar-group">
          <label htmlFor="report-status">Approval Status</label>
          <select
            id="report-status"
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            {APPROVAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="df-reports__filter-bar-group">
          <label htmlFor="report-category">Product Category</label>
          <select
            id="report-category"
            value={filters.category_id || 'all'}
            onChange={(e) => onFilterChange('category_id', e.target.value)}
          >
            <option value="all">All Categories</option>
            {filterMeta?.categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Export Actions */}
      <div className="df-reports__filter-bar-actions">
        <button
          type="button"
          className="df-reports__filter-bar-btn df-reports__filter-bar-btn--pdf"
          onClick={onExportPDF}
          title="Print or Save PDF report"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Export PDF
        </button>

        <button
          type="button"
          className="df-reports__filter-bar-btn df-reports__filter-bar-btn--csv"
          onClick={onExportCSV}
          title="Download data in CSV / Excel format"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>
    </div>
  );
}

export default React.memo(ReportFilterBar);
