# PeakSelf - Analytics Platform

> **A modern, self-hosted analytics and blog platform built with React, Express, and PostgreSQL**

PeakSelf is a full-stack web application that combines personal analytics tracking, blog management, and user authentication into a single platform. Designed for developers who want complete control over their data.

## ✨ Features

### 🔐 Authentication & User Management
- Local authentication with email verification
- Google OAuth integration
- JWT and session-based auth
- Admin role management
- User invitation system
- Soft delete with restore capability

### 📊 Analytics & Tracking
- Real-time traffic tracking
- Session monitoring
- Visitor analytics with source attribution
- Dashboard with metrics and charts
- Performance monitoring (pg_stat_statements)
- Query optimization insights

### 📝 Blog Management
- Rich content editor
- Draft/published status
- Slug generation
- Image uploads (Supabase integration)
- Full CRUD operations

### 🛡️ Security Features
- Helmet security headers
- CSRF protection
- Rate limiting (configurable)
- Input validation
- Centralized error handling
- Frontend error boundary with logging

### ⚡ Performance
- React code splitting & lazy loading
- Bundle optimization (83KB gzipped)
- Query result caching (node-cache)
- Database connection pooling
- Response compression (gzip)
- API response standardization

### 🎨 UI/UX
- Responsive design
- Loading skeletons
- Error boundaries
- Toast notifications
- Modal system
- Dark mode support

## 🏗️ Architecture

```
PeakSelf/
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/          # API client layer
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Route pages
│   │   ├── utils/        # Utility functions
│   │   └── main.jsx      # Entry point
│   └── vite.config.js    # Vite configuration
│
├── server/               # Backend (Express + PostgreSQL)
│   ├── routes/          # API routes
│   │   ├── admin/       # Admin endpoints
│   │   ├── auth.js      # Authentication
│   │   ├── track.js     # Analytics tracking
│   │   ├── health.js    # Health checks
│   │   └── errors.js    # Error logging
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utilities (logger, cache, db)
│   ├── migrations/      # Database migrations
│   └── __tests__/       # Test suite (366 tests)
│
└── queries.sql          # Database schema
```

### Tech Stack

**Frontend:**
- React 18
- React Router v6
- Vite (build tool)
- Lucide React (icons)

**Backend:**
- Node.js + Express 5
- PostgreSQL
- Passport.js (auth)
- Winston (logging)
- Jest (testing)

**Infrastructure:**
- PostgreSQL session store
- Node-cache for query caching
- Supabase for image storage
- JWT + sessions for auth

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PeakSelf
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Client dependencies
   npm install --prefix client
   
   # Server dependencies
   npm install --prefix server
   ```

3. **Set up environment variables**
   
   Create `server/.env`:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/peakself
   
   # Authentication
   SESSION_SECRET=your-session-secret-min-32-chars
   JWT_SECRET=your-jwt-secret-different-from-session
   
   # Server
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:5173
   APP_BASE_URL=http://localhost:5000
   
   # Email (optional for development)
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
   
   Create `client/.env.development`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb peakself
   
   # Run schema
   psql peakself < queries.sql
   
   # Optional: Enable pg_stat_statements for performance monitoring
   # Add to postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
   # Then restart PostgreSQL and run:
   # psql peakself -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
   ```

5. **Start the development servers**
   ```bash
   # Start both client and server (from root)
   npm run dev
   
   # Or start separately:
   # Terminal 1 - Server
   npm run dev:server
   
   # Terminal 2 - Client
   npm run dev:client
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Health check: http://localhost:5000/api/health

## 📚 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `SESSION_SECRET` | Session encryption key (32+ chars) | `your-secure-random-string-here` |
| `JWT_SECRET` | JWT signing key (different from session) | `your-jwt-secret-key` |
| `NODE_ENV` | Environment (`development`/`production`/`test`) | `development` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|--------|
| `PORT` | Server port | `5000` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ENABLE_RATE_LIMIT` | Enable rate limiting | `false` |
| `SMTP_*` | Email configuration | - |
| `GOOGLE_CLIENT_*` | Google OAuth | - |
| `SUPABASE_*` | Image storage | - |

See `server/.env.example` for a complete template.

## 🗄️ Database Setup

### Schema

The database schema includes:
- `users` - User accounts with soft delete
- `pending_registrations` - Email verification queue
- `visitors` - Analytics visitor tracking
- `user_sessions` - Session tracking
- `session_events` - Navigation events
- `traffic_events` - Traffic analytics
- `blog_posts` - Blog content
- `newsletter_subscriptions` - Newsletter subscribers
- `session` - PostgreSQL session store

### Migrations

Database schema is defined in `queries.sql`. For production, consider using a migration tool.

### Indexes

9 performance indexes are automatically created:
- Traffic source/time composite indexes
- User role/verified indexes
- Session tracking indexes
- Blog post status indexes

## 🧪 Testing

### Run Tests

```bash
# All backend tests (366 tests)
npm --prefix server test

# Watch mode
npm --prefix server test:watch

# Coverage report
npm --prefix server test:coverage
```

### Test Coverage

- **19 test suites** covering:
  - Authentication & authorization
  - Admin routes (users, dashboard, blog, sessions, traffic, performance)
  - Middleware (auth, CSRF, rate limiting, error handling)
  - Utilities (database, logger, cache, response helpers)
  - Integration tests with supertest

## 📡 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
Body: { email, password, name }

# Login
POST /api/auth/login
Body: { email, password }

# Logout
POST /api/auth/logout

# Get current user
GET /api/auth/me

# Verify email
GET /api/auth/verify-email?token=xxx
```

### Admin Endpoints (Require Admin Role)

```bash
# Dashboard
GET /api/admin/overview

# Users
GET /api/admin/users
POST /api/admin/users/:id/make-admin
DELETE /api/admin/users/:id
POST /api/admin/users/:id/restore

# Blog
GET /api/admin/blog
POST /api/admin/blog
PUT /api/admin/blog/:id
DELETE /api/admin/blog/:id

# Analytics
GET /api/admin/sessions
GET /api/admin/traffic/summary
GET /api/admin/traffic/events

# Performance
GET /api/admin/performance/summary
GET /api/admin/performance/queries
```

### Health Checks

```bash
# Full health check
GET /api/health

# Readiness probe (for Kubernetes)
GET /api/health/ready

# Liveness probe
GET /api/health/live
```

See individual route files in `server/routes/` for detailed documentation.

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong secrets (32+ characters)
- [ ] Enable rate limiting (`ENABLE_RATE_LIMIT=true`)
- [ ] Configure SMTP for emails
- [ ] Set up SSL/TLS
- [ ] Configure PostgreSQL connection pooling
- [ ] Set up database backups
- [ ] Configure logging (Winston)
- [ ] Set up error monitoring
- [ ] Enable pg_stat_statements for query monitoring

### Build for Production

```bash
# Build frontend
npm --prefix client run build

# The built files will be in client/dist/
# Serve them with a static file server or configure Express to serve them
```

### Environment-Specific Settings

**Production:**
- Secure cookies enabled
- Rate limiting active
- CSRF protection enforced
- Compression enabled
- Error details hidden from clients

## 🐛 Troubleshooting

### Database Connection Issues

**Problem:** `Database connection failed`

**Solutions:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Ensure database exists: `psql -l`
- Check connection pooling: Max 10 connections configured

### Session Issues

**Problem:** `Session not persisting`

**Solutions:**
- Verify `session` table exists in PostgreSQL
- Check SESSION_SECRET is set (32+ characters)
- In production, ensure `secure: true` with HTTPS
- Clear cookies and retry

### Rate Limiting

**Problem:** `Too Many Requests (429)`

**Solutions:**
- In development, set `ENABLE_RATE_LIMIT=false`
- Check rate limit constants in `server/constants.js`
- Rate limits:
  - Auth: 5 requests / 15 min
  - Subscribe: 3 requests / 15 min
  - API: 100 requests / 15 min

### Build Issues

**Problem:** `Module not found` or build errors

**Solutions:**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf client/dist client/node_modules/.vite`
- Check Node.js version (18+ required)

### Email Not Sending

**Problem:** Verification emails not received

**Solutions:**
- Check SMTP configuration in `.env`
- For Gmail, use App Passwords (not account password)
- In development without SMTP, check server logs for verification URL
- Verify EMAIL_FROM address is valid

## 📝 Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run dev:client       # Start client only
npm run dev:server       # Start server only

# Build
npm run build            # Build client for production
npm run preview          # Preview production build

# Testing
npm --prefix server test              # Run all tests
npm --prefix server test:watch        # Watch mode
npm --prefix server test:coverage     # Coverage report

# Database
npm run migrate          # Run database migrations
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with React, Express, and PostgreSQL
- Icons by Lucide React
- Inspired by modern analytics platforms

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review error logs in `server/logs/`

---

**Current Status:** 76% complete (29/38 tasks) | 366 tests passing ✅

For detailed development progress, see [TODO.txt](./TODO.txt)
