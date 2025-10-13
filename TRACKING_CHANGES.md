# Tracking System Changes

## Summary
This document summarizes the changes made to remove the `current_source` logic and add Facebook as a tracked source.

## Changes Made

### 1. Removed Current Source Logic
**Files Modified:**
- `server/routes/track.js`
- `server/routes/admin.js`
- `client/src/components/AdminSessions.jsx`

**What Changed:**
- Removed all references to `current_source`, `current_referrer`, and `current_landing_path`
- Renamed `first_source` → `source` throughout the codebase
- Renamed `first_referrer` → `referrer` throughout the codebase
- Renamed `first_landing_path` → `landing_path` throughout the codebase
- Simplified cookie management:
  - Removed `ps_src_first` and `ps_src_curr` cookies
  - Now only uses `ps_src` cookie to track visitor source
- Database columns in `visitors` table now simplified:
  - `source` (was `first_source`)
  - `referrer` (was `first_referrer`)
  - `landing_path` (was `first_landing_path`)

### 2. Added Facebook Traffic Source
**Files Modified:**
- `server/routes/track.js` - Added Facebook detection
- `server/routes/admin.js` - Added Facebook to all traffic queries
- `client/src/components/AdminTraffic.jsx` - Added Facebook card and logo

**Detection Logic:**
Facebook traffic is detected when:
- URL parameter includes `facebook` or `fb` (e.g., `?src=facebook`)
- HTTP referrer contains `facebook.com` or `fb.com`

**Supported URL Formats:**
```
?src=facebook
?src=fb
?source=facebook
?utm_source=facebook
```

### 3. UI Improvements
**Files Modified:**
- `client/src/components/AdminTraffic.jsx`

**Changes:**
- Redesigned Facebook logo (rounded square with white 'f')
- Reduced font weight of card labels from 700 to 500 for better readability
- Added Facebook card to traffic overview dashboard

## Database Migration

Run the migration script to update your database:
```bash
psql -U your_user -d your_database -f server/migrations/remove_current_source.sql
```

**Migration Actions:**
1. Renames columns in `visitors` table
2. Drops `current_source` and `current_referrer` columns
3. Adds `traffic_facebook` column to dashboard snapshot table

## Traffic Sources Now Tracked
1. **Instagram** - `?src=instagram`
2. **Facebook** - `?src=facebook` or `?src=fb`
3. **YouTube** - `?src=youtube`
4. **Google** - `?src=google`
5. **Other** - Everything else

## Testing

To test different sources:

1. **Clear cookies** or use incognito mode
2. Visit with source parameter:
   - Instagram: `http://localhost:5173/?src=instagram`
   - Facebook: `http://localhost:5173/?src=facebook`
   - YouTube: `http://localhost:5173/?src=youtube`
   - Google: `http://localhost:5173/?src=google`
3. Check admin dashboard at `/admin/traffic`

## Cookie Management

**Active Cookies:**
- `ps_vid` - Visitor ID (30 days)
- `ps_sid` - Session ID (30 minutes, sliding window)
- `ps_src` - Source (30 days, never overwritten)

**Removed Cookies:**
- `ps_src_first` ❌
- `ps_src_curr` ❌

## Breaking Changes

⚠️ **Database Schema Changes Required**

The `visitors` table structure has changed. You **must** run the migration script to:
- Rename columns
- Drop obsolete columns
- Add new columns for dashboard snapshots

⚠️ **Cookie Names Changed**

Old cookies (`ps_src_first`, `ps_src_curr`) will be ignored. Existing visitors will be treated as new visitors until migration is complete.

## Benefits

✅ **Simpler Logic** - No more "first vs current" confusion
✅ **Cleaner Code** - Removed 50+ lines of unnecessary logic
✅ **Better UX** - Clearer labels and better Facebook logo
✅ **More Sources** - Facebook now tracked alongside Instagram, YouTube, and Google
✅ **Easier to Maintain** - Single source of truth for visitor source
