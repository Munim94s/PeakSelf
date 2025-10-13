import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  // Check for URL error parameters (from OAuth redirects or rate limiting)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const retryIn = params.get('retry_in');

    if (error === 'rate_limit') {
      // Redirect to dedicated rate limit page
      navigate(`/rate-limit?retry_in=${retryIn || 15}`);
    } else if (error === 'oauth_failed') {
      setMsg('OAuth authentication failed. Please try again.');
    }

    // Clean up URL parameters
    if (error && error !== 'rate_limit') {
      window.history.replaceState({}, '', '/login');
    }
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      // Redirect to home page after successful login
      navigate('/');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const googleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  return (
    <div className="login-container">
      <section className="login-hero hero-section">
        <div className="container">
          <div>
            <div className="login-content">
              <div className="login-text-section">
                <h1 className="hero-title md:text-5xl">Welcome back</h1>
                <p className="hero-subtitle" style={{margin: '0 auto 1.5rem auto'}}>Pick up where you left off. Your insights await.</p>
                <div className="login-dev-tip">
                  <span className="font-semibold">Tip:</span> In development, verification links are printed in the server console.
                </div>
              </div>
              <div>
                <div className="login-form-container">
                  <div className="login-form-header">
                    <div className="login-avatar">
                      P
                    </div>
                    <h2 className="login-form-title">Welcome back</h2>
                    <p className="login-form-subtitle">Sign in to your PeakSelf account</p>
                  </div>

                  <div className="login-form-content">
                    <button 
                      onClick={googleLogin} 
                      className="login-oauth-btn"
                    >
                      <svg className="login-oauth-icon" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <div className="login-divider">
                      <div className="login-divider-text">
                        <span>or sign in with email</span>
                      </div>
                    </div>

                    <form onSubmit={onSubmit} className="login-form">
                      <div className="login-form-fields">
                        <div className="login-form-group">
                          <label className="login-form-label">Email address</label>
                          <input 
                            type="email"
                            className="login-form-input"
                            placeholder="you@example.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="login-form-group">
                          <div className="login-password-header">
                            <label className="login-form-label">Password</label>
                            <a href="#" className="login-forgot-password">Forgot password?</a>
                          </div>
                          <input 
                            type="password"
                            className="login-form-input"
                            placeholder="Enter your password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="login-submit-wrapper">
                        <button
                        type="submit" 
                        className="login-submit-btn"
                        >
                          Sign in
                        </button>
                      </div>
                    </form>

                    <div className="login-form-footer">
                      <p>
                        Don't have an account?{' '}
                        <a href="/register" className="login-signup-link">
                          Create account
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  {msg && (
                    <div className={`login-message ${
                      msg === 'Logged in' 
                        ? 'success' 
                        : 'error'
                    }`}>
                      {msg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


