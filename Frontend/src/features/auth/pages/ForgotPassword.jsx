import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, isAuthenticated, resetError } = useAuth();

  // Step 1: 'request_otp' | Step 2: 'verify_reset'
  const [step, setStep] = useState('request_otp');
  const [savedEmail, setSavedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      resetError();
      setLocalMessage({ type: '', text: '' });
    };
  }, [resetError, step]);

  // React Hook Form for Step 1
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors },
    getValues: getRequestValues
  } = useForm({
    defaultValues: { email: '' }
  });

  // React Hook Form for Step 2
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    reset: resetFormReset
  } = useForm({
    defaultValues: { otp: '', new_password: '' }
  });

  // Step 1: Send OTP to email
  const onRequestOtp = async (data) => {
    setActionLoading(true);
    setLocalMessage({ type: '', text: '' });
    setSavedEmail(data.email);

    const result = await forgotPassword(data.email);
    setActionLoading(false);

    if (result.success) {
      setLocalMessage({
        type: 'success',
        text: 'Verification code sent to your email. Please check your inbox.',
      });
      setStep('verify_reset');
    } else {
      setLocalMessage({
        type: 'error',
        text: result.error || 'Failed to send OTP. Please verify your email.',
      });
    }
  };

  // Step 2: Verify OTP & set new password
  const onResetPassword = async (data) => {
    const emailToUse = savedEmail || getRequestValues('email');
    if (!emailToUse) return;

    setActionLoading(true);
    setLocalMessage({ type: '', text: '' });

    const result = await resetPassword({
      email: emailToUse,
      otp: data.otp,
      new_password: data.new_password,
    });
    setActionLoading(false);

    if (result.success) {
      setLocalMessage({
        type: 'success',
        text: 'Password reset successfully! Redirecting to sign in...',
      });
      resetFormReset();
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } else {
      setLocalMessage({
        type: 'error',
        text: result.error || 'Failed to reset password. Please check your OTP.',
      });
    }
  };

  return (
    <div className="df-auth-container">
      <div className="df-auth-card">
        {/* ===================== STEP 1: REQUEST OTP ===================== */}
        {step === 'request_otp' && (
          <>
            <div className="df-auth-card__header">
              <div className="brand-badge brand-badge--recovery">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password Recovery
              </div>
              <h1>Reset Password</h1>
              <p>Enter your registered work email to receive a secure 6-digit OTP code.</p>
            </div>

            {localMessage.text && (
              <div className={`df-auth-card__alert df-auth-card__alert--${localMessage.type}`}>
                {localMessage.type === 'error' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                <span>{localMessage.text}</span>
              </div>
            )}

            <form className="df-auth-card__form" onSubmit={handleSubmitRequest(onRequestOtp)} noValidate>
              <div className="form-group">
                <label htmlFor="reset_email">Registered Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="reset_email"
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    {...registerRequest('email', {
                      required: 'Email is required to reset password',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                  />
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                {requestErrors.email && (
                  <span className="field-error">{requestErrors.email.message}</span>
                )}
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
              <Link to="/login">Back to Sign In</Link>
            </div>
          </>
        )}

        {/* ===================== STEP 2: VERIFY OTP & RESET ===================== */}
        {step === 'verify_reset' && (
          <>
            <div className="df-auth-card__header">
              <div className="brand-badge brand-badge--success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Security Verification
              </div>
              <h1>Set New Password</h1>
              <p>Enter the 6-digit OTP code sent to <strong>{savedEmail}</strong> and your new password.</p>
            </div>

            {localMessage.text && (
              <div className={`df-auth-card__alert df-auth-card__alert--${localMessage.type}`}>
                {localMessage.type === 'error' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                <span>{localMessage.text}</span>
              </div>
            )}

            <form className="df-auth-card__form" onSubmit={handleSubmitReset(onResetPassword)} noValidate>
              <div className="form-group">
                <label htmlFor="otp">6-Digit Verification Code</label>
                <div className="input-wrapper">
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="input-otp"
                    {...registerReset('otp', {
                      required: '6-digit OTP is required',
                      minLength: { value: 6, message: 'OTP must be 6 digits' },
                      maxLength: { value: 6, message: 'OTP must be 6 digits' },
                      pattern: { value: /^[0-9]+$/, message: 'OTP must be numeric' }
                    })}
                  />
                </div>
                {resetErrors.otp && (
                  <span className="field-error">{resetErrors.otp.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <div className="input-wrapper">
                  <input
                    id="new_password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    {...registerReset('new_password', {
                      required: 'New password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters long'
                      }
                    })}
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
                {resetErrors.new_password && (
                  <span className="field-error">{resetErrors.new_password.message}</span>
                )}
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
                onClick={() => onRequestOtp({ email: savedEmail })}
              >
                Resend OTP
              </button>
              <span className="footer-dot">•</span>
              <Link to="/login">Back to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
