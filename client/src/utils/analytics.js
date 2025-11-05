/**
 * Google Analytics 4 Integration
 * 
 * Provides utilities for tracking pageviews, events, and user properties
 * with GA4 while respecting user consent preferences.
 */

import { GA_MEASUREMENT_ID, GA_ENABLED } from '../config';
import { hasConsent } from './consent';

/**
 * Check if GA4 is available and initialized
 */
export function isGAAvailable() {
  return GA_ENABLED && typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Initialize Google Analytics with consent mode
 */
export function initGA() {
  console.log('🚀 initGA called:', { GA_ENABLED, GA_MEASUREMENT_ID, hasConsent: hasConsent() });
  if (!GA_ENABLED) {
    console.warn('⚠️ GA not enabled - GA_MEASUREMENT_ID is missing');
    return;
  }
  
  // Initialize consent mode defaults (before gtag is loaded)
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // Ensure gtag.js script is loaded (works in dev and prod)
  try {
    const hasScript = Array.from(document.scripts).some(s => s.src && s.src.includes('googletagmanager.com/gtag/js'));
    if (!hasScript) {
      console.log('✅ Loading gtag.js from analytics.js...');
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.onload = () => console.log('✅ gtag.js loaded (analytics.js)');
      script.onerror = () => console.error('❌ Failed to load gtag.js (analytics.js)');
      document.head.appendChild(script);
    }
  } catch (_) {}
  
  // Set default consent state (denied until user accepts)
  gtag('consent', 'default', {
    'analytics_storage': hasConsent() ? 'granted' : 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'wait_for_update': 500
  });
  console.log('✅ GA consent mode initialized');

  // Initialize GA4
  gtag('js', new Date());
  
  // Enable debug mode for localhost testing
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  gtag('config', GA_MEASUREMENT_ID, {
    'send_page_view': false, // We'll send pageviews manually
    'anonymize_ip': true,
    'cookie_flags': 'SameSite=Lax;Secure',
    'debug_mode': isLocalhost // Enable DebugView for localhost
  });
  console.log('✅ GA4 configured with ID:', GA_MEASUREMENT_ID, isLocalhost ? '(debug mode enabled)' : '');
}

/**
 * Update consent mode when user accepts/rejects cookies
 */
export function updateConsent(accepted) {
  if (!isGAAvailable()) return;
  
  window.gtag('consent', 'update', {
    'analytics_storage': accepted ? 'granted' : 'denied'
  });
}

/**
 * Track a pageview
 */
export function trackPageView(path, title) {
  console.log('🔍 trackPageView called:', { path, title, isAvailable: isGAAvailable(), hasConsent: hasConsent() });
  if (!isGAAvailable() || !hasConsent()) {
    console.warn('❌ GA tracking skipped:', { isAvailable: isGAAvailable(), hasConsent: hasConsent() });
    return;
  }
  
  console.log('✅ Sending GA page_view event');
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href
  });
}

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} params - Event parameters
 */
export function trackEvent(eventName, params = {}) {
  if (!isGAAvailable() || !hasConsent()) return;
  
  window.gtag('event', eventName, params);
}

/**
 * Set user properties (e.g., user role, user ID)
 */
export function setUserProperties(properties) {
  if (!isGAAvailable() || !hasConsent()) return;
  
  window.gtag('set', 'user_properties', properties);
}

/**
 * Track scroll depth
 */
export function trackScroll(percentage, path) {
  trackEvent('scroll', {
    percent_scrolled: percentage,
    page_path: path
  });
}

/**
 * Track time on page (in seconds)
 */
export function trackTimeOnPage(seconds, path) {
  trackEvent('time_on_page', {
    value: seconds,
    page_path: path
  });
}

/**
 * Track button/link clicks
 */
export function trackClick(elementName, elementType = 'button', additionalData = {}) {
  trackEvent('click', {
    element_name: elementName,
    element_type: elementType,
    ...additionalData
  });
}

/**
 * Track form submissions
 */
export function trackFormSubmit(formName, success = true) {
  trackEvent('form_submit', {
    form_name: formName,
    success: success
  });
}

/**
 * Track search queries
 */
export function trackSearch(searchTerm, resultsCount) {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
}

/**
 * Track file downloads
 */
export function trackDownload(fileName, fileType) {
  trackEvent('file_download', {
    file_name: fileName,
    file_extension: fileType,
    link_url: fileName
  });
}

/**
 * Track outbound link clicks
 */
export function trackOutboundLink(url, linkText) {
  trackEvent('click', {
    link_url: url,
    link_text: linkText,
    outbound: true
  });
}

/**
 * Track video engagement
 */
export function trackVideoPlay(videoTitle, videoUrl) {
  trackEvent('video_start', {
    video_title: videoTitle,
    video_url: videoUrl
  });
}

export function trackVideoProgress(videoTitle, percentComplete) {
  trackEvent('video_progress', {
    video_title: videoTitle,
    video_percent: percentComplete
  });
}

export function trackVideoComplete(videoTitle) {
  trackEvent('video_complete', {
    video_title: videoTitle
  });
}

/**
 * Track blog post engagement
 */
export function trackBlogView(postTitle, postSlug, category) {
  trackEvent('view_item', {
    item_name: postTitle,
    item_id: postSlug,
    item_category: category,
    content_type: 'blog_post'
  });
}

export function trackBlogReadProgress(postSlug, percentRead) {
  trackEvent('blog_read_progress', {
    post_slug: postSlug,
    percent_read: percentRead
  });
}

export function trackBlogReadComplete(postSlug, readTime) {
  trackEvent('blog_read_complete', {
    post_slug: postSlug,
    read_time_seconds: readTime
  });
}

/**
 * Track social media interactions
 */
export function trackSocialShare(platform, contentType, contentId) {
  trackEvent('share', {
    method: platform,
    content_type: contentType,
    item_id: contentId
  });
}

/**
 * Track newsletter signup
 */
export function trackNewsletterSignup(source) {
  trackEvent('sign_up', {
    method: 'newsletter',
    source: source
  });
}

/**
 * Track user authentication
 */
export function trackLogin(method) {
  trackEvent('login', {
    method: method
  });
}

export function trackSignup(method) {
  trackEvent('sign_up', {
    method: method
  });
}

/**
 * Track errors
 */
export function trackError(errorMessage, errorType, fatal = false) {
  trackEvent('exception', {
    description: errorMessage,
    error_type: errorType,
    fatal: fatal
  });
}

/**
 * Track engagement events (automatically tracked by enhanced measurement, but can be called manually)
 */
export function trackEngagement(engagementTime) {
  trackEvent('user_engagement', {
    engagement_time_msec: engagementTime
  });
}

/**
 * Track page exit
 */
export function trackPageExit(path, timeOnPage) {
  trackEvent('page_exit', {
    page_path: path,
    time_on_page: timeOnPage
  });
}

/**
 * E-commerce tracking (if needed in the future)
 */
export function trackPurchase(transactionId, value, currency = 'USD', items = []) {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items
  });
}

export default {
  initGA,
  updateConsent,
  trackPageView,
  trackEvent,
  setUserProperties,
  trackScroll,
  trackTimeOnPage,
  trackClick,
  trackFormSubmit,
  trackSearch,
  trackDownload,
  trackOutboundLink,
  trackVideoPlay,
  trackVideoProgress,
  trackVideoComplete,
  trackBlogView,
  trackBlogReadProgress,
  trackBlogReadComplete,
  trackSocialShare,
  trackNewsletterSignup,
  trackLogin,
  trackSignup,
  trackError,
  trackEngagement,
  trackPurchase
};
