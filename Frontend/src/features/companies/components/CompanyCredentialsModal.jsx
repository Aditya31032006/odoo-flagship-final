import React, { useState } from 'react';

export function CompanyCredentialsModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const { company, tempPassword } = data;
  const user = company?.primary_user || {};

  const handleCopy = () => {
    const creds = `DealFlow360 Login Credentials:\nCompany: ${company.company_name}\nEmail: ${user.email}\nPassword: ${tempPassword}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-card__header" style={{ background: '#f0fdfa' }}>
          <h2 style={{ color: '#0f766e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎉</span> Company Provisioned!
          </h2>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-card__body">
          <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: 1.5 }}>
            <strong>{company.company_name}</strong> has been successfully registered. An invitation and onboarding email has been queued for <strong>{user.email}</strong>.
          </p>

          <div className="credentials-display">
            <div className="cred-item">
              <span className="cred-lbl">Organization:</span>
              <span className="cred-val" style={{ color: '#ffffff' }}>{company.company_name}</span>
            </div>
            <div className="cred-item">
              <span className="cred-lbl">Contact Person:</span>
              <span className="cred-val" style={{ color: '#ffffff' }}>{user.name}</span>
            </div>
            <div className="cred-item">
              <span className="cred-lbl">Login Email:</span>
              <span className="cred-val">{user.email}</span>
            </div>
            <div className="cred-item">
              <span className="cred-lbl">Temporary Password:</span>
              <span className="cred-val" style={{ fontSize: '1.05rem', color: '#2dd4bf' }}>
                {tempPassword}
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
            💡 You can copy these credentials to share directly with the client contact if necessary.
          </p>
        </div>

        <div className="modal-card__footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? '✅ Copied to Clipboard!' : '📋 Copy Credentials'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanyCredentialsModal;
