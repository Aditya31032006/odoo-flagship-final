import React from 'react';

export function CompanyTable({ companies, onToggleStatus, actionLoading }) {
  if (!companies || companies.length === 0) {
    return (
      <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#6b7280' }}>
        <p style={{ fontSize: '1rem', fontWeight: 500, margin: 0 }}>No client companies found.</p>
        <p style={{ fontSize: '0.875rem', margin: '0.35rem 0 0 0' }}>
          Click "Add Company" to provision a new client organization.
        </p>
      </div>
    );
  }

  return (
    <div className="df-company__table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Primary Contact</th>
            <th>Phone / Location</th>
            <th>Quotations</th>
            <th>Invoices</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id}>
              <td>
                <div className="company-cell">
                  <span className="company-cell__name">{c.company_name}</span>
                  {c.gst_number && <span className="company-cell__gst">GST: {c.gst_number}</span>}
                </div>
              </td>
              <td>
                <div className="contact-cell">
                  <span className="contact-cell__name">{c.primary_contact_name || '—'}</span>
                  <span className="contact-cell__email">{c.primary_contact_email || c.company_email || '—'}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8125rem' }}>
                  <span>{c.primary_contact_mobile || c.company_phone || '—'}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    {c.billing_address ? c.billing_address.slice(0, 25) + '...' : 'No address'}
                  </span>
                </div>
              </td>
              <td>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{c.quotation_count || 0}</span>
              </td>
              <td>
                <span style={{ fontWeight: 600, color: '#059669' }}>{c.invoice_count || 0}</span>
              </td>
              <td>
                <span
                  className={`status-badge ${
                    c.is_active ? 'status-badge--active' : 'status-badge--inactive'
                  }`}
                >
                  ● {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={actionLoading}
                  onClick={() => onToggleStatus(c.id, c.is_active)}
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CompanyTable;
