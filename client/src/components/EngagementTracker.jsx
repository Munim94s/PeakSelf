/**
 * EngagementTracker Component
 * 
 * Orchestrates engagement tracking across the site including:
 * - Scroll depth tracking
 * - Time on page
 * - Click tracking on key elements
 * - Outbound link tracking
 */

import { useEffect } from 'react';
import { useScrollTracking } from '../hooks/useScrollTracking';
import { useTimeOnPage } from '../hooks/useTimeOnPage';
import { trackClick, trackOutboundLink, setUserProperties } from '../utils/analytics';
import { hasConsent } from '../utils/consent';

export default function EngagementTracker() {
  // Enable scroll and time tracking
  useScrollTracking();
  useTimeOnPage();

  useEffect(() => {
    if (!hasConsent()) return;

    // Track clicks on CTA buttons
    const handleClick = (event) => {
      const target = event.target.closest('button, a[href], [role="button"]');
      if (!target) return;

      // Get element info
      const elementText = target.textContent?.trim() || target.getAttribute('aria-label') || 'Unknown';
      const elementType = target.tagName.toLowerCase();
      const href = target.getAttribute('href');

      // Track outbound links
      if (elementType === 'a' && href) {
        try {
          const url = new URL(href, window.location.href);
          const isExternal = url.hostname !== window.location.hostname;
          
          if (isExternal) {
            trackOutboundLink(href, elementText);
            return;
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }

      // Track button clicks (if they have specific attributes)
      if (target.hasAttribute('data-track-click')) {
        const eventName = target.getAttribute('data-track-click') || elementText;
        trackClick(eventName, elementType, {
          href: href || undefined,
          location: window.location.pathname
        });
      }
    };

    // Track form submissions
    const handleSubmit = (event) => {
      const form = event.target;
      const formName = form.getAttribute('name') || 
                      form.getAttribute('id') || 
                      form.getAttribute('data-form-name') ||
                      'unknown_form';
      
      // Note: We can't know if submission was successful at this point
      // That needs to be tracked in the actual form handler
      if (form.hasAttribute('data-track-submit')) {
        // Will be handled by specific form components
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  // Set user properties if user is logged in
  useEffect(() => {
    if (!hasConsent()) return;

    // Try to get user info from localStorage or API
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserProperties({
          user_role: user.role || 'user',
          user_verified: user.verified || false
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  return null;
}
