import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client';
import { hasConsent } from '../utils/consent';

/**
 * Hook to track blog post engagement
 * Tracks: views, scroll depth, time on page, clicks, shares
 * 
 * @param {number} postId - The blog post ID
 * @param {boolean} enabled - Whether tracking is enabled
 */
export function useBlogEngagementTracking(postId, enabled = true) {
  const location = useLocation();
  const [consentGiven, setConsentGiven] = useState(hasConsent());
  const prevConsentRef = useRef(hasConsent());
  const [trackingTrigger, setTrackingTrigger] = useState(0);
  const [tracked, setTracked] = useState({
    view: false,
    scroll25: false,
    scroll50: false,
    scroll75: false,
    scroll100: false,
    time10: false,
    time30: false,
    time60: false,
    time120: false,
    time300: false
  });
  
  const startTimeRef = useRef(null);
  const timeTrackerRef = useRef(null);

  // Listen for cookie consent changes
  useEffect(() => {
    const checkConsent = () => {
      const newConsent = hasConsent();
      setConsentGiven(newConsent);
    };

    // Check consent on mount
    checkConsent();
    
    // Listen for consent changes (both same tab and other tabs)
    window.addEventListener('consentchange', checkConsent);
    window.addEventListener('storage', checkConsent);

    return () => {
      window.removeEventListener('consentchange', checkConsent);
      window.removeEventListener('storage', checkConsent);
    };
  }, []);

  // Track event helper with retry logic
  const trackEvent = async (eventType, eventData = {}, retryCount = 0) => {
    if (!enabled || !postId || !consentGiven) return;
    
    try {
      // Extract source from URL params (e.g., ?src=instagram)
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('src') || urlParams.get('source') || urlParams.get('utm_source');
      
      await api.post(`/api/track/blog/${postId}/engagement`, {
        event_type: eventType,
        event_data: eventData,
        source: source || undefined, // Only include if present
        referrer: document.referrer || undefined
      });
    } catch (error) {
      // If we get a 400 error (likely "tracking cookies not found"), retry after delay
      if (error.status === 400 && retryCount < 5) {
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return trackEvent(eventType, eventData, retryCount + 1);
      }
      // Silent fail - don't disrupt user experience
    }
  };

  // Calculate scroll depth percentage (based on article content, not footer)
  const calculateScrollDepth = () => {
    // Find the article element (blog post content)
    const article = document.querySelector('article');
    if (!article) {
      // Fallback to document if article not found
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const trackHeight = documentHeight - windowHeight;
      
      if (trackHeight <= 0) return 100;
      return Math.min(100, Math.round((scrollTop / trackHeight) * 100));
    }
    
    const articleTop = article.offsetTop;
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    
    // Calculate how far into the article the user has scrolled
    const scrolledPastTop = Math.max(0, scrollTop + windowHeight - articleTop);
    const percentScrolled = Math.min(100, Math.round((scrolledPastTop / articleHeight) * 100));
    
    return Math.max(0, percentScrolled);
  };

  // Get time spent on page in seconds
  const getTimeSpent = () => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  };

  // Detect when consent changes from false to true
  useEffect(() => {
    if (consentGiven && !prevConsentRef.current) {
      // Consent just changed from false to true - reset everything and trigger new tracking
      setTracked({
        view: false,
        scroll25: false,
        scroll50: false,
        scroll75: false,
        scroll100: false,
        time10: false,
        time30: false,
        time60: false,
        time120: false,
        time300: false
      });
      startTimeRef.current = null;
      // Increment trigger to force tracking effects to re-run
      setTrackingTrigger(prev => prev + 1);
    }
    prevConsentRef.current = consentGiven;
  }, [consentGiven]);

  // Track page view on mount or when consent is given
  useEffect(() => {
    if (!enabled || !postId || !consentGiven) return;

    // Only track view once
    if (!tracked.view) {
      trackEvent('view');
      setTracked(prev => ({ ...prev, view: true }));
      startTimeRef.current = Date.now();
    }

    // Set up time trackers
    const timers = [
      setTimeout(() => {
        trackEvent('time_milestone', { seconds: 10 });
        setTracked(prev => ({ ...prev, time10: true }));
      }, 10000),
      
      setTimeout(() => {
        trackEvent('time_milestone', { seconds: 30 });
        setTracked(prev => ({ ...prev, time30: true }));
      }, 30000),
      
      setTimeout(() => {
        trackEvent('time_milestone', { seconds: 60 });
        setTracked(prev => ({ ...prev, time60: true }));
      }, 60000),
      
      setTimeout(() => {
        trackEvent('time_milestone', { seconds: 120 });
        setTracked(prev => ({ ...prev, time120: true }));
      }, 120000),
      
      setTimeout(() => {
        trackEvent('time_milestone', { seconds: 300 });
        setTracked(prev => ({ ...prev, time300: true }));
      }, 300000)
    ];

    timeTrackerRef.current = timers;

    // Cleanup function
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      
      // Track exit event with final time
      const timeSpent = getTimeSpent();
      if (timeSpent > 0) {
        trackEvent('exit', { time_on_page: timeSpent });
      }
    };
  }, [postId, enabled, consentGiven, trackingTrigger]);

  // Track scroll depth
  useEffect(() => {
    if (!enabled || !postId || !consentGiven) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const depth = calculateScrollDepth();

          if (depth >= 25 && !tracked.scroll25) {
            trackEvent('scroll_milestone', { depth: 25 });
            setTracked(prev => ({ ...prev, scroll25: true }));
          }
          if (depth >= 50 && !tracked.scroll50) {
            trackEvent('scroll_milestone', { depth: 50 });
            setTracked(prev => ({ ...prev, scroll50: true }));
          }
          if (depth >= 75 && !tracked.scroll75) {
            trackEvent('scroll_milestone', { depth: 75 });
            setTracked(prev => ({ ...prev, scroll75: true }));
          }
          if (depth >= 100 && !tracked.scroll100) {
            trackEvent('scroll_milestone', { depth: 100 });
            setTracked(prev => ({ ...prev, scroll100: true }));
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [postId, enabled, consentGiven, tracked.scroll25, tracked.scroll50, tracked.scroll75, tracked.scroll100]);

  // Track page visibility (for accurate time tracking)
  useEffect(() => {
    if (!enabled || !postId || !consentGiven) return;

    let hiddenTime = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime) {
        // Adjust start time to account for hidden time
        const hiddenDuration = Date.now() - hiddenTime;
        if (startTimeRef.current) {
          startTimeRef.current += hiddenDuration;
        }
        hiddenTime = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [postId, enabled, consentGiven]);

  // Track exit on beforeunload (page close/refresh)
  useEffect(() => {
    if (!enabled || !postId || !consentGiven) return;

    const handleBeforeUnload = () => {
      const timeSpent = getTimeSpent();
      if (timeSpent > 0) {
        // Extract source from URL params for beacon
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('src') || urlParams.get('source') || urlParams.get('utm_source');
        
        const data = JSON.stringify({
          event_type: 'exit',
          event_data: { time_on_page: timeSpent },
          source: source || undefined,
          referrer: document.referrer || undefined
        });
        
        // Try sendBeacon first (more reliable)
        // Note: sendBeacon automatically includes credentials (cookies)
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon(`/api/track/blog/${postId}/engagement`, blob);
        } else {
          // Fallback to synchronous XHR with credentials
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/track/blog/${postId}/engagement`, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.withCredentials = true; // Include cookies
            xhr.send(data);
          } catch (e) {
            // Silent fail
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [postId, enabled, consentGiven]);

  // Public methods for manual tracking
  const trackCTAClick = (ctaName) => {
    trackEvent('cta_click', { cta_name: ctaName });
  };

  const trackShare = (platform) => {
    trackEvent('share', { platform });
  };

  const trackNewsletterSignup = () => {
    trackEvent('newsletter_signup');
  };

  const trackFormSubmit = (formName) => {
    trackEvent('form_submit', { form_name: formName });
  };

  const trackOutboundClick = (url, text) => {
    trackEvent('outbound_click', { url, text });
  };

  const trackInternalClick = (path, text) => {
    trackEvent('internal_click', { path, text });
  };

  const trackComment = () => {
    trackEvent('comment');
  };

  const trackLike = () => {
    trackEvent('like');
  };

  const trackBookmark = () => {
    trackEvent('bookmark');
  };

  const trackCopyLink = () => {
    trackEvent('copy_link');
  };

  return {
    trackCTAClick,
    trackShare,
    trackNewsletterSignup,
    trackFormSubmit,
    trackOutboundClick,
    trackInternalClick,
    trackComment,
    trackLike,
    trackBookmark,
    trackCopyLink,
    timeSpent: getTimeSpent(),
    scrollDepth: calculateScrollDepth()
  };
}

export default useBlogEngagementTracking;
