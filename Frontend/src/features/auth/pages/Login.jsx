import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, forgotPassword, resetPassword, loading, error, isAuthenticated, resetError } = useAuth();

  // Mode: 'login' | 'forgot_password_step1' | 'forgot_password_step2'
  const [viewMode, setViewMode] = useState('login');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    new_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    return () => {
      resetError();
      setLocalMessage({ type: '', text: '' });
    };
  }, [resetError, viewMode]);

  const handleChange = (e) => {
    if (error) resetError();
    if (localMessage.text) setLocalMessage({ type: '', text: '' });
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleResetChange = (e) => {
    if (error) resetError();
    if (localMessage.text) setLocalMessage({ type: '', text: '' });
    setResetData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    const result = await login({
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  };

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!resetData.email) return;

    setActionLoading(true);
    setLocalMessage({ type: '', text: '' });

    const result = await forgotPassword(resetData.email);
    setActionLoading(false);

    if (result.success) {
      setLocalMessage({
        type: 'success',
        text: 'Verification code sent to your email. Please check your inbox.',
      });
      setViewMode('forgot_password_step2');
    } else {
      setLocalMessage({
        type: 'error',
        text: result.error || 'Failed to send OTP. Please verify your email.',
      });
    }
  };

  // Step 2: Verify OTP & set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetData.email || !resetData.otp || !resetData.new_password) return;

    setActionLoading(true);
    setLocalMessage({ type: '', text: '' });

    const result = await resetPassword({
      email: resetData.email,
      otp: resetData.otp,
      new_password: resetData.new_password,
    });
    setActionLoading(false);

    if (result.success) {
      setLocalMessage({
        type: 'success',
        text: 'Password reset successfully! You can now sign in with your new password.',
      });
      setFormData((prev) => ({ ...prev, email: resetData.email, password: '' }));
      setTimeout(() => {
        setViewMode('login');
      }, 1500);
    } else {
      setLocalMessage({
        type: 'error',
        text: result.error || 'Failed to reset password. Please check your OTP.',
      });
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
  };

  return (
    <div className="df-auth-container">
      <div className="df-auth-card">
        {/* ===================== 1. LOGIN VIEW ===================== */}
        {viewMode === 'login' && (
          <>
            {/* Header */}
            <div className="df-auth-card__header">
              <div className="brand-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                DealFlow360 Enterprise
              </div>
              <h1>Welcome Back</h1>
              <p>Sign in to your sales operations and deal governance portal</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="df-auth-card__alert df-auth-card__alert--error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Alert */}
            {localMessage.type === 'success' && (
              <div className="df-auth-card__alert df-auth-card__alert--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{localMessage.text}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="df-auth-card__form" onSubmit={handleSubmitLogin}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
              </div>

              <div className="form-group">
                <div className="df-auth-label-row">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetData((prev) => ({ ...prev, email: formData.email }));
                      setViewMode('forgot_password_step1');
                    }}
                    className="df-auth-link-btn"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="input-wrapper">

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
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
                    title={showPassword ? 'Hide password' : 'Show password'}
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

              <button type="submit" className="df-auth-card__submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="df-auth-card__divider">
              <span>or continue with</span>
            </div>

            {/* Google OAuth Button */}
            <button type="button" className="df-auth-card__oauth-btn" onClick={handleGoogleAuth}>
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
              <span>Sign in with Google</span>
            </button>

            {/* Register Navigation */}
            <div className="df-auth-card__footer">
              Don't have an account?
              <Link to="/register">Create an account</Link>
            </div>
          </>
        )}

        {/* ===================== 2. FORGOT PASSWORD STEP 1: REQUEST OTP ===================== */}
        {viewMode === 'forgot_password_step1' && (
          <>
            <div className="df-auth-card__header">
              <div className="brand-badge brand-badge--danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password Recovery
              </div>
              <h1>Reset Password</h1>
              <p>Enter your registered email address to receive a secure 6-digit OTP code.</p>
            </div>

            {localMessage.text && (
              <div className={`df-auth-card__alert df-auth-card__alert--${localMessage.type}`}>
                <span>{localMessage.text}</span>
              </div>
            )}

            <form className="df-auth-card__form" onSubmit={handleRequestOtp}>
              <div className="form-group">
                <label htmlFor="reset_email">Registered Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="reset_email"
                    type="email"
                    name="email"
                    required
                    placeholder="name@company.com"
                    value={resetData.email}
                    onChange={handleResetChange}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
              </div>

              <button type="submit" className="df-auth-card__submit-btn" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <div className="spinner" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>
            </form>

            <div className="df-auth-card__footer">
              Remember your password?
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="df-auth-link-btn"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* ===================== 3. FORGOT PASSWORD STEP 2: VERIFY OTP & RESET ===================== */}
        {viewMode === 'forgot_password_step2' && (
          <>
            <div className="df-auth-card__header">
              <div className="brand-badge brand-badge--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Enter Security Code
              </div>
              <h1>Set New Password</h1>
              <p>Enter the 6-digit OTP sent to <strong>{resetData.email}</strong> and your new password.</p>
            </div>

            {localMessage.text && (
              <div className={`df-auth-card__alert df-auth-card__alert--${localMessage.type}`}>
                <span>{localMessage.text}</span>
              </div>
            )}

            <form className="df-auth-card__form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="otp">6-Digit Verification Code</label>
                <div className="input-wrapper">
                  <input
                    id="otp"
                    type="text"
                    name="otp"
                    required
                    maxLength={6}
                    placeholder="123456"
                    className="df-auth-otp-input"
                    value={resetData.otp}
                    onChange={handleResetChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <div className="input-wrapper">
                  <input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    name="new_password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={resetData.new_password}
                    onChange={handleResetChange}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowNewPassword((prev) => !prev)}
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
              </div>

              <button type="submit" className="df-auth-card__submit-btn" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <div className="spinner" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>

            <div className="df-auth-card__footer">
              Didn't receive code?
              <button
                type="button"
                onClick={handleRequestOtp}
                className="df-auth-link-btn"
              >
                Resend OTP
              </button>
              <span className="df-auth-dot">•</span>
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="df-auth-link-btn"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
