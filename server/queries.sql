-- PeakSelf DB Schema
-- Complete database schema for the PeakSelf application
-- Run this against a fresh database or use individual migrations for existing databases

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Core users table with authentication and profile information
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_path TEXT;

-- Backfill and enforce constraints
UPDATE users SET provider = 'local' WHERE provider IS NULL;
ALTER TABLE users ALTER COLUMN provider SET NOT NULL;
UPDATE users SET role = 'user' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','admin'));

-- Enforce email uniqueness case-insensitively
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users ((LOWER(email)));

-- Enforce uniqueness for google_id when present
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique_idx ON users (google_id) WHERE google_id IS NOT NULL;

-- ============================================================================
-- PENDING REGISTRATIONS TABLE
-- ============================================================================
-- Stores user registration data before email verification
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(token);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_registrations_email_unique ON pending_registrations(LOWER(email));

-- ============================================================================
-- EMAIL VERIFICATION TOKENS TABLE (Legacy)
-- ============================================================================
-- Legacy table for email verification (replaced by pending_registrations)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

-- ============================================================================
-- NEWSLETTER SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOG POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  slug VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'draft',
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- ============================================================================
-- ANALYTICS & TRACKING TABLES
-- ============================================================================

-- Visitors table: tracks unique visitors across sessions
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  source TEXT NOT NULL DEFAULT 'other',
  referrer TEXT NULL,
  landing_path TEXT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sessions_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_source ON visitors(source);

-- User sessions table: tracks individual browsing sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL,
  user_id UUID NULL,
  source TEXT NOT NULL DEFAULT 'other',
  landing_path TEXT NULL,
  user_agent TEXT NULL,
  ip TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  page_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_visitor_id ON user_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);

-- Session events table: tracks individual page views within sessions
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_occurred_at ON session_events(occurred_at);

-- Create view for session events with session_id as text for compatibility
CREATE OR REPLACE VIEW v_session_events AS
SELECT 
  id::text,
  session_id::text,
  path,
  referrer,
  occurred_at
FROM session_events
ORDER BY occurred_at;

-- Traffic events table: simplified event tracking for analytics
CREATE TABLE IF NOT EXISTS traffic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'other',
  referrer TEXT NULL,
  path TEXT NOT NULL,
  user_agent TEXT NULL,
  ip TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_traffic_events_occurred_at ON traffic_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_traffic_events_source ON traffic_events(source);

-- ============================================================================
-- DASHBOARD VIEW
-- ============================================================================
-- Materialized view for dashboard metrics (drop and recreate to refresh)
CREATE OR REPLACE VIEW dashboard_overview_latest AS
WITH
  u AS (
    SELECT
      (SELECT COUNT(*) FROM users)::BIGINT AS total_users,
      (SELECT COUNT(*) FROM users WHERE verified)::BIGINT AS verified_users,
      (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS signups_24h
  ),
  n AS (
    SELECT
      (SELECT COUNT(*) FROM newsletter_subscriptions)::BIGINT AS newsletter_total,
      (SELECT COUNT(*) FROM newsletter_subscriptions WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS newsletter_signups_24h
  ),
  sess AS (
    SELECT
      COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_instagram,
      COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_facebook,
      COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_youtube,
      COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_google,
      COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_others
    FROM user_sessions
    WHERE started_at >= NOW() - INTERVAL '7 days'
  ),
  otr AS (
    SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS sessions_others_refs
    FROM (
      SELECT COALESCE(NULLIF(v.referrer,''),'(direct)') AS ref, COUNT(*) AS cnt
      FROM user_sessions s
      JOIN visitors v ON v.id = s.visitor_id
      WHERE s.started_at >= NOW() - INTERVAL '7 days' AND s.source = 'other'
      GROUP BY COALESCE(NULLIF(v.referrer,''),'(direct)')
      ORDER BY cnt DESC
      LIMIT 5
    ) t
  )
SELECT 
  NOW() AS snapshot_at,
  u.total_users, u.verified_users, u.signups_24h,
  n.newsletter_total, n.newsletter_signups_24h,
  sess.sessions_instagram, sess.sessions_facebook, sess.sessions_youtube, sess.sessions_google, sess.sessions_others,
  otr.sessions_others_refs
FROM u, n, sess, otr;
