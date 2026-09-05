import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import '../styles/profile.scss';

// Format initials helper
function getInitials(name) {
  if (!name) return 'DF';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Format role label
function formatRole(role) {
  const roleMap = {
    sales_rep: 'Sales Representative',
    sales_manager: 'Sales Manager',
    finance: 'Finance Controller',
    operations: 'Operations Lead',
    admin: 'System Administrator',
    customer: 'Customer Contact',
  };
  return roleMap[role] || role || 'User';
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, getProfile, updateProfile, changePassword, forgotPassword, resetPassword, logout } = useAuth();

  const [fullProfile, setFullProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileAlert, setProfileAlert] = useState({ type: '', text: '' });
  const [passwordAlert, setPasswordAlert] = useState({ type: '', text: '' });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Forgot Password / OTP Flow State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpAlert, setOtpAlert] = useState({ type: '', text: '' });
  const [showOtpPassword, setShowOtpPassword] = useState(false);

  // 1. React Hook Form for Profile Info
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: '',
      mobile: '',
      company_name: '',
      gst_number: '',
      billing_address: '',
      shipping_address: '',
    },
  });

  // 2. React Hook Form for Standard Security / Password Change
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    watch: watchPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // 3. React Hook Form for OTP Password Reset
  const {
    register: registerOtpReset,
    handleSubmit: handleSubmitOtpReset,
    reset: resetOtpForm,
    watch: watchOtpPassword,
    formState: { errors: otpErrors },
  } = useForm({
    defaultValues: {
      otp: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const newPasswordValue = watchPassword('new_password');
  const otpNewPasswordValue = watchOtpPassword('new_password');

  // Load Full Profile Data on mount
  useEffect(() => {
    async function loadData() {
      setProfileLoading(true);
      const res = await getProfile();
      if (res?.success && res.profile) {
        setFullProfile(res.profile);
        resetProfileForm({
          name: res.profile.name || '',
          mobile: res.profile.mobile || '',
          company_name: res.profile.company_name || '',
          gst_number: res.profile.gst_number || '',
          billing_address: res.profile.billing_address || '',
          shipping_address: res.profile.shipping_address || '',
        });
      }
      setProfileLoading(false);
    }
    loadData();
  }, [getProfile, resetProfileForm]);

  // Submit Profile Updates
  const onSaveProfile = async (data) => {
    setProfileSaving(true);
    setProfileAlert({ type: '', text: '' });

    const res = await updateProfile(data);
    setProfileSaving(false);

    if (res?.success) {
      setProfileAlert({ type: 'success', text: 'Profile details updated successfully!' });
      if (res.profile) {
        setFullProfile(res.profile);
      }
    } else {
      setProfileAlert({ type: 'error', text: res?.error || 'Failed to update profile.' });
    }
  };

  // Submit Password Change
  const onSavePassword = async (data) => {
    setPasswordSaving(true);
    setPasswordAlert({ type: '', text: '' });

    const res = await changePassword({
      current_password: data.current_password || '',
      new_password: data.new_password,
    });
    setPasswordSaving(false);

    if (res?.success) {
      setPasswordAlert({ type: 'success', text: res.message || 'Password updated successfully!' });
      resetPasswordForm();
      setFullProfile((prev) => (prev ? { ...prev, has_password: true } : prev));
    } else {
      setPasswordAlert({ type: 'error', text: res?.error || 'Failed to update password.' });
    }
  };

  // Request OTP for Forgot Password flow
  const handleRequestRecoveryOtp = async () => {
    const emailToUse = (fullProfile?.email || user?.email || '').trim();
    if (!emailToUse) {
      setOtpAlert({ type: 'error', text: 'No registered email found on account.' });
      return;
    }

    setOtpLoading(true);
    setOtpAlert({ type: '', text: '' });

    const res = await forgotPassword(emailToUse);
    setOtpLoading(false);

    if (res?.success) {
      setOtpStep('verify');
      setOtpAlert({
        type: 'success',
        text: `6-digit verification code sent to ${emailToUse}. Please check your inbox.`,
      });
    } else {
      setOtpAlert({
        type: 'error',
        text: res?.error || 'Failed to send verification code. Please try again.',
      });
    }
  };

  // Verify OTP & Reset Password
  const onVerifyAndResetPassword = async (data) => {
    const emailToUse = (fullProfile?.email || user?.email || '').trim();
    if (!emailToUse) {
      setOtpAlert({ type: 'error', text: 'No registered email found on account.' });
      return;
    }

    setOtpLoading(true);
    setOtpAlert({ type: '', text: '' });

    const res = await resetPassword({
      email: emailToUse,
      otp: data.otp,
      new_password: data.new_password,
    });
    setOtpLoading(false);

    if (res?.success) {
      setPasswordAlert({
        type: 'success',
        text: 'Password reset successfully via email verification!',
      });
      setIsForgotMode(false);
      setOtpStep('request');
      resetOtpForm();
      setFullProfile((prev) => (prev ? { ...prev, has_password: true } : prev));
    } else {
      setOtpAlert({
        type: 'error',
        text: res?.error || 'Failed to reset password. Please verify the code and try again.',
      });
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const activeProfile = fullProfile || user || {};
  const isPrimaryContact = Boolean(activeProfile.is_primary_contact);
  const hasCompany = Boolean(activeProfile.company_name || activeProfile.customer_id);
  const isCompanyOwner = Boolean(
    activeProfile.company_email &&
    activeProfile.email &&
    activeProfile.email.trim().toLowerCase() === activeProfile.company_email.trim().toLowerCase()
  );

  if (profileLoading && !fullProfile) {
    return (
      <div className="df-profile">
        <div className="df-profile__container">
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            Loading your profile information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-profile">
      <div className="df-profile__container">
        {/* Top Identity Hero Card */}
        <div className="df-profile__hero-card">
          <div className="df-profile__hero-identity">
            <div className={`df-profile__avatar ${activeProfile.role === 'customer' ? (activeProfile.ring_class || 'df-avatar--standard') : ''}`}>
              {getInitials(activeProfile.name)}
            </div>
            <div className="df-profile__hero-details">
              <h1>{activeProfile.name || 'User Profile'}</h1>
              <div className="meta-row">
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {activeProfile.email}
                </span>
                {activeProfile.created_at && (
                  <span className="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Joined {new Date(activeProfile.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="df-profile__hero-actions">
            <div className="df-profile__hero-badges">
              <span className="df-profile__badge df-profile__badge--role">
                🛡️ {formatRole(activeProfile.role)}
              </span>
              {activeProfile.role === 'customer' && (
                <span className={`df-profile__badge df-profile__badge--tier ${activeProfile.ring_class || 'df-avatar--standard'}`}>
                  {activeProfile.tier_name === 'Gold' && `🥇 Gold Tier (15% max, ${activeProfile.quarterly_paid_orders_count || 9}+ orders)`}
                  {activeProfile.tier_name === 'Silver' && `🥈 Silver Tier (10% max, ${activeProfile.quarterly_paid_orders_count || 6}+ orders)`}
                  {activeProfile.tier_name === 'Bronze' && `🥉 Bronze Tier (5% max, ${activeProfile.quarterly_paid_orders_count || 3}+ orders)`}
                  {(!activeProfile.tier_name || activeProfile.tier_name === 'Standard') && `⚪ Standard Member (0% max, ${activeProfile.quarterly_paid_orders_count || 0} orders)`}
                </span>
              )}
              {hasCompany && (
                <span className="df-profile__badge df-profile__badge--company">
                  🏢 {activeProfile.company_name || 'Associated Organization'}
                </span>
              )}
              {isCompanyOwner ? (
                <span className="df-profile__badge df-profile__badge--primary">
                  ⭐ Organization Owner
                </span>
              ) : isPrimaryContact ? (
                <span className="df-profile__badge df-profile__badge--primary">
                  ⭐ Primary Contact
                </span>
              ) : null}
              <span className="df-profile__badge df-profile__badge--active">
                ● Active Account
              </span>
            </div>

            <button
              type="button"
              className="df-profile__logout-btn"
              onClick={handleLogout}
              title="Sign Out of DealFlow360"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="df-profile__grid">
          {/* Column 1: Editable Personal & Company Profile */}
          <div className="df-profile__panel">
            <div className="df-profile__panel__header">
              <h2>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Personal & Account Details
              </h2>
              <span className="panel-subtitle">Edit your contact details below</span>
            </div>

            {profileAlert.text && (
              <div className={`df-profile__alert df-profile__alert--${profileAlert.type}`}>
                {profileAlert.type === 'success' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <span>{profileAlert.text}</span>
              </div>
            )}

            <form className="df-profile__form" onSubmit={handleSubmitProfile(onSaveProfile)} noValidate>
              {/* Editable Name */}
              <div className="form-group">
                <label htmlFor="name">
                  <span>Full Name *</span>
                  <span className="field-tag">Editable</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    placeholder="Your Full Name"
                    {...registerProfile('name', {
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                {profileErrors.name && (
                  <span className="field-error">{profileErrors.name.message}</span>
                )}
              </div>

              {/* Editable Mobile */}
              <div className="form-group">
                <label htmlFor="mobile">
                  <span>Mobile Number (10 Digits)</span>
                  <span className="field-tag">Editable</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    {...registerProfile('mobile', {
                      validate: (value) => {
                        if (!value || !value.trim()) return true;
                        const digits = value.replace(/\D/g, '');
                        if (digits.length !== 10) {
                          return 'Mobile number must be exactly 10 digits';
                        }
                        if (!/^[6-9]\d{9}$/.test(digits)) {
                          return 'Mobile number must start with 6, 7, 8, or 9';
                        }
                        return true;
                      },
                    })}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                {profileErrors.mobile && (
                  <span className="field-error">{profileErrors.mobile.message}</span>
                )}
              </div>

              {/* Readonly Protected Email & Role Row */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    <span>Email Address</span>
                    <span className="field-tag field-tag--lock">🔒 Read-only</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="email"
                      type="email"
                      value={activeProfile.email || ''}
                      readOnly
                      className="input-readonly"
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="role">
                    <span>System Role</span>
                    <span className="field-tag field-tag--lock">🔒 Fixed</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="role"
                      type="text"
                      value={formatRole(activeProfile.role)}
                      readOnly
                      className="input-readonly"
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Organization Section (if applicable) */}
              {hasCompany && (
                <>
                  <div style={{ margin: '0.5rem 0 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🏢 Organization & Company Profile
                    </span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="company_name">
                        <span>Company Name</span>
                        <span className={`field-tag ${!isCompanyOwner ? 'field-tag--lock' : ''}`}>
                          {isCompanyOwner ? 'Editable' : '🔒 Org Owner Only'}
                        </span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="company_name"
                          type="text"
                          readOnly={!isCompanyOwner}
                          className={!isCompanyOwner ? 'input-readonly' : ''}
                          {...registerProfile('company_name')}
                        />
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="gst_number">
                        <span>GST Number</span>
                        <span className={`field-tag ${!isCompanyOwner ? 'field-tag--lock' : ''}`}>
                          {isCompanyOwner ? 'Editable' : '🔒 Org Owner Only'}
                        </span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="gst_number"
                          type="text"
                          maxLength={15}
                          readOnly={!isCompanyOwner}
                          className={`input-uppercase ${!isCompanyOwner ? 'input-readonly' : ''}`}
                          {...registerProfile('gst_number', {
                            validate: (value) => {
                              if (!isCompanyOwner || !value || !value.trim()) return true;
                              const formatted = value.trim().toUpperCase();
                              const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
                              if (!gstRegex.test(formatted)) {
                                return 'Invalid GST format (15 characters, e.g. 27AABCU9603R1ZM)';
                              }
                              return true;
                            },
                          })}
                        />
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      {profileErrors.gst_number && (
                        <span className="field-error">{profileErrors.gst_number.message}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="billing_address">
                      <span>Billing Address</span>
                      <span className={`field-tag ${!isCompanyOwner ? 'field-tag--lock' : ''}`}>
                        {isCompanyOwner ? 'Editable' : '🔒 Org Owner Only'}
                      </span>
                    </label>
                    <div className="input-wrapper">
                      <textarea
                        id="billing_address"
                        rows={2}
                        readOnly={!isCompanyOwner}
                        className={!isCompanyOwner ? 'input-readonly' : ''}
                        placeholder="Organization billing address"
                        {...registerProfile('billing_address')}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="shipping_address">
                      <span>Shipping Address</span>
                      <span className={`field-tag ${!isCompanyOwner ? 'field-tag--lock' : ''}`}>
                        {isCompanyOwner ? 'Editable' : '🔒 Org Owner Only'}
                      </span>
                    </label>
                    <div className="input-wrapper">
                      <textarea
                        id="shipping_address"
                        rows={2}
                        readOnly={!isCompanyOwner}
                        className={!isCompanyOwner ? 'input-readonly' : ''}
                        placeholder="Organization shipping address"
                        {...registerProfile('shipping_address')}
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="df-profile__btn-primary" disabled={profileSaving}>
                {profileSaving ? (
                  <>
                    <div className="spinner" />
                    <span>Saving Profile Changes...</span>
                  </>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </form>
          </div>

          {/* Column 2: Security & Password Management */}
          <div className="df-profile__panel">
            <div className="df-profile__panel__header">
              <div className="df-profile__panel__header-info">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>
                    {isForgotMode
                      ? 'Password Recovery'
                      : activeProfile.has_password
                      ? 'Security & Password'
                      : 'Set Account Password'}
                  </span>
                </h2>
                <span className="panel-subtitle">
                  {isForgotMode
                    ? 'Verify your identity via 6-digit email OTP'
                    : activeProfile.has_password
                    ? 'Manage your credentials or reset via OTP'
                    : 'Create a new password for your account'}
                </span>
              </div>

              {activeProfile.has_password && (
                <div className="df-profile__mode-toggle">
                  <button
                    type="button"
                    className={`df-profile__mode-btn ${!isForgotMode ? 'active' : ''}`}
                    onClick={() => {
                      setIsForgotMode(false);
                      setOtpStep('request');
                      setOtpAlert({ type: '', text: '' });
                      setPasswordAlert({ type: '', text: '' });
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    className={`df-profile__mode-btn ${isForgotMode ? 'active' : ''}`}
                    onClick={() => {
                      setIsForgotMode(true);
                      setOtpStep('request');
                      setOtpAlert({ type: '', text: '' });
                      setPasswordAlert({ type: '', text: '' });
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>Forgot (OTP)</span>
                  </button>
                </div>
              )}
            </div>

            {passwordAlert.text && (
              <div className={`df-profile__alert df-profile__alert--${passwordAlert.type}`}>
                {passwordAlert.type === 'success' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <span>{passwordAlert.text}</span>
              </div>
            )}

            {!isForgotMode && !activeProfile.has_password && (
              <div className="df-profile__info-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  This account currently has no password set (e.g. Google Sign-In). Enter a new password below to enable email & password login.
                </span>
              </div>
            )}

            {/* ================= STANDARD PASSWORD FORM ================= */}
            {!isForgotMode && (
              <form className="df-profile__form" onSubmit={handleSubmitPassword(onSavePassword)} noValidate>
                {/* Current Password - Only required if user already has a password */}
                {activeProfile.has_password && (
                  <div className="form-group">
                    <label htmlFor="current_password">
                      <span>Current Password *</span>
                      <button
                        type="button"
                        className="df-profile__badge-link"
                        onClick={() => {
                          setIsForgotMode(true);
                          setOtpStep('request');
                          setOtpAlert({ type: '', text: '' });
                          setPasswordAlert({ type: '', text: '' });
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Forgot? Reset via OTP</span>
                      </button>
                    </label>
                    <div className="input-wrapper">
                      <input
                        id="current_password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter current password"
                        {...registerPassword('current_password', {
                          required: activeProfile.has_password ? 'Current password is required' : false,
                        })}
                      />
                      <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
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
                    {passwordErrors.current_password && (
                      <span className="field-error">{passwordErrors.current_password.message}</span>
                    )}
                  </div>
                )}

                {/* New Password */}
                <div className="form-group">
                  <label htmlFor="new_password">New Password *</label>
                  <div className="input-wrapper">
                    <input
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      {...registerPassword('new_password', {
                        required: 'New password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
                      })}
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
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
                  {passwordErrors.new_password && (
                    <span className="field-error">{passwordErrors.new_password.message}</span>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label htmlFor="confirm_password">Confirm New Password *</label>
                  <div className="input-wrapper">
                    <input
                      id="confirm_password"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-type new password"
                      {...registerPassword('confirm_password', {
                        required: 'Please confirm your new password',
                        validate: (value) =>
                          value === newPasswordValue || 'Passwords do not match',
                      })}
                    />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  {passwordErrors.confirm_password && (
                    <span className="field-error">{passwordErrors.confirm_password.message}</span>
                  )}
                </div>

                <button type="submit" className="df-profile__btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? (
                    <>
                      <div className="spinner" />
                      <span>{activeProfile.has_password ? 'Updating Password...' : 'Setting Password...'}</span>
                    </>
                  ) : (
                    <span>{activeProfile.has_password ? 'Update Password' : 'Set Account Password'}</span>
                  )}
                </button>
              </form>
            )}

            {/* ================= FORGOT PASSWORD / OTP FLOW ================= */}
            {isForgotMode && (
              <div className="df-profile__otp-section">
                <div className="otp-header">
                  <div className="otp-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Email OTP Verification</span>
                    <span className="step-pill">
                      {otpStep === 'request' ? 'Step 1 of 2' : 'Step 2 of 2'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="back-link"
                    onClick={() => {
                      setIsForgotMode(false);
                      setOtpStep('request');
                      setOtpAlert({ type: '', text: '' });
                    }}
                  >
                    ← Back to standard update
                  </button>
                </div>

                {otpAlert.text && (
                  <div className={`df-profile__alert df-profile__alert--${otpAlert.type}`}>
                    {otpAlert.type === 'success' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                    <span>{otpAlert.text}</span>
                  </div>
                )}

                {/* Step 1: Send OTP */}
                {otpStep === 'request' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p className="otp-desc">
                      A secure 6-digit one-time verification code will be sent to your verified registered email address:{' '}
                      <span className="email-chip">
                        ✉️ {activeProfile.email}
                      </span>
                    </p>
                    <div className="otp-actions-row">
                      <button
                        type="button"
                        className="df-profile__btn-primary"
                        onClick={handleRequestRecoveryOtp}
                        disabled={otpLoading}
                      >
                        {otpLoading ? (
                          <>
                            <div className="spinner" />
                            <span>Sending OTP Code...</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            <span>Send 6-Digit OTP to My Email</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="df-profile__btn-secondary"
                        onClick={() => setIsForgotMode(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Verify OTP & Enter New Password */}
                {otpStep === 'verify' && (
                  <form
                    className="df-profile__form"
                    onSubmit={handleSubmitOtpReset(onVerifyAndResetPassword)}
                    noValidate
                  >
                    <p className="otp-desc">
                      Enter the 6-digit code sent to <span className="email-chip">✉️ {activeProfile.email}</span> along with your new password.
                    </p>

                    {/* OTP Field */}
                    <div className="form-group">
                      <label htmlFor="otp">
                        <span>6-Digit Verification Code *</span>
                        <button
                          type="button"
                          className="resend-btn"
                          onClick={handleRequestRecoveryOtp}
                          disabled={otpLoading}
                        >
                          {otpLoading ? 'Sending...' : '🔄 Resend Code'}
                        </button>
                      </label>
                      <div className="input-wrapper">
                        <input
                          id="otp"
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          className="input-uppercase"
                          style={{ letterSpacing: '0.3em', fontWeight: 700, fontSize: '1.05rem', textAlign: 'center' }}
                          {...registerOtpReset('otp', {
                            required: '6-digit OTP is required',
                            minLength: { value: 6, message: 'OTP must be exactly 6 digits' },
                            maxLength: { value: 6, message: 'OTP must be exactly 6 digits' },
                            pattern: { value: /^[0-9]+$/, message: 'OTP must contain only numbers' },
                          })}
                        />
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      {otpErrors.otp && (
                        <span className="field-error">{otpErrors.otp.message}</span>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="form-group">
                      <label htmlFor="otp_new_password">New Password *</label>
                      <div className="input-wrapper">
                        <input
                          id="otp_new_password"
                          type={showOtpPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="At least 6 characters"
                          {...registerOtpReset('new_password', {
                            required: 'New password is required',
                            minLength: { value: 6, message: 'Password must be at least 6 characters' },
                          })}
                        />
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowOtpPassword((prev) => !prev)}
                          title={showOtpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showOtpPassword ? (
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
                      {otpErrors.new_password && (
                        <span className="field-error">{otpErrors.new_password.message}</span>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div className="form-group">
                      <label htmlFor="otp_confirm_password">Confirm New Password *</label>
                      <div className="input-wrapper">
                        <input
                          id="otp_confirm_password"
                          type={showOtpPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Re-type new password"
                          {...registerOtpReset('confirm_password', {
                            required: 'Please confirm your new password',
                            validate: (value) =>
                              value === otpNewPasswordValue || 'Passwords do not match',
                          })}
                        />
                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      {otpErrors.confirm_password && (
                        <span className="field-error">{otpErrors.confirm_password.message}</span>
                      )}
                    </div>

                    <div className="otp-actions-row" style={{ marginTop: '0.5rem' }}>
                      <button
                        type="submit"
                        className="df-profile__btn-primary"
                        disabled={otpLoading}
                      >
                        {otpLoading ? (
                          <>
                            <div className="spinner" />
                            <span>Verifying & Setting Password...</span>
                          </>
                        ) : (
                          <span>Verify OTP & Set New Password</span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="df-profile__btn-secondary"
                        onClick={() => {
                          setIsForgotMode(false);
                          setOtpStep('request');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
