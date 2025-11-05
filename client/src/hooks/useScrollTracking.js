/**
 * useScrollTracking Hook
 * 
 * Tracks scroll depth on pages and sends events to Google Analytics
 * at 25%, 50%, 75%, and 90% milestones.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackScroll } from '../utils/analytics';
import { hasConsent } from '../utils/consent';

export function useScrollTracking() {
  const location = useLocation();
  const trackedMilestones = useRef(new Set());
  const isTracking = useRef(false);

  useEffect(() => {
    if (!hasConsent()) return;

    // Reset tracked milestones when path changes
    trackedMilestones.current = new Set();
    isTracking.current = true;

    const handleScroll = () => {
      if (!isTracking.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      if (docHeight === 0) return; // Avoid division by zero

      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      // Track at specific milestones
      const milestones = [25, 50, 75, 90];
      
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !trackedMilestones.current.has(milestone)) {
          trackedMilestones.current.add(milestone);
          trackScroll(milestone, location.pathname);
        }
      }
    };

    // Throttle scroll events
    let timeoutId;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 500);
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      isTracking.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location.pathname]);
}

export default useScrollTracking;
