import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './CheckEmail.css';

export default function CheckEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
    
    // If no email parameter, redirect to register
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  const handleResendEmail = () => {
    // Set countdown to 60 seconds
    setCountdown(60);
    
    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // TODO: Implement actual resend email API call here
    console.log('Resending verification email to:', email);
  };

  return (
    <div className="check-email-container">
      <section className="check-email-hero hero-section">
        <div className="container">
          <div className="check-email-content">
            <div className="check-email-card">
              <div className="check-email-icon">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              
              <h1 className="check-email-title">Check your email</h1>
              
              <p className="check-email-message">
                We've sent a verification link to
              </p>
              
              <p className="check-email-address">
                {email}
              </p>
              
              <div className="check-email-instructions">
                <p>Click the link in the email to verify your account and get started.</p>
                <p className="check-email-note">
                  The link will expire in 24 hours.
                </p>
              </div>

              <div className="check-email-actions">
                <button 
                  onClick={handleResendEmail}
                  disabled={countdown !== null}
                  className="check-email-resend-btn"
                >
                  {countdown !== null 
                    ? `Resend in ${countdown}s` 
                    : 'Resend verification email'}
                </button>
                
                <a href="/login" className="check-email-login-link">
                  Back to login
                </a>
              </div>

              <div className="check-email-help">
                <p className="check-email-help-title">Didn't receive the email?</p>
                <ul className="check-email-help-list">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes for the email to arrive</li>
                </ul>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="check-email-dev-tip">
                  <strong>Development Mode:</strong> The verification link is printed in the server console.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
