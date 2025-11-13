# Time Tracking Debug & Test Guide

## ✅ Fixes Applied

### 1. Fixed NULL Constraint Error
- Added `COALESCE` to all aggregate functions to ensure they return 0 instead of NULL
- Added `safeStats` object to double-check no NULL values are passed
- Added debug logging to track what's happening

### 2. Added Debug Logging
Now the server will log:
- Every tracking event received: `Tracking event: time_milestone for post X`
- Analytics updates: `Updating analytics for post X: avg_time=10, views=1`

## 🔄 RESTART SERVER REQUIRED

**Important:** You must restart the server for these changes to take effect:

```powershell
# Stop the server (Ctrl+C in the terminal running the server)
# Then restart:
npm run dev
```

## 🧪 Testing Steps

### Step 1: Clear Previous Data (Optional)
If you want to start fresh:

```sql
-- Delete previous test data
DELETE FROM blog_engagement_events WHERE post_id = 1; -- Replace 1 with your test post ID
DELETE FROM blog_post_sessions WHERE post_id = 1;
UPDATE blog_post_analytics SET 
  total_views = 0, 
  avg_time_on_page = 0, 
  max_scroll_depth = 0 
WHERE post_id = 1;
```

### Step 2: Open Browser DevTools
1. Open Chrome/Firefox DevTools (F12)
2. Go to **Console** tab (to see any client-side errors)
3. Go to **Network** tab (to see API requests)
4. Filter network by "engagement"

### Step 3: Visit Blog Post
1. Navigate to: `http://localhost:5173/blog`
2. Click on any blog post
3. **Stay on the page for at least 15 seconds**
4. Don't switch tabs or minimize browser

### Step 4: Watch the Logs

**In Browser Console, you should see:**
```
(nothing - tracking is silent unless there's an error)
```

**In Browser Network Tab, you should see:**
```
POST /api/track/blog/1/engagement [200] - "view"
POST /api/track/blog/1/engagement [200] - "time_milestone" (after 10s)
POST /api/track/blog/1/engagement [200] - "scroll_milestone" (if you scroll)
```

**In Server Terminal, you should see:**
```
17:xx:xx info: Tracking event: view for post 1, data: {}
17:xx:xx info: Updating analytics for post 1: avg_time=0, views=1

17:xx:xx info: Tracking event: time_milestone for post 1, data: { seconds: 10 }
17:xx:xx info: Updating analytics for post 1: avg_time=10, views=1
```

### Step 5: Check Analytics Dashboard
1. Navigate to: `http://localhost:5173/admin/blog-analytics`
2. Find the post you just viewed
3. **Expected:**
   - Views: 1
   - Time on page: **10s** (or 30s if you stayed that long)
   - Scroll depth: Percentage based on how far you scrolled

## 🔍 Debugging Checklist

### If Time is Still 0s:

#### 1. Check Browser Console
- **Open DevTools → Console**
- Look for any red errors
- Look for tracking-related warnings

**Common issues:**
- `Tracking cookies not found` - Session/visitor cookies missing
- `Failed to track engagement` - API error

#### 2. Check Network Tab
- **Open DevTools → Network → Filter by "engagement"**
- Verify requests are being sent
- Check response status (should be 200)
- Click on a request to see:
  - Request payload (should have `event_type` and `event_data`)
  - Response body (should be `{"success": true, "data": {"tracked": true}}`)

**Common issues:**
- No requests showing up - Tracking hook not initialized
- 400 Bad Request - Missing cookies
- 500 Server Error - Check server logs

#### 3. Check Server Logs
Look for these patterns:

**Good:**
```
info: Tracking event: view for post 1
info: Tracking event: time_milestone for post 1, data: { seconds: 10 }
info: Updating analytics for post 1: avg_time=10, views=1
```

**Bad:**
```
error: Error tracking blog engagement: ...
error: Error updating post analytics: ...
```

#### 4. Check Cookies
- **Open DevTools → Application → Cookies → http://localhost:5173**
- Verify these exist:
  - `ps_sid` (session ID)
  - `ps_vid` (visitor ID)

If missing, the tracking won't work. Clear all cookies and try again.

#### 5. Check Database Directly

```sql
-- Check if session was created
SELECT * FROM blog_post_sessions 
WHERE post_id = 1 
ORDER BY entered_at DESC 
LIMIT 1;

-- Expected: One row with time_on_page = 10 (or 30)

-- Check events
SELECT event_type, event_data, occurred_at 
FROM blog_engagement_events 
WHERE post_id = 1 
ORDER BY occurred_at DESC 
LIMIT 5;

-- Expected: view, time_milestone(10), maybe time_milestone(30), scroll_milestone

-- Check aggregated analytics
SELECT post_id, total_views, avg_time_on_page, avg_scroll_depth
FROM blog_post_analytics 
WHERE post_id = 1;

-- Expected: total_views >= 1, avg_time_on_page >= 10
```

## 🐛 Common Issues & Solutions

### Issue: "Tracking cookies not found"
**Solution:** 
1. Make sure you visited the homepage first (to set tracking cookies)
2. Or clear all cookies and reload the blog list page
3. Check if cookies are blocked in your browser

### Issue: Time milestone not firing
**Solution:**
1. Make sure you stay on the page for full 10+ seconds
2. Don't switch tabs (tab visibility pauses tracking)
3. Check browser console for errors
4. Verify the tracking hook is initialized: Look for `useBlogEngagementTracking(postId, true)` in Post.jsx

### Issue: Server shows NULL error
**Solution:** 
This should be fixed now with COALESCE and safeStats. If you still see it:
1. Restart the server
2. Check you're running the latest code
3. Look at the exact error message - which column is NULL?

### Issue: Analytics dashboard shows 0s even though logs show 10s
**Solution:**
1. Hard refresh the analytics page (Ctrl+Shift+R)
2. Check if you're looking at the correct post
3. Query the database directly to verify the data is there
4. Check browser network tab - is the API returning the correct data?

## 📊 Expected Flow

```
1. User lands on blog post
   ↓ [immediately]
   Browser: POST /api/track/blog/1/engagement {event_type: "view"}
   Server: "Tracking event: view for post 1"
   Server: "Updating analytics for post 1: avg_time=0, views=1"
   DB: blog_post_sessions created with time_on_page=0

2. After 10 seconds
   ↓
   Browser: POST /api/track/blog/1/engagement {event_type: "time_milestone", event_data: {seconds: 10}}
   Server: "Tracking event: time_milestone for post 1, data: { seconds: 10 }"
   Server: "Updating analytics for post 1: avg_time=10, views=1"
   DB: blog_post_sessions updated with time_on_page=10

3. User closes tab/navigates away
   ↓
   Browser: sendBeacon /api/track/blog/1/engagement {event_type: "exit", event_data: {time_on_page: 15}}
   Server: "Tracking event: exit for post 1"
   Server: "Updating analytics for post 1: avg_time=15, views=1"
   DB: blog_post_sessions updated with time_on_page=15, exited_at=NOW()
```

## 🎯 Quick Test

**1-Minute Test:**
```bash
# 1. Restart server
npm run dev

# 2. In browser:
#    - Open http://localhost:5173/blog
#    - Click a post
#    - Open DevTools (F12) → Network tab
#    - Wait 10 seconds (don't touch anything)
#    - Look for POST request to /api/track/blog/.../engagement with time_milestone
#    - Go to http://localhost:5173/admin/blog-analytics
#    - Check if time shows ~10s

# 3. In server terminal:
#    - Look for "Tracking event: time_milestone"
#    - Look for "Updating analytics... avg_time=10"
```

## 📝 What to Report if Still Broken

If it's still not working, please provide:

1. **Browser Console Output:**
   - Any errors (red text)
   - Any warnings (yellow text)

2. **Network Tab:**
   - Screenshot of /api/track/blog/.../engagement requests
   - Status codes (200, 400, 500?)
   - Request payload for time_milestone event

3. **Server Logs:**
   - Any "Tracking event" log entries
   - Any "Updating analytics" log entries
   - Any error messages

4. **Database Query Results:**
```sql
SELECT * FROM blog_post_sessions WHERE post_id = 1 ORDER BY entered_at DESC LIMIT 1;
SELECT event_type, event_data FROM blog_engagement_events WHERE post_id = 1 ORDER BY occurred_at DESC LIMIT 5;
SELECT avg_time_on_page FROM blog_post_analytics WHERE post_id = 1;
```

---

**Status:** ✅ Fixes Applied - Restart Required  
**Last Updated:** December 11, 2025 at 18:10
