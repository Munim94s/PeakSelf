import React, { useEffect, useState } from 'react';
import { getCookieConsent, setCookieConsent } from '../utils/consent';
import './CookieBanner.css';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = getCookieConsent();
      setVisible(!consent);
    } catch (_) {
      // If localStorage is unavailable, show the banner
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try { setCookieConsent('accepted'); } catch (_) {}
    setVisible(false);
  };

  const reject = () => {
    try { setCookieConsent('rejected'); } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="cookie-banner__content">
        <p className="cookie-banner__text">
          We use cookies to enhance your experience and analyze traffic. You can accept or reject optional cookies.
          <a className="cookie-banner__link" href="/about"> Learn more</a>.
        </p>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__button cookie-banner__button--secondary" onClick={reject}>
            Reject
          </button>
          <button className="cookie-banner__button cookie-banner__button--primary" onClick={accept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
