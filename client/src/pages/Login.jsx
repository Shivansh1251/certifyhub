import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiRequest from '../utils/api';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', 'POST', { email, password });

      localStorage.setItem('token', data.token);
      const requestedDestination = location.state?.from;
      const requestedPath = typeof requestedDestination === 'string'
        ? requestedDestination
        : requestedDestination?.pathname
          ? `${requestedDestination.pathname}${requestedDestination.search || ''}${requestedDestination.hash || ''}`
          : '/';
      let destination = '/';
      try {
        const parsedDestination = new URL(requestedPath, window.location.origin);
        if (parsedDestination.origin === window.location.origin) {
          destination = `${parsedDestination.pathname}${parsedDestination.search}${parsedDestination.hash}`;
        }
      } catch {
        destination = '/';
      }
      window.location.assign(destination);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = loading ? 'Signing in...' : 'Sign in';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-content">
          <div className="auth-copy">
            <p className="eyebrow">Welcome back</p>
            <h1>Sign in to continue learning</h1>
            <p>
              Continue where you left off, track certificates, and manage your career-ready skills.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-footer">
              <label>
                <input type="checkbox" />
                Remember me
              </label>
              <Link to="/forgot" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {submitLabel}
            </button>
          </form>

          <p className="auth-switch">
          Don&apos;t have an account? <Link to="/register" state={location.state}>Create one</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
