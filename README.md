# PeakSelf - Full-Stack Analytics Platform

> **A modern, self-hosted analytics and blog platform built with React, Express, and PostgreSQL**

PeakSelf is a comprehensive full-stack web application that combines personal analytics tracking, blog management, user authentication, and advanced engagement metrics into a single, privacy-focused platform. Designed for developers who want complete control over their data with enterprise-grade features.

[![Tests](https://img.shields.io/badge/tests-366%20passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-high-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Database Setup](#-database-setup)
- [Email Verification](#-email-verification-system)
- [Analytics & Tracking](#-analytics--tracking)
- [Performance Optimization](#-performance-optimization)
- [Security](#-security)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### 🔐 Authentication & User Management
- **Local authentication** with email verification system
- **Google OAuth** integration
- **JWT + session-based** authentication
- **Admin role management** with granular permissions
- **User invitation system** for controlled access
- **Soft delete with restore** capability
- **Auto-restore on login** for soft-deleted accounts

### 📊 Dual Analytics System

#### Internal Analytics
- Real-time traffic tracking
- Session monitoring with detailed metrics
- Visitor analytics with source attribution
- Custom dashboard with charts and visualizations
- Performance monitoring via `pg_stat_statements`
- Query optimization insights

#### Google Analytics 4 Integration
- **Consent Mode v2** - GDPR/CCPA compliant
- **Scroll depth tracking** - 25%, 50%, 75%, 90% milestones
- **Time on page** - Accurate engagement metrics
- **Blog engagement** - Read progress, completion tracking
- **Search tracking** - Query terms and results
- **Click tracking** - Button and link interactions
- **Social sharing** - Native share API integration
- **Custom events** - Form submissions, downloads, etc.

### 📝 Blog Management
- Rich content editor
- Draft/published status workflow
- SEO-friendly slug generation
- Image uploads via Supabase
- Full CRUD operations
- Category/tag support
- Blog-specific analytics

### 🛡️ Security Features
- **Helmet** security headers
- **CSRF protection** for all forms
- **Rate limiting** (configurable per endpoint)
- **Input validation** with sanitization
- **Centralized error handling**
- **Frontend error boundary** with logging
- **Secure session management**

### ⚡ Performance Optimizations

#### Frontend
- React code splitting & lazy loading
- Bundle optimization (83KB gzipped)
- Skeleton loading states
- Optimized re-renders with React.memo
- Debounced search and scroll handlers
- Image lazy loading

#### Backend
- Query result caching (node-cache)
- Database connection pooling (max 10)
- Response compression (gzip/brotli)
- 9 performance indexes on critical tables
- Pagination for large datasets
- API response standardization

### 🎨 UI/UX Features
- Responsive design (mobile-first)
- Branded loading screen
- Toast notifications system
- Modal/dialog system
- Dark mode support
- Cookie consent banner
- Accessible components (WCAG 2.1)
- Error boundaries with fallback UI

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library with hooks
- **React Router v6** - Client-side routing
- **Vite** - Build tool and dev server
- **Lucide React** - Modern icon library
- **Custom hooks** - Scroll tracking, time tracking, auth

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **PostgreSQL 12+** - Relational database
- **Passport.js** - Authentication middleware
- **Winston** - Logging framework
- **Jest + Supertest** - Testing suite (366 tests)

### Infrastructure
- **PostgreSQL session store** - Persistent sessions
- **Node-cache** - In-memory caching
- **Supabase** - Image storage (optional)
- **JWT** - Token-based auth
- **Google Analytics 4** - Enhanced analytics (optional)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** 12 or higher
- **npm** or yarn package manager

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd PeakSelf
```

#### 2. Install dependencies
```bash
# Root dependencies
npm install

# Client dependencies
npm install --prefix client

# Server dependencies
npm install --prefix server
```

#### 3. Set up environment variables

Create **`server/.env`**:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/peakself

# Authentication (REQUIRED)
SESSION_SECRET=your-session-secret-min-32-chars
JWT_SECRET=your-jwt-secret-different-from-session

# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
APP_BASE_URL=http://localhost:5000

# Email (optional for development)
# Leave blank to use console logging for verification links
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@peakself.local

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase (optional)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key

# Security
ENABLE_RATE_LIMIT=false  # Set to 'true' in production
```

Create **`client/.env.development`**:
```env
VITE_API_BASE=http://localhost:5173

# Google Analytics 4 (optional)
# Add your GA4 Measurement ID or leave empty to disable
VITE_GA_MEASUREMENT_ID=

# Feature Flags (optional)
VITE_ENABLE_TRACKING=true
VITE_ENABLE_ERROR_REPORTING=false
VITE_LOG_REQUESTS=false
```

> **📝 Note:** Copy from `.env.example` files in both `client/` and `server/` directories for complete templates.

#### 4. Set up the database
```bash
# Create database
createdb peakself

# Run schema
psql peakself < queries.sql

# Optional: Enable pg_stat_statements for performance monitoring
# Add to postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
# Then restart PostgreSQL and run:
psql peakself -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
```

#### 5. Run database migrations
```bash
# Run email verification migration
npm run migrate

# Or run directly
node server/migrations/run_migration.js
```

#### 6. Start the development servers
```bash
# Start both client and server (from root)
npm run dev

# Or start separately:
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

#### 7. Access the application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health check:** http://localhost:5000/api/health

---

## 🏛️ Architecture

```
PeakSelf/
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/               # API client layer
│   │   │   ├── client.js      # Axios configuration
│   │   │   └── endpoints.js   # API endpoint definitions
│   │   ├── components/        # Reusable components
│   │   │   ├── Tracker.jsx    # Analytics tracker
│   │   │   ├── EngagementTracker.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   └── ...
│   │   ├── contexts/          # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useScrollTracking.js
│   │   │   ├── useTimeOnPage.js
│   │   │   └── useAuth.js
│   │   ├── pages/             # Route pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Blog.jsx
│   │   │   ├── Post.jsx
│   │   │   └── ...
│   │   ├── utils/             # Utility functions
│   │   │   ├── analytics.js   # GA4 integration
│   │   │   ├── seo.js         # SEO utilities
│   │   │   └── helpers.js
│   │   ├── config.js          # Centralized configuration
│   │   └── main.jsx           # Entry point
│   ├── vite.config.js         # Vite configuration
│   └── index.html             # HTML template
│
├── server/                    # Backend (Express + PostgreSQL)
│   ├── routes/               # API routes
│   │   ├── admin/            # Admin endpoints
│   │   │   ├── users.js      # User management
│   │   │   ├── dashboard.js  # Dashboard metrics
│   │   │   ├── blog.js       # Blog management
│   │   │   ├── sessions.js   # Session analytics
│   │   │   ├── traffic.js    # Traffic analytics
│   │   │   └── performance.js # Query performance
│   │   ├── auth.js           # Authentication
│   │   ├── track.js          # Analytics tracking
│   │   ├── health.js         # Health checks
│   │   ├── errors.js         # Error logging
│   │   ├── robots.js         # robots.txt
│   │   └── sitemap.js        # sitemap.xml
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # Authentication
│   │   ├── requireAdmin.js   # Admin authorization
│   │   ├── csrf.js           # CSRF protection
│   │   ├── rateLimiter.js    # Rate limiting
│   │   └── errorHandler.js   # Error handling
│   ├── utils/                # Utilities
│   │   ├── logger.js         # Winston logger
│   │   ├── cache.js          # Node-cache wrapper
│   │   ├── db.js             # Database pool
│   │   ├── email.js          # Email sender
│   │   └── response.js       # API response helpers
│   ├── migrations/           # Database migrations
│   │   ├── add_email_verification.js
│   │   ├── add_performance_indexes.js
│   │   └── run_migration.js
│   ├── __tests__/            # Test suite (366 tests)
│   │   ├── routes/           # Route tests
│   │   ├── middleware/       # Middleware tests
│   │   └── utils/            # Utility tests
│   ├── constants.js          # App constants
│   └── index.js              # Server entry point
│
├── queries.sql               # Database schema
├── package.json              # Root package.json
└── README.md                 # This file
```

---

## ⚙️ Configuration

### Centralized Configuration System

All environment-specific settings are managed through `client/src/config.js`, providing a single source of truth.

#### Available Configuration

```javascript
import { 
  IS_DEV, IS_PROD,           // Environment detection
  API_BASE, API_TIMEOUT,     // API configuration
  APP_NAME, APP_VERSION,     // App metadata
  FEATURE_FLAGS,             // Feature toggles
  DEV                        // Development helpers
} from './config';
```

#### Feature Flags

```javascript
FEATURE_FLAGS = {
  enableTracking: true,           // Enable analytics tracking
  enableErrorReporting: false,    // Enable error logging to server
  enablePWA: false,              // Progressive Web App features
  showDebugInfo: IS_DEV          // Show debug information
}
```

#### Development Helpers

```javascript
DEV = {
  logRequests: false,  // Log all API requests to console
  useMockAPI: false    // Use mock data instead of real API
}
```

### Environment Variables

#### Server Environment Variables
See `server/.env.example` for complete template.

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | - |
| `SESSION_SECRET` | ✅ | Session encryption key (32+ chars) | - |
| `JWT_SECRET` | ✅ | JWT signing key | - |
| `NODE_ENV` | ✅ | Environment mode | `development` |
| `PORT` | ❌ | Server port | `5000` |
| `CLIENT_URL` | ❌ | Frontend URL for CORS | `http://localhost:5173` |
| `APP_BASE_URL` | ❌ | Base URL for email links | `http://localhost:5000` |
| `ENABLE_RATE_LIMIT` | ❌ | Enable rate limiting | `false` |
| `SMTP_*` | ❌ | Email configuration | - |
| `GOOGLE_CLIENT_*` | ❌ | Google OAuth credentials | - |
| `SUPABASE_*` | ❌ | Supabase storage credentials | - |

#### Client Environment Variables
See `client/.env.example` for complete template.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE` | API server URL | `http://localhost:5000` |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 tracking ID | (empty - disabled) |
| `VITE_ENABLE_TRACKING` | Enable internal tracking | `true` |
| `VITE_ENABLE_ERROR_REPORTING` | Enable error reporting | `false` |
| `VITE_LOG_REQUESTS` | Log API requests (dev only) | `false` |

---

## 🗄️ Database Setup

### Schema Overview

The database includes 12 core tables:

#### Users & Authentication
- **`users`** - User accounts with soft delete support
- **`pending_registrations`** - Email verification queue
- **`session`** - PostgreSQL session store

#### Analytics
- **`visitors`** - Unique visitor tracking
- **`user_sessions`** - Session tracking with user/visitor association
- **`session_events`** - Page navigation events
- **`traffic_events`** - Traffic source analytics

#### Content
- **`blog_posts`** - Blog content with status, slug, metadata
- **`newsletter_subscriptions`** - Newsletter subscribers

### Performance Indexes

9 optimized indexes are automatically created for common query patterns:

| Index | Table | Columns | Type | Purpose |
|-------|-------|---------|------|---------|
| `idx_traffic_events_source_time` | traffic_events | source, occurred_at DESC | Composite | Traffic by source queries |
| `idx_users_role_verified` | users | role, verified | Composite Partial | User management queries |
| `idx_users_verified` | users | id (WHERE verified) | Partial | Verified user counts |
| `idx_user_sessions_visitor_time` | user_sessions | visitor_id, started_at DESC | Composite | Session history by visitor |
| `idx_user_sessions_user_time` | user_sessions | user_id, started_at DESC | Composite Partial | Session history by user |
| `idx_session_events_session_time` | session_events | session_id, occurred_at DESC | Composite | Page views per session |
| `idx_traffic_events_time` | traffic_events | occurred_at DESC | Simple | Time-range queries |
| `idx_newsletter_email` | newsletter_subscriptions | email | Partial | Email lookups |
| `idx_blog_posts_status_time` | blog_posts | status, created_at DESC | Composite | Published posts listing |

**Performance Impact:**
- Query time reduced by 80-90% on indexed queries
- Before: 50-200ms, After: 5-20ms
- Index size: ~2-5 MB total
- Write overhead: <2%

### Migrations

#### Run All Migrations
```bash
npm run migrate
```

#### Individual Migrations
```bash
# Email verification system
node server/migrations/run_migration.js

# Performance indexes
node server/migrations/run.js add_performance_indexes up

# Rollback indexes
node server/migrations/run.js add_performance_indexes down
```

### Database Monitoring

#### Check Index Usage
```sql
SELECT 
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

#### Query Performance (requires pg_stat_statements)
```sql
SELECT 
  calls, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 📧 Email Verification System

### Overview

The email verification system requires users to verify their email before account activation.

**Flow:**
1. User registers → stored in `pending_registrations` table
2. Verification email sent (or logged to console in dev)
3. User clicks link → account created in `users` table
4. Pending registration deleted
5. User can now login

### Configuration

#### Development Mode (No SMTP)
No configuration needed! Verification links are logged to console:

```
================================================================================
📧 [DEV MODE] Email verification link:
   Email: user@example.com
   Link:  http://localhost:5000/api/auth/verify-email?token=abc123...
================================================================================
```

#### Production Mode (with SMTP)

##### Option 1: Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Generate in Google Account settings
EMAIL_FROM=noreply@peakself.com
```

##### Option 2: Mailtrap (Testing)
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
EMAIL_FROM=noreply@peakself.com
```

##### Option 3: SendGrid (Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Testing

```bash
# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Check console for verification link (dev mode)
# Or check your email inbox (production mode)
```

---

## 📊 Analytics & Tracking

### Dual Analytics System

PeakSelf implements both **internal analytics** (self-hosted) and **Google Analytics 4** (optional) for comprehensive insights.

### Internal Analytics

#### Features
- ✅ Real-time traffic tracking
- ✅ Session monitoring
- ✅ Visitor identification and tracking
- ✅ Traffic source attribution
- ✅ Page view analytics
- ✅ Full data ownership

#### Endpoints
```javascript
// Track page view
POST /api/track/pageview
Body: { path, title, referrer }

// Track custom event
POST /api/track/event
Body: { eventType, metadata }
```

### Google Analytics 4 Integration

#### Features
- ✅ **Consent Mode v2** - GDPR/CCPA compliant
- ✅ **Scroll depth tracking** - 25%, 50%, 75%, 90%
- ✅ **Time on page** - Every 30s + on exit
- ✅ **Blog engagement** - Read progress, completion
- ✅ **Search tracking** - Query terms, result counts
- ✅ **Click tracking** - Button/link interactions
- ✅ **Social sharing** - Share events
- ✅ **Custom dimensions** - User role, verification status

#### Setup

1. **Get GA4 Measurement ID**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Create a GA4 property
   - Get your Measurement ID (`G-XXXXXXXXXX`)

2. **Configure environment**
   ```env
   # client/.env.development
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

3. **Build and run**
   ```bash
   npm run dev
   ```

#### Usage Examples

##### Track Custom Event
```javascript
import { trackEvent } from '../utils/analytics';

trackEvent('button_click', {
  button_name: 'subscribe',
  location: '/home'
});
```

##### Auto-track Clicks
```jsx
<button data-track-click="newsletter_signup">
  Subscribe
</button>
```

##### Track Form Submission
```javascript
import { trackFormSubmit } from '../utils/analytics';

const handleSubmit = async (e) => {
  try {
    await api.submitForm(data);
    trackFormSubmit('contact_form', true);
  } catch (error) {
    trackFormSubmit('contact_form', false);
  }
};
```

##### Track Downloads
```jsx
import { trackDownload } from '../utils/analytics';

<a 
  href="/files/guide.pdf" 
  onClick={() => trackDownload('guide.pdf', 'pdf')}
>
  Download Guide
</a>
```

#### GA4 Events Reference

| Event | Trigger | Parameters |
|-------|---------|------------|
| `page_view` | Page navigation | path, title, location |
| `scroll` | Scroll milestones | percent_scrolled, page_path |
| `time_on_page` | 30s intervals + exit | value (seconds), page_path |
| `click` | Button/link clicks | element_name, element_type, href |
| `search` | Search queries | search_term, results_count |
| `share` | Social sharing | method, content_type, item_id |
| `blog_read_progress` | Reading milestones | post_slug, percent_read |
| `blog_read_complete` | 90%+ read + 10s time | post_slug, read_time_seconds |
| `form_submit` | Form submission | form_name, success |
| `file_download` | Download clicks | file_name, file_extension |

### Cookie Consent

The app includes a GDPR/CCPA compliant cookie consent banner:

- **Default:** Analytics disabled until user accepts
- **Consent Mode v2:** Updates Google Analytics consent state
- **LocalStorage:** Persists user choice
- **Easy customization:** See `SitePrefsBanner.jsx`

---

## ⚡ Performance Optimization

### Frontend Optimizations

#### Bundle Size
- **Production build:** 193.51 kB
- **Gzipped:** 83 kB (61.15 kB with optimizations)
- **Code splitting:** Lazy-loaded routes
- **Tree shaking:** Unused code removed

#### React Optimizations
- `React.memo()` for expensive components
- `useMemo()` and `useCallback()` for computed values
- Lazy loading with `React.lazy()` and `Suspense`
- Debounced event handlers (search, scroll)
- Virtual scrolling for large lists

#### Loading States
- Skeleton screens for better perceived performance
- Branded loading screen on app initialization
- Progressive loading for images
- Optimistic UI updates

### Backend Optimizations

#### Caching Strategy
```javascript
// Query caching with node-cache
cache.get('dashboard_metrics');  // 5-minute TTL
cache.get('blog_posts');         // 10-minute TTL
```

#### Database
- Connection pooling (max 10 connections)
- 9 performance indexes on hot paths
- Pagination for large datasets (100 items/page)
- Query optimization with EXPLAIN ANALYZE

#### Response Compression
- Gzip/Brotli compression enabled
- JSON response size reduced by ~70%
- Static file compression in production

### Performance Monitoring

#### Admin Dashboard
- Query performance metrics (via pg_stat_statements)
- Slow query identification
- Cache hit rates
- Response time tracking

#### Browser DevTools
```javascript
// Performance marks
performance.mark('page-load-start');
performance.mark('page-load-end');
performance.measure('page-load', 'page-load-start', 'page-load-end');
```

---

## 🛡️ Security

### Security Headers (Helmet)

```javascript
// Enabled security headers
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security
X-XSS-Protection
```

### CSRF Protection

- CSRF tokens required for all state-changing operations
- Token validation middleware
- SameSite cookie attributes

### Rate Limiting

Configurable rate limits per endpoint:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Newsletter signup | 3 requests | 15 minutes |
| General API | 100 requests | 15 minutes |

**Configuration:**
```env
ENABLE_RATE_LIMIT=true  # Enable in production
```

### Input Validation

- Server-side validation for all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized inputs)
- Email format validation

### Session Security

- **Secure cookies** in production (HTTPS only)
- **HttpOnly flag** prevents JavaScript access
- **SameSite=Strict** prevents CSRF
- **Session rotation** on privilege escalation
- **PostgreSQL session store** for persistence

### Password Security

- **bcrypt hashing** with salt rounds
- **Minimum complexity requirements**
- **No password stored in logs**

---

## 🧪 Testing

### Test Suite

**366 tests** across **19 test suites** with comprehensive coverage.

#### Test Structure
```
server/__tests__/
├── routes/
│   ├── admin/
│   │   ├── users.test.js
│   │   ├── dashboard.test.js
│   │   ├── blog.test.js
│   │   ├── sessions.test.js
│   │   ├── traffic.test.js
│   │   └── performance.test.js
│   ├── auth.test.js
│   ├── track.test.js
│   ├── health.test.js
│   ├── robots.test.js
│   └── sitemap.test.js
├── middleware/
│   ├── auth.test.js
│   ├── requireAdmin.test.js
│   ├── csrf.test.js
│   ├── rateLimiter.test.js
│   └── errorHandler.test.js
└── utils/
    ├── db.test.js
    ├── logger.test.js
    ├── cache.test.js
    └── response.test.js
```

### Running Tests

```bash
# All tests
npm --prefix server test

# Watch mode (reruns on file changes)
npm --prefix server test:watch

# Coverage report
npm --prefix server test:coverage

# Specific test file
npm --prefix server test -- routes/auth.test.js
```

### Test Coverage

| Category | Coverage |
|----------|----------|
| Routes | 95%+ |
| Middleware | 90%+ |
| Utilities | 85%+ |
| Integration | 80%+ |

### Writing Tests

```javascript
// Example test structure
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('verification');
  });
});
```

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production:  https://your-domain.com/api
```

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response: 200 OK
{
  "message": "Registration initiated. Please check your email to verify your account.",
  "email": "user@example.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "verified": true
  },
  "token": "jwt-token"
}
```

#### Logout
```http
POST /api/auth/logout

Response: 200 OK
{
  "message": "Logout successful"
}
```

#### Get Current User
```http
GET /api/auth/me

Response: 200 OK
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "verified": true
  }
}
```

#### Verify Email
```http
GET /api/auth/verify-email?token=abc123...

Response: 302 Redirect to /login
```

### Admin Endpoints

> **Note:** All admin endpoints require authentication + admin role.

#### Dashboard Overview
```http
GET /api/admin/overview

Response: 200 OK
{
  "users": { "total": 150, "verified": 120, "newToday": 5 },
  "sessions": { "total": 1250, "activeToday": 45 },
  "traffic": { ... },
  "blog": { ... }
}
```

#### List Users
```http
GET /api/admin/users?page=1&limit=50

Response: 200 OK
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### Make Admin
```http
POST /api/admin/users/:userId/make-admin

Response: 200 OK
{
  "message": "User promoted to admin"
}
```

#### Delete User (Soft Delete)
```http
DELETE /api/admin/users/:userId

Response: 200 OK
{
  "message": "User deleted successfully"
}
```

#### Restore User
```http
POST /api/admin/users/:userId/restore

Response: 200 OK
{
  "message": "User restored successfully"
}
```

#### Blog Posts (Admin)
```http
GET /api/admin/blog
POST /api/admin/blog
PUT /api/admin/blog/:id
DELETE /api/admin/blog/:id
```

#### Analytics - Sessions
```http
GET /api/admin/sessions?startDate=2025-01-01&endDate=2025-01-31

Response: 200 OK
{
  "sessions": [...],
  "summary": {
    "totalSessions": 1250,
    "uniqueVisitors": 850,
    "avgDuration": 180
  }
}
```

#### Analytics - Traffic
```http
GET /api/admin/traffic/summary?days=7

Response: 200 OK
{
  "sources": {
    "instagram": 450,
    "google": 320,
    "direct": 280
  },
  "totalEvents": 1050
}
```

#### Performance Metrics
```http
GET /api/admin/performance/summary

Response: 200 OK
{
  "slowQueries": [...],
  "cacheStats": { "hits": 1250, "misses": 180 },
  "dbPool": { "total": 10, "idle": 7, "active": 3 }
}
```

### Health Checks

#### Full Health Check
```http
GET /api/health

Response: 200 OK
{
  "status": "healthy",
  "uptime": 86400,
  "database": "connected",
  "cache": "operational",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Readiness Probe
```http
GET /api/health/ready

Response: 200 OK (or 503 Service Unavailable)
```

#### Liveness Probe
```http
GET /api/health/live

Response: 200 OK
```

### Analytics Tracking

#### Page View
```http
POST /api/track/pageview
Content-Type: application/json

{
  "path": "/blog/my-post",
  "title": "My Blog Post",
  "referrer": "https://google.com"
}

Response: 200 OK
```

#### Custom Event
```http
POST /api/track/event
Content-Type: application/json

{
  "eventType": "button_click",
  "eventData": {
    "button": "subscribe",
    "location": "/home"
  }
}

Response: 200 OK
```

### SEO Endpoints

#### Sitemap
```http
GET /sitemap.xml

Response: 200 OK (XML)
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://your-domain.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

#### Robots.txt
```http
GET /robots.txt

Response: 200 OK (text/plain)
User-agent: *
Allow: /
Sitemap: https://your-domain.com/sitemap.xml
```

### Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "details": "Additional details (dev mode only)"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong secrets (32+ characters, cryptographically random)
- [ ] Enable rate limiting (`ENABLE_RATE_LIMIT=true`)
- [ ] Configure SMTP for emails (SendGrid, AWS SES, etc.)
- [ ] Set up SSL/TLS certificates
- [ ] Configure PostgreSQL connection pooling
- [ ] Set up automated database backups
- [ ] Configure Winston logging (file rotation)
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Enable `pg_stat_statements` for query monitoring
- [ ] Set secure cookie settings
- [ ] Configure CORS with production domains
- [ ] Set up PM2 or similar process manager
- [ ] Configure reverse proxy (Nginx/Apache)
- [ ] Set up monitoring (Uptime Robot, DataDog, etc.)

### Build for Production

#### Build Frontend
```bash
cd client
npm run build
# Outputs to client/dist/
```

#### Serve Static Files

Option 1: **Separate static file server (recommended)**
```nginx
# Nginx configuration
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/peakself/client/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Option 2: **Serve from Express**
```javascript
// server/index.js
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

#### Start Server with PM2
```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server/index.js --name peakself

# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup
```

### Environment-Specific Settings

#### Production .env
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/peakself
SESSION_SECRET=<64-char-random-string>
JWT_SECRET=<64-char-random-string>
CLIENT_URL=https://yourdomain.com
APP_BASE_URL=https://yourdomain.com
ENABLE_RATE_LIMIT=true

# Production SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com
```

#### Production Client .env
```env
VITE_API_BASE=https://yourdomain.com
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_TRACKING=true
VITE_ENABLE_ERROR_REPORTING=true
```

### Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/peakself"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres peakself | gzip > "$BACKUP_DIR/peakself_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "peakself_*.sql.gz" -mtime +30 -delete
```

### Monitoring

#### Health Check Monitoring
```bash
# Basic uptime check
*/5 * * * * curl -f http://localhost:5000/api/health/ready || echo "Server down!" | mail -s "Alert" admin@example.com
```

#### Log Monitoring
```javascript
// Winston configuration for production
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});
```

---

## 🐛 Troubleshooting

### Database Connection Issues

**Problem:** `Database connection failed`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   # or
   sudo systemctl status postgresql
   ```

2. Check DATABASE_URL format:
   ```
   postgresql://username:password@hostname:port/database
   ```

3. Ensure database exists:
   ```bash
   psql -l | grep peakself
   ```

4. Test connection:
   ```bash
   psql "postgresql://user:pass@host:5432/peakself"
   ```

5. Check connection pooling (max 10 connections):
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

### Session Issues

**Problem:** `Session not persisting`

**Solutions:**
1. Verify `session` table exists:
   ```sql
   \dt session
   ```

2. Check SESSION_SECRET is set (32+ characters)
3. In production, ensure `secure: true` with HTTPS
4. Clear cookies and retry
5. Check session store connection:
   ```javascript
   // Should see "Session store connected" in logs
   ```

### Rate Limiting

**Problem:** `Too Many Requests (429)`

**Solutions:**
1. In development, set `ENABLE_RATE_LIMIT=false`
2. Check rate limit constants:
   - Auth: 5 requests / 15 min
   - Subscribe: 3 requests / 15 min
   - API: 100 requests / 15 min
3. Wait for the time window to expire
4. For testing, disable temporarily

### Build Issues

**Problem:** `Module not found` or build errors

**Solutions:**
1. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules client/node_modules server/node_modules
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Clear build cache:
   ```bash
   rm -rf client/dist client/node_modules/.vite
   ```

3. Check Node.js version (18+ required):
   ```bash
   node --version
   ```

4. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

### Email Not Sending

**Problem:** Verification emails not received

**Solutions:**
1. **Development mode:** Check server logs/console for verification link
2. **Gmail:** Use App Passwords (not regular password)
3. **Check spam/junk** folder
4. **Verify SMTP config** in `.env`:
   ```bash
   echo $SMTP_HOST $SMTP_USER
   ```
5. **Test SMTP connection:**
   ```bash
   node -e "require('./server/utils/email').sendVerificationEmail('test@example.com', 'testtoken')"
   ```

### Frontend Not Loading

**Problem:** Blank page or white screen

**Solutions:**
1. Check browser console for errors
2. Verify Vite dev server is running (port 5173)
3. Check `VITE_API_BASE` in `.env.development`
4. Clear browser cache
5. Restart dev server

### Authentication Issues

**Problem:** Login not working

**Solutions:**
1. **Verify email first** - check for verification email/link
2. **Check credentials** - correct email and password
3. **Check user exists:**
   ```sql
   SELECT * FROM users WHERE email = 'your@email.com';
   ```
4. **Soft-deleted users:** Auto-restored on login attempt
5. **Clear cookies** and try again

### Performance Issues

**Problem:** Slow queries or page loads

**Solutions:**
1. **Enable pg_stat_statements:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **Check slow queries:**
   ```sql
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Verify indexes are used:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
   -- Should show "Index Scan"
   ```

4. **Check cache stats** in admin dashboard
5. **Monitor bundle size** - should be ~83KB gzipped

### CORS Errors

**Problem:** `Blocked by CORS policy`

**Solutions:**
1. Check `CLIENT_URL` in server `.env`:
   ```env
   CLIENT_URL=http://localhost:5173
   ```

2. Verify CORS middleware configuration
3. In production, set correct domain
4. Check browser DevTools → Network tab for details

---

## 📝 Scripts

### Root Scripts
```bash
npm run dev              # Start both client and server concurrently
npm run dev:client       # Start only frontend (Vite)
npm run dev:server       # Start only backend (Express)
npm run build            # Build client for production
npm run preview          # Preview production build locally
npm run migrate          # Run database migrations
```

### Client Scripts
```bash
cd client
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint (if configured)
```

### Server Scripts
```bash
cd server
npm start                # Start server (production)
npm run dev              # Start server with nodemon (dev)
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Database Scripts
```bash
# Create database
createdb peakself

# Run schema
psql peakself < queries.sql

# Run migrations
node server/migrations/run_migration.js

# Backup database
pg_dump peakself > backup.sql

# Restore database
psql peakself < backup.sql
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Getting Started

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/PeakSelf.git
   cd PeakSelf
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Development Workflow

1. **Make your changes**
2. **Add/update tests** for your changes
3. **Ensure all tests pass:**
   ```bash
   npm --prefix server test
   ```
4. **Verify build succeeds:**
   ```bash
   npm run build
   ```
5. **Commit your changes:**
   ```bash
   git commit -m "feat: add new feature"
   ```
6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a pull request**

### Code Style

- **JavaScript:** Use ES6+ features
- **Indentation:** 2 spaces
- **Naming:** camelCase for variables/functions, PascalCase for components
- **Comments:** Document complex logic
- **Testing:** Maintain >80% coverage

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: code cleanup
perf: performance improvement
```

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with **React**, **Express**, and **PostgreSQL**
- Icons by **Lucide React**
- Analytics inspired by modern platforms like Plausible and Fathom
- Testing framework: **Jest** and **Supertest**
- Logging: **Winston**
- Authentication: **Passport.js**

---

## 📞 Support

### Getting Help

- **GitHub Issues:** [Open an issue](https://github.com/your-username/PeakSelf/issues)
- **Documentation:** This README and linked docs
- **Logs:** Check `server/logs/` for error details

### Useful Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/)
- [Google Analytics 4](https://developers.google.com/analytics/devguides/collection/ga4)

---

## 📚 Additional Documentation

This README consolidates information from the following documentation files:

### Setup & Configuration
- **QUICK_START.md** - Email verification quick start
- **ENVIRONMENT_CONFIG.md** - Environment variable system
- **EMAIL_SETUP_GUIDE.md** - Email configuration guide
- **DATABASE_INDEXES.md** - Database optimization details

### Analytics
- **GA4_IMPLEMENTATION_SUMMARY.md** - Google Analytics 4 setup
- **GOOGLE_ANALYTICS_SETUP.md** - GA4 detailed guide
- **QUICK_START_GA4.md** - GA4 quick setup
- **BLOG_ENGAGEMENT_TRACKING.md** - Blog analytics
- **BLOG_TIME_TRACKING_SETUP.md** - Time tracking
- **SETUP_BLOG_ANALYTICS.md** - Blog analytics setup
- **TRACKING_CHANGES.md** - Tracking system changes

### Features
- **SOFT_DELETE.md** - Soft delete system
- **SOFT_DELETE_EXPLAINED.md** - Detailed explanation
- **SOFT_DELETE_FAQ.md** - Common questions
- **SOFT_DELETE_QUICKREF.md** - Quick reference
- **SOFT_DELETE_AUTH_TESTING.md** - Auth testing
- **AUTO_RESTORE_ON_LOGIN.md** - Auto-restore feature
- **DELETED_USERS_TAB.md** - Deleted users management
- **TAGS_SETUP.md** - Tag system
- **COOKIE_CONSENT_TRACKING_FIX_V2.md** - Cookie consent

### Performance
- **OPTIMIZATION_SUMMARY.md** - Optimization overview
- **OPTIMIZATION_ROUND_2.md** - Advanced optimizations
- **REACT_PERFORMANCE_OPTIMIZATION.md** - React optimizations
- **PERFORMANCE_PAGINATION_UPDATE.md** - Pagination
- **SKELETON_LOADING_STATES.md** - Loading states

### Implementation Details
- **IMPLEMENTATION_SUMMARY.md** - Email verification implementation
- **API_LAYER_SUMMARY.md** - API architecture
- **SCHEMA_UPDATED.md** - Database schema updates
- **RATE_LIMIT_UPDATE.md** - Rate limiting
- **ERROR_BOUNDARY.md** - Error handling
- **BRANDED_LOADING_SCREEN.md** - Loading screen

### Testing
- **server/__tests__/README.md** - Test documentation
- **server/__tests__/TEST_SUMMARY.md** - Test summary
- **server/__tests__/TEST_IMPLEMENTATION_GUIDE.md** - Testing guide
- **server/__tests__/MISSING_TESTS.md** - Test coverage gaps

### Organization
- **ORGANIZATION_RECOMMENDATIONS.md** - Project organization

---

## 📊 Project Status

**Current Status:** 76% complete (29/38 tasks) | 366 tests passing ✅

### Recent Updates

- ✅ Email verification system
- ✅ Google Analytics 4 integration
- ✅ Soft delete functionality
- ✅ Performance optimizations
- ✅ Database indexes
- ✅ Cookie consent (Consent Mode v2)
- ✅ Blog engagement tracking
- ✅ Admin dashboard
- ✅ SEO improvements (sitemap, robots.txt, meta tags)

### Roadmap

See [TODO.txt](./TODO.txt) for detailed development progress and upcoming features.

---

**Built with ❤️ for developers who value privacy, performance, and control**

---

*Last updated: 2025-11-28*
