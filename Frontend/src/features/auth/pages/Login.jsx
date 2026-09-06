import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, isAuthenticated, resetError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form instance with single identifier field
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: { identifier: '', password: '' }
  });

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
    };
  }, [resetError]);

  // Submit Login
  const onLogin = async (data) => {
    if (error) resetError();
    const payload = {
      identifier: data.identifier.trim(),
      password: data.password,
    };

    const result = await login(payload);

    if (result.success) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
  };

  // Check URL query parameters for OAuth errors
  const queryParams = new URLSearchParams(location.search);
  const oauthErrorParam = queryParams.get('error');
  const [oauthErrorMessage, setOauthErrorMessage] = useState('');

  useEffect(() => {
    if (oauthErrorParam === 'account_not_found') {
      setOauthErrorMessage('Account not found. Your email is not registered in DealFlow360. Please contact your system administrator to provision your account.');
    } else if (oauthErrorParam) {
      setOauthErrorMessage(decodeURIComponent(oauthErrorParam));
    }
  }, [oauthErrorParam]);

  return (
    <div className="df-auth-container">
      <div className="df-auth-card">
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
          <h1>Enterprise Sign In</h1>
          <p>Sign in with your provisioned account credentials</p>
        </div>

        {/* OAuth Error Alert */}
        {oauthErrorMessage && (
          <div className="df-auth-card__alert df-auth-card__alert--error" style={{ marginBottom: '1.25rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{oauthErrorMessage}</span>
          </div>
        )}

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

        {/* Single Field Dynamic Login Form */}
        <form className="df-auth-card__form" onSubmit={handleSubmit(onLogin)} noValidate>
          <div className="form-group">
            <label htmlFor="identifier">Email or Mobile Number</label>
            <div className="input-wrapper">
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="name@company.com or 9876543210"
                {...register('identifier', {
                  required: 'Please enter your email or mobile number',
                  validate: (value) => {
                    const trimmed = value.trim();
                    if (!trimmed) return 'Please enter your email or mobile number';
                    const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed);
                    const isMobile = /^[6-9]\d{9}$/.test(trimmed);
                    if (!isEmail && !isMobile) {
                      return 'Enter a valid email address or 10-digit mobile number';
                    }
                    return true;
                  }
                })}
              />
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {errors.identifier && (
              <span className="field-error">{errors.identifier.message}</span>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
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
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
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
          <span>or sign in with</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          className="df-auth-card__oauth-btn"
          onClick={handleGoogleAuth}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="google-icon">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Enterprise Notice */}
        <div className="df-auth-card__footer" style={{ fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center' }}>
          🔒 Need portal access? Contact your DealFlow360 administrator to provision your company or staff account.
        </div>
      </div>
    </div>
  );
}