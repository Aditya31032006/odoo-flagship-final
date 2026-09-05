import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Register() {
  const navigate = useNavigate();
  const { register, getCompanies, loading, error, isAuthenticated, resetError } = useAuth();

  // 2 Registration Modes: 'company' | 'employee'
  const [registerType, setRegisterType] = useState('company');
  const [companiesList, setCompaniesList] = useState([]);
  const [localError, setLocalError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    // Company Mode fields:
    company_name: '',
    gst_number: '',
    billing_address: '',
    // Employee Mode fields:
    company_id: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  // Fetch registered companies on mount
  useEffect(() => {
    async function loadCompanies() {
      const list = await getCompanies();
      setCompaniesList(list);
      if (list.length > 0 && !formData.company_id) {
        setFormData((prev) => ({ ...prev, company_id: list[0].id.toString() }));
      }
    }
    loadCompanies();
  }, [getCompanies]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      resetError();
      setLocalError('');
    };
  }, [resetError, registerType]);

  const handleChange = (e) => {
    if (error) resetError();
    if (localError) setLocalError('');
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleTypeSwitch = (type) => {
    setRegisterType(type);
    if (error) resetError();
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    let payload = {
      register_type: registerType,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      mobile: formData.mobile || undefined,
    };

    if (registerType === 'company') {
      if (!formData.company_name.trim()) {
        setLocalError('Company Name is required.');
        return;
      }
      payload = {
        ...payload,
        company_name: formData.company_name,
        gst_number: formData.gst_number || undefined,
        billing_address: formData.billing_address || undefined,
      };
    } else {
      if (!formData.company_id) {
        setLocalError('Company ID is mandatory.');
        return;
      }
      payload = {
        ...payload,
        company_id: Number(formData.company_id),
      };
    }

    const result = await register(payload);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleGoogleAuth = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    if (registerType === 'company') {
      if (!formData.company_name || !formData.company_name.trim()) {
        setLocalError('Please fill in your Company Name before signing up with Google.');
        return;
      }

      const statePayload = {
        register_type: 'company',
        company_name: formData.company_name.trim(),
        gst_number: formData.gst_number?.trim() || null,
        billing_address: formData.billing_address?.trim() || null,
        mobile: formData.mobile?.trim() || null,
      };

      const base64State = btoa(JSON.stringify(statePayload));
      window.location.href = `${apiBase}/auth/google?state=${encodeURIComponent(base64State)}`;
    } else {
      if (!formData.company_id) {
        setLocalError('Please select or enter your Company ID before signing up with Google.');
        return;
      }

      const statePayload = {
        register_type: 'employee',
        company_id: Number(formData.company_id),
        mobile: formData.mobile?.trim() || null,
      };

      const base64State = btoa(JSON.stringify(statePayload));
      window.location.href = `${apiBase}/auth/google?state=${encodeURIComponent(base64State)}`;
    }
  };

  const activeError = error || localError;

  return (
    <div className="df-auth-container">
      <div className="df-auth-card df-auth-card--wide">
        {/* Header */}
        <div className="df-auth-card__header">
          <div className="brand-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            DealFlow360 Registration
          </div>
          <h1>{registerType === 'company' ? 'Register Your Company' : 'Join Your Company'}</h1>
          <p>
            {registerType === 'company'
              ? 'Create a new B2B customer organization with a primary administrator account'
              : 'Register as an employee under an existing customer organization using their Company ID'}
          </p>
        </div>

        {/* 2-Option Segmented Switcher */}
        <div className="df-auth-card__role-selector">
          <label>Registration Type:</label>
          <div className="role-grid">
            <button
              type="button"
              className={`role-chip ${registerType === 'company' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('company')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>1. Register as Company</span>
            </button>
            <button
              type="button"
              className={`role-chip ${registerType === 'employee' ? 'active' : ''}`}
              onClick={() => handleTypeSwitch('employee')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>2. Employee Under Company</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="df-auth-card__alert df-auth-card__alert--error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form className="df-auth-card__form" onSubmit={handleSubmit}>
          {/* OPTION 1: Company Fields */}
          {registerType === 'company' && (
            <div className="df-auth-card__sub-section">
              <div className="sub-section-title">
                🏢 Company Details (Required for Google signup too)
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company_name">Company Name *</label>
                  <div className="input-wrapper">
                    <input
                      id="company_name"
                      type="text"
                      name="company_name"
                      required
                      placeholder="Acme Industrial Corp."
                      value={formData.company_name}
                      onChange={handleChange}
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="gst_number">GST Number (Optional)</label>
                  <div className="input-wrapper">
                    <input
                      id="gst_number"
                      type="text"
                      name="gst_number"
                      placeholder="27AABCU9603R1ZM"
                      value={formData.gst_number}
                      onChange={handleChange}
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="billing_address">Billing Address (Optional)</label>
                <div className="input-wrapper">
                  <input
                    id="billing_address"
                    type="text"
                    name="billing_address"

                    placeholder="Floor 4, Cyber City, Bangalore"
                    value={formData.billing_address}
                    onChange={handleChange}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* OPTION 2: Employee Under Company (Requires Company ID) */}
          {registerType === 'employee' && (
            <div className="df-auth-card__sub-section">
              <div className="sub-section-title">
                🏢 Parent Company Identification (Required for Google signup too)
              </div>
              <div className="form-group">
                <label htmlFor="company_id">Select Company or Enter Company ID *</label>
                {companiesList.length > 0 ? (
                  <div className="input-wrapper">
                    <select
                      id="company_id"
                      name="company_id"
                      required
                      value={formData.company_id}
                      onChange={handleChange}
                    >
                      {companiesList.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.company_name} (ID: #{comp.id}) {comp.gst_number ? `- GST: ${comp.gst_number}` : ''}
                        </option>
                      ))}
                    </select>
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                ) : (
                  <div className="input-wrapper">
                    <input
                      id="company_id"
                      type="number"
                      name="company_id"
                      required
                      placeholder="Enter Company ID (e.g. 1)"
                      value={formData.company_id}
                      onChange={handleChange}
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                )}
                <span className="helper-text">
                  Ask your company administrator for your organization ID if not listed.
                </span>
              </div>
            </div>
          )}

          {/* User Account Credentials (for Password Registration) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">{registerType === 'company' ? 'Primary Contact Name *' : 'Full Name *'}</label>
              <div className="input-wrapper">
                <input
                  id="name"
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Work Email *</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile Number (Optional)</label>
              <div className="input-wrapper">
                <input
                  id="mobile"
                  type="tel"
                  name="mobile"
                  placeholder="+91 98765 43210"
                  value={formData.mobile}
                  onChange={handleChange}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
            </div>
          </div>

          <button type="submit" className="df-auth-card__submit-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner" />
                <span>{registerType === 'company' ? 'Creating Company Profile...' : 'Joining Company...'}</span>
              </>
            ) : (
              <span>{registerType === 'company' ? 'Register Company & Account' : 'Complete Employee Registration'}</span>
            )}
          </button>
        </form>

        <div className="df-auth-card__divider">
          <span>or continue with Google</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          className="df-auth-card__oauth-btn"
          onClick={handleGoogleAuth}
          title={
            registerType === 'company'
              ? 'Sign up with Google using the Company Details filled above'
              : 'Sign up with Google and link to the selected Company ID'
          }
        >
          <svg viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>
            {registerType === 'company'
              ? 'Sign up Company with Google'
              : 'Sign up as Employee with Google'}
          </span>
        </button>

        {/* Login Navigation */}
        <div className="df-auth-card__footer">
          Already have an account?
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
