import {
  getReportAnalyticsRepo,
  getReportFilterMetaRepo,
  getReportRawExportDataRepo,
} from '../repositories/report.repository.js';

/**
 * Controller: Get aggregated reporting analytics
 */
export const getReportAnalytics = async (req, res) => {
  try {
    const { period, sales_rep_id, status, category_id } = req.query;

    const data = await getReportAnalyticsRepo({
      period: period || 'this_month',
      salesRepId: sales_rep_id || null,
      approvalStatus: status || null,
      categoryId: category_id || null,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in getReportAnalytics controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics data',
      error: error.message,
    });
  }
};

/**
 * Controller: Get dropdown filter metadata (reps, categories)
 */
export const getReportFilterMeta = async (req, res) => {
  try {
    const meta = await getReportFilterMetaRepo();
    return res.status(200).json({
      success: true,
      data: meta,
    });
  } catch (error) {
    console.error('Error in getReportFilterMeta controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve filter metadata',
      error: error.message,
    });
  }
};

/**
 * Controller: Export dataset as CSV format
 */
export const exportReportCSV = async (req, res) => {
  try {
    const { period, sales_rep_id, status } = req.query;

    const rows = await getReportRawExportDataRepo({
      period: period || 'this_month',
      salesRepId: sales_rep_id || null,
      approvalStatus: status || null,
    });

    const headers = [
      'Quotation Number',
      'Customer',
      'Sales Rep',
      'Status',
      'Subtotal ($)',
      'Discount ($)',
      'Tax ($)',
      'Grand Total ($)',
      'Risk Score',
      'Risk Level',
      'Date Created',
      'Last Updated',
    ];

    const csvRows = [headers.join(',')];

    rows.forEach((r) => {
      const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
      csvRows.push([
        escape(r.quotation_number),
        escape(r.customer_name),
        escape(r.sales_rep_name || 'N/A'),
        escape(r.status),
        escape(r.subtotal),
        escape(r.discount_total),
        escape(r.tax_total),
        escape(r.grand_total),
        escape(r.blended_risk_score),
        escape(r.risk_level),
        escape(r.date_created),
        escape(r.last_updated),
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="DealFlow360_Report_${period || 'month'}_${timestamp}.csv"`);

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in exportReportCSV controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV report',
      error: error.message,
    });
  }
};
