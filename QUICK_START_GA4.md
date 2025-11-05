# Quick Start: Google Analytics 4

Get GA4 tracking up and running in 5 minutes.

## Step 1: Get Your Measurement ID (2 min)

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property (or use existing)
3. Admin → Data Streams → Web Stream
4. Copy your **Measurement ID** (looks like `G-XXXXXXXXXX`)

## Step 2: Configure Environment (1 min)

Create or edit `client/.env.development`:

```bash
VITE_API_BASE=http://localhost:5000
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Paste your ID here
```

For production, create `client/.env.production` with the same content.

## Step 3: Build & Run (2 min)

```bash
# Install dependencies (if not done)
npm install --prefix client

# Start development server
npm run dev
```

## Step 4: Verify It's Working

1. Open your site: http://localhost:5173
2. Open browser DevTools → Console
3. Look for: `GA_MEASUREMENT_ID: Set` and `GA_ENABLED: true`
4. Accept the cookie banner
5. Navigate around the site

### Check Events in Real-Time

**Option A: Browser Network Tab**
- DevTools → Network
- Filter by "google-analytics" or "collect"
- You should see requests being sent

**Option B: GA4 DebugView (Recommended)**
1. Add `?debug_mode=true` to your URL
2. Open Google Analytics console
3. Go to Admin → DebugView
4. See events appear in real-time as you interact with the site

## What Gets Tracked Automatically

✅ **Page views** - Every navigation  
✅ **Scroll depth** - 25%, 50%, 75%, 90% milestones  
✅ **Time on page** - Reports every 30 seconds  
✅ **Outbound links** - External link clicks  
✅ **Blog engagement** - Read progress, completion, shares  
✅ **Search queries** - What users search for  

## Disable GA4

Just remove or leave empty the `VITE_GA_MEASUREMENT_ID` variable:

```bash
VITE_GA_MEASUREMENT_ID=
```

Rebuild and GA4 will be completely disabled. Your internal analytics will still work.

## Common Issues

### "GA not tracking"
- ✅ Check you set `VITE_GA_MEASUREMENT_ID`
- ✅ Rebuild after changing `.env` file (`npm run dev` again)
- ✅ Accept the cookie consent banner
- ✅ Check browser console for errors

### "Events not in GA4 console"
- It takes 24-48 hours for reports
- Use **DebugView** for real-time monitoring (see Step 4)

### "Already using a different GA ID in production"
Create separate `.env` files:
- `client/.env.development` for dev
- `client/.env.production` for prod

---

**Need more details?** See [GOOGLE_ANALYTICS_SETUP.md](./GOOGLE_ANALYTICS_SETUP.md)

**Want to know what changed?** See [GA4_IMPLEMENTATION_SUMMARY.md](./GA4_IMPLEMENTATION_SUMMARY.md)
