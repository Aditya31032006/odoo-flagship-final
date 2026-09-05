import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function SalesTrendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="df-reports__chart-box df-reports__chart-box--col-8">
        <div className="df-reports__chart-box-header">
          <div>
            <h3 className="df-reports__chart-box-title">Sales & Pipeline Revenue Trend</h3>
            <p className="df-reports__chart-box-subtitle">Pipeline created vs Confirmed revenue velocity</p>
          </div>
        </div>
        <div className="df-reports__loading-skeleton">
          <p>No sales timeline data available for the selected period.</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: 'Proposed Pipeline',
        data: data.map((d) => parseFloat(d.pipeline_value || 0)),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Confirmed Revenue',
        data: data.map((d) => parseFloat(d.confirmed_value || 0)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#cbd5e1',
          boxWidth: 12,
          boxHeight: 12,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: $${Number(context.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 11,
          },
          callback: (val) => {
            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
          },
        },
      },
    },
  };

  return (
    <div className="df-reports__chart-box df-reports__chart-box--col-8">
      <div className="df-reports__chart-box-header">
        <div>
          <h3 className="df-reports__chart-box-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Sales & Pipeline Revenue Trend
          </h3>
          <p className="df-reports__chart-box-subtitle">Pipeline created vs Confirmed revenue velocity</p>
        </div>
      </div>

      <div className="df-reports__chart-canvas-wrap">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

export default React.memo(SalesTrendChart);
