/**
 * useTimeOnPage Hook
 * 
 * Tracks time spent on each page and sends to Google Analytics
 * when user leaves the page or after significant time intervals.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackTimeOnPage } from '../utils/analytics';
import { hasConsent } from '../utils/consent';

export function useTimeOnPage() {
  const location = useLocation();
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!hasConsent()) return;

    // Record when user arrived on page
    startTimeRef.current = Date.now();
    let lastReportedTime = 0;

    // Report time at intervals (every 30 seconds)
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Only report if significant time has passed since last report
        if (timeOnPage - lastReportedTime >= 30) {
          trackTimeOnPage(timeOnPage, location.pathname);
          lastReportedTime = timeOnPage;
        }
      }
    }, 30000); // Check every 30 seconds

    // Track when user navigates away or closes tab
    const handleBeforeUnload = () => {
      if (startTimeRef.current) {
        const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (timeOnPage >= 5) {
          trackTimeOnPage(timeOnPage, location.pathname);
        }
      }
    };

    // Track page visibility changes (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.hidden && startTimeRef.current) {
        const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (timeOnPage >= 5) {
          trackTimeOnPage(timeOnPage, location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Report when user leaves the page (route change)
    return () => {
      if (startTimeRef.current) {
        const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        // Only report if user spent at least 5 seconds on page
        if (timeOnPage >= 5) {
          trackTimeOnPage(timeOnPage, location.pathname);
        }
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);
}

export default useTimeOnPage;
