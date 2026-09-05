import React, { useState } from 'react';

function SalesTrendChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="df-reports__chart-box df-reports__chart-box--col-8">
        <div className="df-reports__chart-box-header">
          <div>
            <h3 className="df-reports__chart-box-title">Sales & Pipeline Revenue Trend</h3>
            <p className="df-reports__chart-box-subtitle">Pipeline created vs Confirmed revenue over time</p>
          </div>
        </div>
        <div className="df-reports__loading-skeleton">
          <p>No sales timeline data available for the selected period.</p>
        </div>
      </div>
    );
  }

  // SVG Dimension Metrics
  const width = 680;
  const height = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 55 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value for Y axis scaling
  const maxVal = Math.max(
    ...data.map((d) => Math.max(parseFloat(d.pipeline_value || 0), parseFloat(d.confirmed_value || 0))),
    1000
  );

  const getX = (index) => padding.left + (index / Math.max(1, data.length - 1)) * chartWidth;
  const getY = (val) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  // Build SVG Paths for Pipeline (Area & Line)
  const pipelinePoints = data.map((d, i) => `${getX(i)},${getY(parseFloat(d.pipeline_value || 0))}`);
  const pipelineLinePath = `M ${pipelinePoints.join(' L ')}`;
  const pipelineAreaPath = `M ${getX(0)},${padding.top + chartHeight} L ${pipelinePoints.join(' L ')} L ${getX(data.length - 1)},${padding.top + chartHeight} Z`;

  // Build SVG Paths for Confirmed (Area & Line)
  const confirmedPoints = data.map((d, i) => `${getX(i)},${getY(parseFloat(d.confirmed_value || 0))}`);
  const confirmedLinePath = `M ${confirmedPoints.join(' L ')}`;
  const confirmedAreaPath = `M ${getX(0)},${padding.top + chartHeight} L ${confirmedPoints.join(' L ')} L ${getX(data.length - 1)},${padding.top + chartHeight} Z`;

  // Format currency
  const formatCur = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
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

        <div className="df-reports__chart-box-legend">
          <div className="df-reports__chart-box-legend-item">
            <span className="df-reports__chart-box-legend-dot df-reports__chart-box-legend-dot--pipeline" />
            <span>Proposed Pipeline</span>
          </div>
          <div className="df-reports__chart-box-legend-item">
            <span className="df-reports__chart-box-legend-dot df-reports__chart-box-legend-dot--confirmed" />
            <span>Confirmed Revenue</span>
          </div>
        </div>
      </div>

      <div className="df-reports__svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pipelineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="confirmedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * (1 - ratio);
            const val = maxVal * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  className="chart-grid-line"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-text"
                >
                  {formatCur(val)}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={pipelineAreaPath} className="chart-area-pipeline" />
          <path d={confirmedAreaPath} className="chart-area-confirmed" />

          {/* Lines */}
          <path d={pipelineLinePath} className="chart-line-pipeline" />
          <path d={confirmedLinePath} className="chart-line-confirmed" />

          {/* X Axis Date Labels */}
          {data.map((d, i) => {
            // Show every nth label to avoid overlap if many points
            const step = Math.ceil(data.length / 7);
            if (i % step !== 0 && i !== data.length - 1) return null;

            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={height - 8}
                textAnchor="middle"
                className="chart-axis-text"
              >
                {d.label}
              </text>
            );
          })}

          {/* Interactive Data Hover Circles */}
          {data.map((d, i) => {
            const x = getX(i);
            const yPipeline = getY(parseFloat(d.pipeline_value || 0));
            const yConfirmed = getY(parseFloat(d.confirmed_value || 0));

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={yPipeline}
                  r="3.5"
                  fill="#6366f1"
                  stroke="#0b0f17"
                  strokeWidth="1.5"
                  className="chart-data-point"
                  onMouseEnter={() => setHoveredPoint({ ...d, type: 'Pipeline', val: d.pipeline_value, x, y: yPipeline })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                <circle
                  cx={x}
                  cy={yConfirmed}
                  r="3.5"
                  fill="#10b981"
                  stroke="#0b0f17"
                  strokeWidth="1.5"
                  className="chart-data-point"
                  onMouseEnter={() => setHoveredPoint({ ...d, type: 'Confirmed', val: d.confirmed_value, x, y: yConfirmed })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Active Tooltip Box */}
          {hoveredPoint && (
            <g transform={`translate(${Math.min(width - 120, Math.max(10, hoveredPoint.x - 50))}, ${Math.max(10, hoveredPoint.y - 45)})`}>
              <rect
                width="110"
                height="36"
                rx="6"
                fill="#1e293b"
                stroke="rgba(255,255,255,0.15)"
              />
              <text x="55" y="15" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">
                {hoveredPoint.label}
              </text>
              <text x="55" y="29" textAnchor="middle" fill={hoveredPoint.type === 'Confirmed' ? '#34d399' : '#818cf8'} fontSize="11" fontWeight="700">
                {hoveredPoint.type}: ${Number(hoveredPoint.val).toLocaleString()}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default React.memo(SalesTrendChart);
