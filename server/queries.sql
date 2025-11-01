-- ============================================================================
-- PeakSelf Database Schema
-- ============================================================================
-- Complete database schema for the PeakSelf application
-- Run this against a fresh PostgreSQL database
-- 
-- Prerequisites:
--   - PostgreSQL 12 or higher
--   - UUID extension (usually available by default)
--   - pg_stat_statements (optional, for performance monitoring)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Core users table with authentication and profile information
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  google_id TEXT,
  provider TEXT NOT NULL DEFAULT 'local',
  role TEXT NOT NULL DEFAULT 'user',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT,
  referrer TEXT,
  landing_path TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('user','admin'))
);

-- Enforce email uniqueness case-insensitively
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email));

-- Enforce uniqueness for google_id when present
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique_idx ON users (google_id) WHERE google_id IS NOT NULL;

-- Soft delete indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_role_verified ON users(role, verified) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(id) WHERE verified = TRUE AND deleted_at IS NULL;

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
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soft delete and performance indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email) WHERE deleted_at IS NULL;

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
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_time ON blog_posts(status, created_at DESC);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- ============================================================================
-- BLOG POST TAGS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id SERIAL PRIMARY KEY,
  blog_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blog_post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- ============================================================================
-- VISITORS & SESSION TRACKING TABLES
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
  sessions_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_source ON visitors(source);
CREATE INDEX IF NOT EXISTS idx_visitors_active ON visitors(id) WHERE deleted_at IS NULL;

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

-- Performance indexes for sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_visitor_time ON user_sessions(visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_time ON user_sessions(user_id, started_at DESC) WHERE user_id IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_session_events_session_time ON session_events(session_id, occurred_at DESC);

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

-- Performance indexes for traffic analytics
CREATE INDEX IF NOT EXISTS idx_traffic_events_source_time ON traffic_events(source, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_time ON traffic_events(occurred_at DESC);

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

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================
-- This schema includes:
--   1. Users table with OAuth support, roles, and soft delete
--   2. Pending registrations for email verification flow
--   3. Newsletter subscriptions with soft delete support
--   4. Blog posts with slug-based routing, images, and tags
--   5. Tags system for blog posts (tags and blog_post_tags junction table)
--   6. Visitor and session tracking for analytics
--   7. Traffic events for simplified analytics
--   8. Dashboard view for real-time metrics
--   9. Performance indexes for optimized queries
--  10. Soft delete support on users, visitors, and newsletter_subscriptions
--  11. pg_stat_statements extension for query performance monitoring
--
-- To use this schema:
--   1. Create a fresh PostgreSQL database
--   2. Run: psql -U your_user -d your_database -f queries.sql
--   3. Verify: Run \dt to list all tables
--
-- For existing databases, use individual migration files in ./migrations/
-- ============================================================================
