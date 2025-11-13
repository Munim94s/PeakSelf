import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getCookieConsent, setCookieConsent } from '../utils/consent';
import { updateConsent, trackPageView } from '../utils/analytics';
import { apiFetch } from '../utils/api';
import { API_BASE } from '../config';
import './SitePrefsBanner.css';

export default function SitePrefsBanner() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      const consent = getCookieConsent();
      setVisible(!consent);
    } catch (_) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try { 
      setCookieConsent('accepted');
      updateConsent(true);
      trackPageView(location.pathname, document.title);
      
      const params = new URLSearchParams(window.location.search);
      const sourceHint = params.get('src') || params.get('source') || params.get('utm_source');
      
      apiFetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrer: document.referrer || null,
          path: location.pathname,
          source: sourceHint || undefined
        })
      }).catch(() => {});
    } catch (_) {}
    setVisible(false);
  };

  const reject = () => {
    try { 
      setCookieConsent('rejected');
      updateConsent(false); // Update Google Analytics consent
    } catch (_) {}
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
