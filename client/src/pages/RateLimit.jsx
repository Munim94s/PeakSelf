import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './RateLimit.css';

export default function RateLimit() {
  const [searchParams] = useSearchParams();
  const retryInMinutes = parseInt(searchParams.get('retry_in') || '15');
  const [timeLeft, setTimeLeft] = useState(retryInMinutes * 60); // Convert to seconds

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="rate-limit-container">
      <div className="rate-limit-content">
        <div className="rate-limit-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        <h1 className="rate-limit-title">Whoa there, speedy!</h1>

        <p className="rate-limit-message">
          Looks like you've been clicking a bit too fast for our servers to keep up!
          Take a breather, grab a coffee , and we'll be ready for you in:
        </p>

        <div className="rate-limit-timer">
          <div className="timer-segment">
            <div className="timer-number">{String(minutes).padStart(2, '0')}</div>
            <div className="timer-label">minutes</div>
          </div>
          <div className="timer-colon">:</div>
          <div className="timer-segment">
            <div className="timer-number">{String(seconds).padStart(2, '0')}</div>
            <div className="timer-label">seconds</div>
          </div>
        </div>

        {timeLeft === 0 && (
          <div className="rate-limit-ready">
            <p className="ready-message">You're good to go!</p>
            <Link to="/login" className="ready-button">
              Try Again
            </Link>
          </div>
        )}

        {timeLeft > 0 && (
          <div className="rate-limit-tips">
            <h3>In the meantime...</h3>
            <ul>
              <li>Check out our <Link to="/blog">latest blog posts</Link></li>
              <li>Learn more <Link to="/about">about Peakium</Link></li>
              <li>Stretch your legs and hydrate!</li>
            </ul>
          </div>
        )}

        <div className="rate-limit-footer">
          <p>
            This limit helps keep Peakium secure for everyone.
            Thanks for your patience!
          </p>
        </div>
      </div>
    </div>
  );
}
