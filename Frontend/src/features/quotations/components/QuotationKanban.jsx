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

  return (
    <div className="df-kanban-board">
      {COLUMNS.map((col) => {
        const cards = kanbanData[col.id] || [];
        const colTotal = summary[col.id]?.totalAmount ?? cards.reduce((sum, item) => sum + Number(item.grand_total || 0), 0);

        return (
          <div key={col.id} className="df-kanban-column">
            <div className="df-kanban-column__header">
              <h3>
                <span className={`df-kanban-column__dot df-kanban-column__dot--${col.id}`} />
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
