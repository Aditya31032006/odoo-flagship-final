import React from 'react';
import QuotationCard from './QuotationCard.jsx';

const COLUMNS = [
  { id: 'draft', label: 'Draft', color: '#94a3b8' },
  { id: 'pending_approval', label: 'Pending Approval', color: '#f59e0b' },
  { id: 'approved', label: 'Approved', color: '#38bdf8' },
  { id: 'negotiating', label: 'Negotiation', color: '#c084fc' },
  { id: 'confirmed', label: 'Confirmed', color: '#34d399' },
];

function formatCurrency(amount) {
  if (amount == null) return '$0';
  return `$${Number(amount).toLocaleString()}`;
}

export const QuotationKanban = ({
  kanbanData = {},
  summary = {},
  onSelectQuotation
}) => {
  // If no data exists from backend yet, use the seed wireframe records from mockup
  const fallbackData = {
    draft: [
      { id: 'd-1', quotation_number: 'QT-2026-001', company_name: 'Acme Corp', grand_total: 12400, sales_rep_name: 'Alex Rivera', risk_level: 'low' },
      { id: 'd-2', quotation_number: 'QT-2026-002', company_name: 'Delta LLC', grand_total: 3200, sales_rep_name: 'Sarah Chen', risk_level: 'low' },
    ],
    pending_approval: [
      { id: 'd-3', quotation_number: 'QT-2026-003', company_name: 'Beta Industries', grand_total: 28900, sales_rep_name: 'Alex Rivera', risk_level: 'high' },
    ],
    approved: [
      { id: 'd-4', quotation_number: 'QT-2026-004', company_name: 'Nova Retail', grand_total: 9750, sales_rep_name: 'David Kim', risk_level: 'low' },
    ],
    negotiating: [
      { id: 'd-5', quotation_number: 'QT-2026-005', company_name: 'Zenith Co', grand_total: 15300, sales_rep_name: 'Sarah Chen', risk_level: 'medium', counter_discount_percentage: 12 },
    ],
    confirmed: [
      { id: 'd-6', quotation_number: 'QT-2026-006', company_name: 'Orion Ltd', grand_total: 41000, sales_rep_name: 'Alex Rivera', risk_level: 'low' },
    ],
  };

  const hasAnyData = Object.values(kanbanData).some((list) => Array.isArray(list) && list.length > 0);
  const activeData = hasAnyData ? kanbanData : fallbackData;

  return (
    <div className="df-kanban-board">
      {COLUMNS.map((col) => {
        const cards = activeData[col.id] || [];
        const colTotal = summary[col.id]?.totalAmount ?? cards.reduce((sum, item) => sum + Number(item.grand_total || 0), 0);

        return (
          <div key={col.id} className="df-kanban-column">
            <div className="df-kanban-column__header">
              <h3>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: col.color,
                    display: 'inline-block',
                  }}
                />
                {col.label}
                <span className="df-kanban-column__badge">{cards.length}</span>
              </h3>
              <span className="df-kanban-column__total">{formatCurrency(colTotal)}</span>
            </div>

            <div className="df-kanban-column__cards-container">
              {cards.length > 0 ? (
                cards.map((quote) => (
                  <QuotationCard
                    key={quote.id || quote.quotation_number}
                    quotation={quote}
                    onClick={onSelectQuotation}
                  />
                ))
              ) : (
                <div className="df-kanban-column__empty-state">
                  No deals in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuotationKanban;
