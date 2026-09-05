import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useForm } from 'react-hook-form';
import useAuth from '../hook/useAuth.js';
import '../styles/auth.scss';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, isAuthenticated, resetError } = useAuth();

  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'mobile'
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form instance
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
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
      password: data.password,
    };
    if (loginMethod === 'email') {
      payload.email = data.identifier;
    } else {
      payload.mobile = data.identifier;
    }

    const result = await login(payload);

    if (result.success) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`;
  };

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

        {/* Login Method Toggle */}
        <div className="df-auth-card__role-selector">
          <div className="role-grid">
            <button
              type="button"
              className={`role-chip ${loginMethod === 'email' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('email');
                setValue('identifier', '');
                clearErrors();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Email Address</span>
            </button>

            <button
              type="button"
              className={`role-chip ${loginMethod === 'mobile' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('mobile');
                setValue('identifier', '');
                clearErrors();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Mobile Number</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form className="df-auth-card__form" onSubmit={handleSubmit(onLogin)} noValidate>
          {loginMethod === 'email' ? (
            <div className="form-group">
              <label htmlFor="identifier">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="identifier"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  {...register('identifier', {
                    required: 'Email address is required',
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
              {errors.identifier && (
                <span className="field-error">{errors.identifier.message}</span>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="identifier">Mobile Number</label>
              <div className="input-wrapper">
                <input
                  id="identifier"
                  type="tel"
                  autoComplete="tel"
                  placeholder="9876543210 (10 digits)"
                  maxLength={10}
                  {...register('identifier', {
                    required: 'Mobile number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Mobile number must be 10 digits starting with 6, 7, 8, or 9'
                    }
                  })}
                />
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              {errors.identifier && (
                <span className="field-error">{errors.identifier.message}</span>
              )}
            </div>
          )}

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
      </div>
    </div>
  );
}