import React, { useEffect, useState } from 'react';
import { getCookieConsent, setCookieConsent } from '../utils/consent';
import './SitePrefsBanner.css';

export default function SitePrefsBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = getCookieConsent();
      setVisible(!consent);
    } catch (_) {
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
    <div className="prefs-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="prefs-banner__content">
        <p className="prefs-banner__text">
          We use cookies to enhance your experience and analyze traffic. You can accept or reject optional cookies.
          <a className="prefs-banner__link" href="/about"> Learn more</a>.
        </p>
        <div className="prefs-banner__actions">
          <button className="prefs-banner__button prefs-banner__button--secondary" onClick={reject}>
            Reject
          </button>
          <button className="prefs-banner__button prefs-banner__button--primary" onClick={accept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
