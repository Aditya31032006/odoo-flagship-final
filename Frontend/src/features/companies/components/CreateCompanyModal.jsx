import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const MOBILE_REGEX = /^[6-9]\d{9}$/;

export function CreateCompanyModal({ isOpen, onClose, onSubmit, loading, error }) {
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      company_name: '',
      contact_name: '',
      email: '',
      mobile: '',
      gst_number: '',
      billing_address: '',
      shipping_address: '',
    },
  });

  const billingAddressValue = watch('billing_address');

  const handleSameAsBillingToggle = (e) => {
    const isChecked = e.target.checked;
    setSameAsBilling(isChecked);
    if (isChecked) {
      setValue('shipping_address', billingAddressValue || '', { shouldValidate: true });
    }
  };

  if (!isOpen) return null;

  const handleFormSubmit = async (data) => {
    const payload = {
      ...data,
      gst_number: data.gst_number ? data.gst_number.toUpperCase().trim() : '',
      email: data.email.toLowerCase().trim(),
      mobile: data.mobile.trim(),
      shipping_address: sameAsBilling ? (data.billing_address || '') : data.shipping_address,
    };
    const res = await onSubmit(payload);
    if (res?.success) {
      reset();
      setSameAsBilling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h2>🏢 Provision Client Company</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="modal-card__body">
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Core Identification (Common between Organization & Primary Account) */}
            <h3 className="form-section-title">1. Organization & Contact Person</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="company_name">Company Name *</label>
                <input
                  id="company_name"
                  type="text"
                  placeholder="e.g. Acme Corp Industries Ltd"
                  {...register('company_name', {
                    required: 'Company name is required',
                    minLength: { value: 2, message: 'Must be at least 2 characters' },
                    maxLength: { value: 150, message: 'Cannot exceed 150 characters' },
                  })}
                />
                {errors.company_name && (
                  <span className="error-text">{errors.company_name.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="contact_name">Primary Contact Name *</label>
                <input
                  id="contact_name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  {...register('contact_name', {
                    required: 'Primary contact name is required',
                    minLength: { value: 2, message: 'Must be at least 2 characters' },
                    maxLength: { value: 100, message: 'Cannot exceed 100 characters' },
                  })}
                />
                {errors.contact_name && (
                  <span className="error-text">{errors.contact_name.message}</span>
                )}
              </div>
            </div>

            {/* Email and Mobile */}
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="comp_email">Email Address (Login & Portal) *</label>
                <input
                  id="comp_email"
                  type="email"
                  placeholder="contact@acme.com"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address (e.g. user@company.com)',
                    },
                  })}
                />
                {errors.email && (
                  <span className="error-text">{errors.email.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="comp_mobile">Mobile Number (10 Digits) *</label>
                <input
                  id="comp_mobile"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  {...register('mobile', {
                    required: '10-digit mobile number is required',
                    pattern: {
                      value: MOBILE_REGEX,
                      message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9',
                    },
                  })}
                />
                {errors.mobile && (
                  <span className="error-text">{errors.mobile.message}</span>
                )}
              </div>
            </div>

            {/* GST Number */}
            <h3 className="form-section-title">2. Tax & Compliance Details</h3>
            <div className="form-group">
              <label htmlFor="gst_number">
                GST Number <span style={{ fontWeight: 400, color: '#6b7280' }}>(Optional - 15 Characters)</span>
              </label>
              <input
                id="gst_number"
                type="text"
                maxLength={15}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                placeholder="29ABCDE1234F1Z5"
                {...register('gst_number', {
                  validate: (val) => {
                    if (!val || !val.trim()) return true;
                    return (
                      GST_REGEX.test(val.trim()) ||
                      'Invalid Indian GST format. Expected: 2 digits (State) + 5 letters (PAN) + 4 digits + 1 letter + 1 digit + Z + 1 checksum (e.g. 29AAAAA0000A1Z5)'
                    );
                  },
                })}
              />
              {errors.gst_number && (
                <span className="error-text">{errors.gst_number.message}</span>
              )}
            </div>

            {/* Addresses */}
            <h3 className="form-section-title">3. Address Information</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="billing_address">Billing Address</label>
                <textarea
                  id="billing_address"
                  rows={2}
                  placeholder="Registered commercial billing address..."
                  {...register('billing_address', {
                    maxLength: { value: 500, message: 'Cannot exceed 500 characters' }
                  })}
                  onChange={(e) => {
                    if (sameAsBilling) {
                      setValue('shipping_address', e.target.value);
                    }
                  }}
                />
                {errors.billing_address && (
                  <span className="error-text">{errors.billing_address.message}</span>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="shipping_address">Shipping Address</label>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#0d9488', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={handleSameAsBillingToggle}
                      style={{ cursor: 'pointer' }}
                    />
                    Same as Billing
                  </label>
                </div>
                <textarea
                  id="shipping_address"
                  rows={2}
                  disabled={sameAsBilling}
                  placeholder={sameAsBilling ? 'Same as billing address' : 'Warehouse / site delivery address...'}
                  {...register('shipping_address', {
                    maxLength: { value: 500, message: 'Cannot exceed 500 characters' }
                  })}
                />
                {errors.shipping_address && (
                  <span className="error-text">{errors.shipping_address.message}</span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-card__footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Provisioning...' : 'Provision Company & Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCompanyModal;
