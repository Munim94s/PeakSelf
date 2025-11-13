# Quick Setup Guide - Blog Engagement Tracking

## ✅ Implementation Complete!

All backend and frontend components have been created. Follow these steps to activate the system:

## Step 1: Run Database Migration

```powershell
cd server
node migrations/run_blog_engagement_migration.js up
```

**Expected output:**
```
Creating blog engagement tracking tables...
✓ blog_post_analytics table created
✓ blog_engagement_events table created
✓ blog_post_sessions table created
✓ blog_post_daily_stats table created
✓ Initialized analytics for existing blog posts
✅ Blog engagement tracking migration completed successfully
```

## Step 2: Add Route to Frontend

Find your React Router configuration file and add the analytics route.

**Option A: If using `client/src/main.jsx` or `client/src/App.jsx`:**

```javascript
import BlogAnalytics from './pages/BlogAnalytics';

// Add to your routes:
<Route path="/admin/blog-analytics" element={<BlogAnalytics />} />
```

**Example location in routes:**
```javascript
<Route path="/admin" element={<AdminLayout />}>
  <Route path="blog" element={<AdminBlog />} />
  <Route path="blog-analytics" element={<BlogAnalytics />} />  {/* ADD THIS */}
  <Route path="users" element={<AdminUsers />} />
  ...
</Route>
```

## Step 3: Add Tracking to Blog Posts

Find your blog post component (where individual posts are displayed) and add the tracking hook.

**Example: `client/src/pages/BlogPost.jsx` (or similar):**

```javascript
import { useBlogEngagementTracking } from '../hooks/useBlogEngagementTracking';
import { useParams } from 'react-router-dom';

export default function BlogPost() {
  const { id } = useParams(); // or slug, depending on your routing
  const [post, setPost] = useState(null);
  
  // Add this line to enable tracking
  const tracking = useBlogEngagementTracking(post?.id, true);
  
  // ... rest of your component
  
  return (
    <div>
      <h1>{post?.title}</h1>
      <div>{post?.content}</div>
      
      {/* Optional: Track specific interactions */}
      <button onClick={() => tracking.trackShare('twitter')}>
        Share on Twitter
      </button>
      
      <button onClick={() => tracking.trackCTAClick('subscribe')}>
        Subscribe to Newsletter
      </button>
    </div>
  );
}
```

## Step 4: Add Navigation Link (Optional)

Add a link to the analytics dashboard in your admin menu.

**Example: `client/src/components/AdminNav.jsx` (or similar):**

```javascript
import { BarChart3 } from 'lucide-react';

<Link to="/admin/blog-analytics" className="nav-link">
  <BarChart3 className="w-5 h-5" />
  <span>Blog Analytics</span>
</Link>
```

## Step 5: Restart the Server

```powershell
# Stop the server (Ctrl+C) and restart
npm run dev:server

# Or restart both client and server
npm run dev
```

## Step 6: Test the System

1. **Visit a blog post** on your site (as a regular user)
2. **Scroll through the post** (triggers scroll milestones)
3. **Wait 30+ seconds** (triggers time milestones)
4. **Navigate to** `/admin/blog-analytics`
5. **Check the analytics dashboard** - you should see:
   - Total views
   - Engagement metrics
   - The post you visited in the table

## What Gets Tracked Automatically

✅ **Page views** - When someone lands on a blog post
✅ **Scroll depth** - 25%, 50%, 75%, 100% milestones
✅ **Time on page** - 30s, 1min, 2min, 5min milestones
✅ **Exit events** - When someone leaves the page

## What You Can Track Manually

```javascript
const tracking = useBlogEngagementTracking(postId, true);

// Track CTA clicks
tracking.trackCTAClick('button-name');

// Track social shares
tracking.trackShare('twitter' | 'facebook' | 'linkedin');

// Track newsletter signups
tracking.trackNewsletterSignup();

// Track form submissions
tracking.trackFormSubmit('form-name');

// Track likes, comments, bookmarks
tracking.trackLike();
tracking.trackComment();
tracking.trackBookmark();

// Track link clicks
tracking.trackOutboundClick(url, linkText);
tracking.trackInternalClick(path, linkText);

// Track copy link
tracking.trackCopyLink();
```

## Available Analytics Endpoints

Once set up, you can access:

- **Comparison Dashboard**: `/admin/blog-analytics`
- **API Overview**: `GET /api/admin/blog-analytics/`
- **API Comparison**: `GET /api/admin/blog-analytics/comparison`
- **API Leaderboard**: `GET /api/admin/blog-analytics/leaderboard`
- **Single Post**: `GET /api/admin/blog-analytics/:postId`
- **Timeline**: `GET /api/admin/blog-analytics/:postId/timeline`
- **Audience**: `GET /api/admin/blog-analytics/:postId/audience`
- **Heatmap**: `GET /api/admin/blog-analytics/:postId/heatmap`

## Files Created

### Backend
- `server/migrations/create_blog_engagement.js` - Database migration
- `server/migrations/run_blog_engagement_migration.js` - Migration runner
- `server/routes/blog-tracking.js` - Tracking API
- `server/routes/admin/blog-analytics.js` - Analytics API

### Frontend
- `client/src/hooks/useBlogEngagementTracking.js` - Tracking hook
- `client/src/pages/BlogAnalytics.jsx` - Analytics dashboard

### Documentation
- `BLOG_ENGAGEMENT_TRACKING.md` - Full documentation
- `SETUP_BLOG_ANALYTICS.md` - This setup guide

## Troubleshooting

### "No analytics data showing"
- ✅ Check migration ran successfully
- ✅ Verify blog post page has tracking hook enabled
- ✅ Check browser console for errors
- ✅ Ensure session/visitor cookies are present

### "Tracking not working"
- ✅ Verify `postId` is valid number
- ✅ Check `/api/track/blog/:postId/engagement` endpoint works
- ✅ Ensure tracking cookies exist (ps_sid, ps_vid)

### "Migration failed"
- ✅ Check database connection
- ✅ Verify `blog_posts` table exists
- ✅ Check PostgreSQL logs

## Next Steps

1. ✅ Run the migration
2. ✅ Add the route to your React app
3. ✅ Add tracking to blog post component
4. ✅ Test with a real blog post
5. ✅ View analytics at `/admin/blog-analytics`
6. 📊 Enjoy comprehensive blog analytics!

## Support

For detailed documentation, see `BLOG_ENGAGEMENT_TRACKING.md`

Need help? Check:
- Server logs: `server/logs/`
- Browser console: Developer tools (F12)
- Database: Run queries to verify tables exist
