# Environment Configuration System

## Overview
Implemented a centralized configuration system to manage environment-specific settings, replacing scattered `import.meta.env` usage throughout the application.

## Files Created

### 1. **config.js** - Centralized Configuration
**Location:** `client/src/config.js`

Single source of truth for all environment variables and app configuration.

**Exports:**
```js
// Environment detection (auto-detected by Vite)
IS_DEV, IS_PROD, IS_TEST

// API Configuration  
API_BASE, API_TIMEOUT

// App Configuration
APP_NAME, APP_VERSION

// Feature Flags
FEATURE_FLAGS {
  enableTracking,
  enableErrorReporting,
  enablePWA,
  showDebugInfo
}

// External Services
SERVICES { /* for future use */ }

// Development Helpers
DEV {
  logRequests,
  useMockAPI
}
```

**Usage:**
```js
// Instead of this:
const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Use this:
import { API_BASE } from '../config';
```

---

### 2. **.env.example** - Environment Template
**Location:** `client/.env.example`

Template showing all available environment variables. **Copy to `.env` for your local setup.**

**Setup:**
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values
# .env is gitignored, so your local config is safe
```

**Key Variables:**
- `VITE_API_BASE` - API URL (dev: localhost:5000, prod: your domain)
- `VITE_ENABLE_TRACKING` - Enable/disable analytics
- `VITE_ENABLE_ERROR_REPORTING` - Enable/disable error reporting
- `VITE_LOG_REQUESTS` - Log API requests (dev only)

---

## Files Updated

### 1. **Tracker.jsx**
**Before:**
```js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
```

**After:**
```js
import { API_BASE } from '../config';
```

---

### 2. **api/client.js**
**Before:**
```js
const config = {
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:5000',
  timeout: 30000,
  ...
};
```

**After:**
```js
import { API_BASE, API_TIMEOUT } from '../config';

const config = {
  baseURL: API_BASE,
  timeout: API_TIMEOUT,
  ...
};
```

---

## Benefits

### 1. **Single Source of Truth**
- All environment variables defined in one place
- Easy to see all available config options
- Reduces duplication and magic strings

### 2. **Better Defaults**
- Fallback values centralized in config.js
- No need to repeat `|| 'default'` everywhere
- Consistent defaults across the app

### 3. **Type Safety** (Future)
- Easy to add TypeScript types to config
- Can validate environment variables on startup
- Better IDE autocomplete

### 4. **Feature Flags**
- Built-in support for toggling features
- Easy A/B testing and gradual rollouts
- Can disable features in specific environments

### 5. **Environment Detection**
- Simple `IS_DEV`, `IS_PROD`, `IS_TEST` flags
- No need to check `import.meta.env.MODE` everywhere
- Frozen in production to prevent mutations

---

## Usage Examples

### Basic Import
```js
import { API_BASE, IS_DEV } from '../config';

if (IS_DEV) {
  console.log('API Base:', API_BASE);
}
```

### Feature Flags
```js
import { FEATURE_FLAGS } from '../config';

// Conditional tracking
if (FEATURE_FLAGS.enableTracking) {
  trackPageView();
}

// Conditional error reporting
if (FEATURE_FLAGS.enableErrorReporting) {
  Sentry.captureException(error);
}
```

### Development Helpers
```js
import { DEV } from '../config';

// Log API requests in development
if (DEV.logRequests) {
  console.log('API Request:', url, options);
}

// Use mock data
if (DEV.useMockAPI) {
  return mockData;
}
```

### Default Export
```js
import config from '../config';

console.log(config.APP_NAME); // 'PeakSelf'
console.log(config.IS_PROD);  // true/false
```

---

## Environment Variable Naming

### Vite Prefix
All custom env vars must start with `VITE_` to be exposed to the client:
- ✅ `VITE_API_BASE`
- ✅ `VITE_ENABLE_TRACKING`
- ❌ `API_BASE` (won't work, no VITE_ prefix)

### Naming Convention
```
VITE_<CATEGORY>_<NAME>

Examples:
VITE_API_BASE
VITE_ENABLE_TRACKING
VITE_SENTRY_DSN
VITE_ANALYTICS_ID
```

---

## How It Works

### Environment Detection
Vite automatically sets `MODE` based on the command:
- `npm run dev` → `MODE=development` → `IS_DEV=true`
- `npm run build` → `MODE=production` → `IS_PROD=true`
- `npm run test` → `MODE=test` → `IS_TEST=true`

### Configuration Priority
1. `.env` (your local file, gitignored)
2. Defaults in `config.js`

**Example:**
```bash
# .env (create this file locally)
VITE_API_BASE=http://192.168.1.100:5000
VITE_LOG_REQUESTS=true
```

The config.js will use your `.env` values, or fall back to defaults if not set.

---

## Production Deployment

### Setup
1. Create `.env` on your production server with production values:
```bash
VITE_API_BASE=https://api.peakself.com
VITE_ENABLE_TRACKING=true
VITE_ENABLE_ERROR_REPORTING=true
```

2. Build the app:
```bash
npm run build
# Vite will use your .env file + production mode
```

### Verify
Vite will automatically use `MODE=production` when building, so:
- `IS_PROD=true`
- `IS_DEV=false`
- Plus any variables from your `.env` file

---

## Adding New Config

### 1. Add to .env
```bash
# .env
VITE_NEW_FEATURE=true
```

### 2. Add to config.js
```js
export const FEATURE_FLAGS = {
  // ...existing flags
  newFeature: import.meta.env.VITE_NEW_FEATURE === 'true',
};
```

### 3. Use in app
```js
import { FEATURE_FLAGS } from '../config';

if (FEATURE_FLAGS.newFeature) {
  // New feature code
}
```

---

## Security Considerations

### ⚠️ Never Store Secrets
- Environment variables are embedded in client bundle
- Visible in browser DevTools and source code
- Only use for **public** configuration

### ✅ Safe to Include
- API base URLs
- Feature flags
- App version
- Public analytics IDs

### ❌ Never Include
- API keys (use backend instead)
- Database credentials
- Private tokens
- User passwords

---

## Testing

### Build Verification
```bash
npm run build
# ✓ built in 6.99s
# Bundle: 193.51 kB (gzipped: 61.15 kB)
```

### Check Active Config
```bash
# Development
npm run dev
# Uses .env.development

# Production
npm run build
# Uses .env.production
```

---

## Future Enhancements

### 1. Environment Variable Validation
```js
// Validate required vars on startup
if (!API_BASE) {
  throw new Error('VITE_API_BASE is required');
}
```

### 2. TypeScript Types
```ts
interface Config {
  IS_DEV: boolean;
  IS_PROD: boolean;
  API_BASE: string;
  // ...
}
```

### 3. Runtime Config
```js
// Fetch config from server for dynamic updates
fetch('/api/config').then(serverConfig => {
  Object.assign(config, serverConfig);
});
```

---

## Summary

**Files Created:** 2 (config.js, .env.example)  
**Files Updated:** 2 (Tracker.jsx, api/client.js)  
**Build Status:** ✅ Verified (5.58s, 61.14 kB gzipped)  
**Configuration:** Simple, centralized, and maintainable  

**How to use:**
1. Copy `.env.example` to `.env`
2. Update values in `.env` for your environment
3. Vite automatically detects dev/prod mode
4. Config.js provides clean imports throughout the app

All environment-specific settings now live in one place!
