# Google Analytics 4 Integration

This document describes the Google Analytics 4 (GA4) integration implemented in PeakSelf, including setup, features, and usage.

## Overview

PeakSelf now includes comprehensive Google Analytics 4 tracking with:
- **Consent Mode v2** integration (GDPR/privacy compliant)
- **Dual tracking** (internal analytics + Google Analytics)
- **Engagement metrics** (scroll depth, time on page, clicks)
- **Enhanced measurement** (blog engagement, search, social shares)
- **Custom dimensions and user properties**

## Setup

### 1. Get Your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or use an existing one
3. Navigate to **Admin → Data Streams → Your Web Stream**
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### 2. Configure Environment Variable

Add your Measurement ID to your environment configuration:

**Development** (`client/.env.development`):
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Production** (`client/.env.production`):
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note:** If you don't set `VITE_GA_MEASUREMENT_ID`, Google Analytics will be disabled.

### 3. Build & Deploy

```bash
# Development (GA4 will track in dev mode)
npm run dev

# Production build
npm run build
```

The Vite build process automatically injects your measurement ID into the HTML.

## Features

### 1. Consent Mode v2

Full GDPR/CCPA compliance with Google's Consent Mode v2:
- Default consent state: **denied** until user accepts
- Updates consent when user accepts/rejects cookie banner
- Respects user privacy preferences
- No tracking cookies until consent is granted

### 2. Automatic Page Tracking

Every page navigation is tracked automatically:
- Page views with title and URL
- Landing pages and referrers
- Internal navigation paths
- UTM parameters and traffic sources

### 3. Engagement Metrics

#### Scroll Depth Tracking
Automatically tracks scroll milestones:
- 25% scroll
- 50% scroll
- 75% scroll
- 90% scroll

#### Time on Page
Tracks engagement time:
- Reports every 30 seconds while user is active
- Final report when user leaves page
- Minimum 5 seconds to qualify

#### Click Tracking
Tracks important interactions:
- Button clicks (add `data-track-click="button_name"` attribute)
- Outbound links (automatic)
- CTA buttons (automatic)

### 4. Blog Engagement Tracking

Special tracking for blog posts:
- **Post views**: Tracked with title, slug, and category
- **Read progress**: 25%, 50%, 75%, 90% milestones
- **Read completion**: When user reads 90%+ and spends >10 seconds
- **Social shares**: Native share API or share button clicks
- **Like interactions**: Button clicks tracked

### 5. Search Tracking

Tracks search queries:
- Search terms
- Number of results
- Integrated with SearchBar component

### 6. User Properties

Sets custom user properties when available:
- User role (admin, user, etc.)
- Verification status
- Can be extended with more properties

## Implementation Details

### Key Files

```
client/src/
├── utils/
│   └── analytics.js           # Main GA4 utility module
├── hooks/
│   ├── useScrollTracking.js   # Scroll depth tracking hook
│   └── useTimeOnPage.js       # Time on page tracking hook
├── components/
│   ├── Tracker.jsx            # Dual tracking (internal + GA)
│   ├── EngagementTracker.jsx  # Engagement metrics orchestrator
│   └── SitePrefsBanner.jsx    # Consent banner with GA integration
└── config.js                  # GA configuration

client/
├── index.html                 # GA4 script injection
└── vite.config.js             # Build-time GA ID injection
```

### Analytics API

The `analytics.js` module provides a comprehensive API:

```javascript
import { 
  trackPageView, 
  trackEvent, 
  trackClick,
  trackScroll,
  trackBlogView,
  trackSearch,
  // ... and more
} from '../utils/analytics';

// Track custom events
trackEvent('custom_event', { custom_param: 'value' });

// Track button clicks
trackClick('signup_button', 'button', { location: '/home' });

// Track blog views
trackBlogView('Post Title', 'post-slug', 'category');
```

### Adding Custom Tracking

#### Track Clicks on Specific Elements

Add the `data-track-click` attribute:

```jsx
<button data-track-click="newsletter_signup">
  Subscribe
</button>
```

#### Track Form Submissions

Use the `trackFormSubmit` function:

```javascript
import { trackFormSubmit } from '../utils/analytics';

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await submitForm();
    trackFormSubmit('contact_form', true);
  } catch (error) {
    trackFormSubmit('contact_form', false);
  }
};
```

#### Track Custom Events

```javascript
import { trackEvent } from '../utils/analytics';

trackEvent('video_play', {
  video_title: 'Introduction',
  video_duration: 120
});
```

## GA4 Console Configuration

### Recommended Events to Monitor

In your GA4 property, you can monitor these events:

**Standard Events:**
- `page_view` - Page navigation
- `click` - Button/link clicks
- `scroll` - Scroll depth milestones
- `search` - Search queries
- `share` - Social shares
- `sign_up` - User registrations
- `login` - User logins

**Custom Events:**
- `time_on_page` - Engagement time
- `blog_read_progress` - Blog reading progress
- `blog_read_complete` - Complete blog reads
- `form_submit` - Form submissions
- `file_download` - File downloads

### Custom Dimensions

Configure these custom dimensions in GA4:

1. **User Properties:**
   - `user_role` (user dimension)
   - `user_verified` (user dimension)

2. **Event Parameters:**
   - `post_slug` (event parameter)
   - `percent_read` (event parameter)
   - `read_time_seconds` (event parameter)
   - `element_name` (event parameter)
   - `form_name` (event parameter)

## Privacy & Compliance

### GDPR Compliance

- Consent Mode v2 ensures compliance with European regulations
- No cookies stored until user accepts
- Analytics data is anonymized (`anonymize_ip: true`)
- User can reject tracking entirely

### Data Collection

**With Consent:**
- Page views and navigation
- Scroll depth and time on page
- Click interactions
- Search queries
- User properties (role, verification)

**Without Consent:**
- No tracking cookies
- No analytics data sent to Google
- Internal analytics still work (with essential cookies)

## Comparison: Internal Analytics vs Google Analytics

### Internal Analytics (Already Implemented)
- Session tracking
- Traffic sources
- Visitor identification
- Basic page views
- Server-side tracking

### Google Analytics 4 (New)
- Advanced engagement metrics
- Scroll depth and time tracking
- Blog post engagement
- Integration with Google's ecosystem
- Advanced funnel analysis
- Audience insights
- Cross-device tracking

### Why Both?

1. **Ownership**: Internal analytics gives you full control of your data
2. **Privacy**: Some users prefer self-hosted analytics
3. **Comparison**: Validate GA4 data against internal metrics
4. **Redundancy**: Backup tracking in case one system fails
5. **Insights**: Each system provides unique insights

## Troubleshooting

### GA4 Not Tracking

**Check:**
1. Is `VITE_GA_MEASUREMENT_ID` set in your `.env` file?
2. Did you rebuild after adding the environment variable?
3. Has the user accepted cookies?
4. Open browser console and check for GA4 errors
5. Use GA4 DebugView in the console (enable with `?debug_mode=true`)

**Debug in Console:**
```javascript
console.log('GA Enabled:', import.meta.env.VITE_GA_MEASUREMENT_ID);
console.log('User Consent:', localStorage.getItem('cookie-consent'));
console.log('gtag available:', typeof window.gtag);
```

### Events Not Appearing in GA4

- It can take 24-48 hours for events to appear in standard reports
- Use **DebugView** (in GA4 console) for real-time event monitoring
- Check that user has consented to tracking
- Verify event names match GA4 conventions (lowercase, underscores)

### Consent Banner Not Working

- Check browser localStorage is enabled
- Clear cookies and reload page
- Verify `SitePrefsBanner` component is rendered

## Performance Impact

The GA4 integration is optimized for minimal performance impact:

- **Lazy loading**: gtag.js loads asynchronously
- **Throttling**: Scroll events throttled to 500ms
- **Conditional**: Only loads if measurement ID is configured
- **Consent-aware**: No tracking until user consents
- **Bundle size**: ~15KB gzipped (gtag.js is external)

## Testing

### Development Testing

```bash
# Run with GA4 enabled
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run dev

# Run without GA4
npm run dev
```

### Verify Tracking

1. Open browser DevTools → Network tab
2. Filter by "google-analytics" or "collect"
3. Navigate pages and interact with site
4. Verify requests are sent after accepting cookies

### GA4 DebugView

1. Add `?debug_mode=true` to your URL
2. Open GA4 Console → DebugView
3. See events in real-time as you navigate

## Future Enhancements

Potential additions to consider:

- [ ] Enhanced e-commerce tracking (if applicable)
- [ ] Video engagement tracking (YouTube embeds)
- [ ] Form field interactions
- [ ] Error tracking integration
- [ ] A/B testing support
- [ ] Conversion funnel tracking
- [ ] Custom GTM (Google Tag Manager) integration

## Support

For issues or questions:
- Check the [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- Review this file for configuration details
- Check browser console for errors
- Verify environment variables are set correctly

---

**Last Updated:** 2025-11-05
**Version:** 1.0.0
