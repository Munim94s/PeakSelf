# Blog Engagement Tracking System

A comprehensive system for tracking and analyzing blog post engagement with detailed metrics, comparison views, and performance insights.

## Features

### Backend
- ✅ **4 Database Tables**: Analytics, events, sessions, daily stats
- ✅ **Tracking API**: Real-time event recording (`/api/track/blog/:postId/engagement`)
- ✅ **Analytics API**: Comprehensive endpoints for data retrieval
- ✅ **Automated Aggregation**: Real-time metric calculation
- ✅ **Engagement Scoring**: Weighted algorithm for post performance

### Frontend
- ✅ **Automatic Tracking**: Views, scroll depth, time on page
- ✅ **Manual Tracking Methods**: CTAs, shares, forms, clicks
- ✅ **Analytics Dashboard**: Compare all posts with sortable table
- ✅ **Performance Metrics**: Views, engagement rate, time, scroll depth, shares

### Tracked Metrics

#### View Metrics
- Total views
- Unique visitors
- Returning visitors

#### Engagement Metrics
- Time on page (avg, median, total)
- Scroll depth (avg, 25%, 50%, 75%, 100%)
- Engagement rate (% of engaged sessions)

#### Interaction Metrics
- Total clicks
- CTA clicks
- Outbound clicks
- Internal link clicks
- Social shares (Twitter, Facebook, LinkedIn)
- Newsletter signups
- Form submissions
- Comments, likes, bookmarks

#### Traffic Metrics
- Source distribution (Direct, Google, Instagram, Facebook, YouTube, Twitter, Other)
- Bounce rate
- Exit rate

## Installation

### 1. Run Database Migration

```bash
cd server
node migrations/run_blog_engagement_migration.js up
```

This creates:
- `blog_post_analytics` - Aggregated metrics per post
- `blog_engagement_events` - Raw event data
- `blog_post_sessions` - Per-session metrics
- `blog_post_daily_stats` - Time-series data

### 2. Server Routes (Already Configured)

✅ Tracking route: `/api/track/blog/:postId/engagement`
✅ Admin routes: `/api/admin/blog-analytics/*`

### 3. Frontend Integration

#### Add Analytics Dashboard Route

In your React Router configuration (e.g., `client/src/App.jsx` or `client/src/main.jsx`):

```javascript
import BlogAnalytics from './pages/BlogAnalytics';

// Add to your routes:
<Route path="/admin/blog-analytics" element={<BlogAnalytics />} />
```

#### Add Tracking to Blog Post Pages

Find your blog post component (e.g., `client/src/pages/BlogPost.jsx` or similar) and add:

```javascript
import { useBlogEngagementTracking } from '../hooks/useBlogEngagementTracking';

function BlogPost() {
  const { postId } = useParams(); // or however you get the post ID
  const tracking = useBlogEngagementTracking(postId, true);

  // ... rest of your component

  // For manual tracking:
  <button onClick={() => tracking.trackCTAClick('subscribe')}>
    Subscribe
  </button>

  <button onClick={() => tracking.trackShare('twitter')}>
    Share on Twitter
  </button>
}
```

#### Add Navigation Link

In your admin navigation menu:

```jsx
<Link to="/admin/blog-analytics">
  <BarChart3 />
  Blog Analytics
</Link>
```

## API Endpoints

### Tracking

```bash
POST /api/track/blog/:postId/engagement
Body: {
  event_type: 'view' | 'scroll_milestone' | 'time_milestone' | 'click' | 'share' | ...
  event_data: { ... }
}
```

### Analytics

```bash
# Overview of all posts
GET /api/admin/blog-analytics/

# Compare all posts (sortable)
GET /api/admin/blog-analytics/comparison?sort_by=engagement_score&order=DESC

# Leaderboard (top 10 posts by various metrics)
GET /api/admin/blog-analytics/leaderboard

# Single post analytics
GET /api/admin/blog-analytics/:postId

# Daily timeline data (for charts)
GET /api/admin/blog-analytics/:postId/timeline?days=30

# Audience breakdown
GET /api/admin/blog-analytics/:postId/audience

# Engagement heatmap
GET /api/admin/blog-analytics/:postId/heatmap
```

## Tracking Hook API

```javascript
const {
  trackCTAClick,           // trackCTAClick('subscribe-button')
  trackShare,              // trackShare('twitter')
  trackNewsletterSignup,   // trackNewsletterSignup()
  trackFormSubmit,         // trackFormSubmit('contact-form')
  trackOutboundClick,      // trackOutboundClick(url, text)
  trackInternalClick,      // trackInternalClick(path, text)
  trackComment,            // trackComment()
  trackLike,               // trackLike()
  trackBookmark,           // trackBookmark()
  trackCopyLink,           // trackCopyLink()
  timeSpent,               // Current time spent (seconds)
  scrollDepth              // Current scroll depth (percentage)
} = useBlogEngagementTracking(postId, enabled);
```

## Engagement Scoring Formula

```javascript
score = 
  (total_views × 1) +
  (avg_time_on_page × 0.5) +
  (scroll_100_percent × 5) +
  (total_shares × 10) +
  (newsletter_signups × 20) +
  (cta_clicks × 3) +
  (avg_scroll_depth × 0.5)
```

## Database Schema

### blog_post_analytics
Aggregated metrics for each post (one row per post)

**Key fields:**
- `total_views`, `unique_visitors`
- `avg_time_on_page`, `median_time_on_page`
- `avg_scroll_depth`, `scroll_25_percent`, `scroll_50_percent`, etc.
- `engagement_rate`, `engagement_score`
- `total_shares`, `newsletter_signups`
- Traffic source breakdowns

### blog_engagement_events
Raw event data (one row per event)

**Key fields:**
- `post_id`, `session_id`, `visitor_id`, `user_id`
- `event_type`, `event_data` (JSONB)
- `occurred_at`

### blog_post_sessions
Session-level metrics (one row per post per session)

**Key fields:**
- `post_id`, `session_id`, `visitor_id`, `user_id`
- `time_on_page`, `max_scroll_depth`, `read_to_end`
- `was_engaged`, `clicked_cta`, `shared_content`
- `traffic_source`, `is_landing_page`, `is_exit_page`

### blog_post_daily_stats
Time-series data (one row per post per day)

**Key fields:**
- `post_id`, `stat_date`
- `views`, `unique_visitors`
- `avg_time_on_page`, `avg_scroll_depth`
- `engagement_rate`, `total_shares`

## Usage Examples

### 1. View Analytics Dashboard

Navigate to `/admin/blog-analytics` to see:
- Overview metrics (total views, avg engagement, shares, time)
- Sortable table of all posts
- Performance comparison

### 2. View Single Post Analytics

Click "Details" on any post or navigate to `/admin/blog-analytics/:postId`

Shows:
- Key metrics with trends
- Daily performance charts
- Scroll depth funnel
- Traffic source breakdown
- Engagement actions

### 3. Track Custom Events

```javascript
// In your blog post component
const tracking = useBlogEngagementTracking(postId);

// Track CTA clicks
<button onClick={() => tracking.trackCTAClick('newsletter-cta')}>
  Subscribe
</button>

// Track social shares
<button onClick={() => tracking.trackShare('twitter')}>
  Share
</button>

// Track newsletter signups
const handleNewsletterSubmit = () => {
  tracking.trackNewsletterSignup();
  // ... rest of signup logic
};
```

## Performance Considerations

- ✅ Events tracked asynchronously (non-blocking)
- ✅ Aggregation runs in real-time on tracking
- ✅ Indexes on all frequently queried fields
- ✅ JSONB for flexible event data
- ✅ Silent failures (tracking errors don't break UX)

## Future Enhancements

- [ ] Daily aggregation cron job (for blog_post_daily_stats)
- [ ] Engagement score recalculation job
- [ ] Real-time dashboard with WebSockets
- [ ] A/B testing integration
- [ ] Heatmap visualization
- [ ] Detailed single-post analytics page with charts
- [ ] Export analytics to CSV
- [ ] Email reports

## Rollback

If you need to remove the system:

```bash
cd server
node migrations/run_blog_engagement_migration.js down
```

⚠️ This will **delete all engagement data**.

## Troubleshooting

### No data showing up

1. Check that migration ran successfully
2. Verify tracking is enabled on blog post pages
3. Check browser console for tracking errors
4. Verify API routes are mounted correctly

### Tracking not working

1. Ensure `postId` is valid
2. Check that cookies are enabled (tracking requires session/visitor cookies)
3. Verify `/api/track/blog/:postId/engagement` endpoint is accessible

### Performance issues

1. Check database indexes are created
2. Consider adding connection pooling
3. Implement caching for analytics queries
4. Use daily stats table for historical data

## Support

For issues or questions, check:
- Server logs: `server/logs/`
- Database queries in `server/routes/admin/blog-analytics.js`
- Tracking logic in `client/src/hooks/useBlogEngagementTracking.js`
