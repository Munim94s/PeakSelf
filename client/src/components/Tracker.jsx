import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { API_BASE } from '../config';
import { hasConsent } from '../utils/consent';

export default function Tracker() {
  const location = useLocation();
  const lastPathRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    try {
      // If user has not consented to optional cookies, skip tracking
      if (!hasConsent()) return;

      // Deduplicate to avoid React Strict Mode double-invoking effects in dev
      const prevPath = lastPathRef.current;
      if (prevPath === location.pathname) return;
      lastPathRef.current = location.pathname;

      // First hit (direct page load): use document.referrer (often '') and do NOT rely on HTTP Referer
      // Subsequent SPA navigations: treat referrer as site origin, which is acceptable for internal links
      const isFirstRouteHit = prevPath == null;
      const refToSend = isFirstRouteHit ? (document.referrer || null) : window.location.origin;

      // Extract source from URL query parameters (?src=instagram, ?src=youtube, etc.)
      // Only capture on first hit to preserve the original traffic source
      let sourceHint = sourceRef.current;
      if (isFirstRouteHit) {
        const params = new URLSearchParams(window.location.search);
        const srcParam = params.get('src') || params.get('source') || params.get('utm_source');
        if (srcParam) {
          sourceHint = srcParam;
          sourceRef.current = srcParam; // Save for subsequent navigations
        }
      }

      const trackingData = {
        referrer: refToSend,
        path: location.pathname
      };
      
      // Only include source if we have one
      if (sourceHint) {
        trackingData.source = sourceHint;
      }

      apiFetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
      }).catch(() => {});
    } catch (_) {}
  }, [location.pathname]);

  return null;
}
