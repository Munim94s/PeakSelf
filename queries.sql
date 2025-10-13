-- Database schema for PeakSelf
-- Target: PostgreSQL
-- 
-- IMPORTANT: This schema includes a new email verification system where users are
-- NOT added to the users table until they verify their email address.
-- 
-- Key Tables:
-- - users: Verified users (all users have verified=TRUE in new flow)
-- - pending_registrations: Temporary storage for unverified registrations
-- - email_verification_tokens: Legacy tokens for existing users
-- 
-- Registration Flow:
-- 1. User registers → entry created in pending_registrations
-- 2. Verification email sent with unique token (24h expiration)
-- 3. User clicks link → user created in users table with verified=TRUE
-- 4. Automatic cleanup removes expired pending registrations every hour
-- 
-- See authentication rules section below for complete documentation.

-- SAFETY: Abort if the database is not empty (any table already exists in public schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'Init script is intended for an empty DB (public schema already has tables). Aborting.';
  END IF;
END
$$;

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM for auth provider
DO $$ BEGIN
  CREATE TYPE auth_provider AS ENUM ('local', 'google');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NULL,
  provider auth_provider NOT NULL DEFAULT 'local',
  google_id TEXT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'user',
  sessions_count BIGINT NOT NULL DEFAULT 0,
  name TEXT NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('user','admin'))
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enforce case-insensitive uniqueness for emails and speed up equality lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users ((LOWER(email)));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to quickly find active tokens
-- Partial index with immutable predicate only
CREATE INDEX IF NOT EXISTS idx_email_verification_active
  ON email_verification_tokens(user_id, expires_at)
  WHERE consumed_at IS NULL;

-- Pending registrations (stores registration data before email verification)
-- Users are only added to the users table after verifying their email
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pending registrations
CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(token);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_registrations_email_unique ON pending_registrations(LOWER(email));

-- Sessions (optional if using server-side sessions)
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

-- Helpful index for dashboard scans
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Traffic events (store referrer/source of incoming traffic)
CREATE TABLE IF NOT EXISTS traffic_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT NULL,
  referrer TEXT NULL,
  user_agent TEXT NULL,
  ip TEXT NULL,
  source TEXT NOT NULL CHECK (source IN ('instagram','youtube','google','other'))
);

CREATE INDEX IF NOT EXISTS idx_traffic_events_time ON traffic_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_traffic_events_source ON traffic_events(source);

-- Session-based tracking (visitors, sessions, events)
-- Visitors represent a 30-day cookie identity. First source is immutable; current source may change.
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  first_source TEXT NOT NULL,
  current_source TEXT NOT NULL,
  first_referrer TEXT NULL,
  current_referrer TEXT NULL,
  first_landing_path TEXT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sessions_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_visitors_user ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen_at DESC);

-- Each browsing session lasts 30 minutes of inactivity. Each session has its own source.
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  landing_path TEXT NULL,
  user_agent TEXT NULL,
  ip TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  page_count INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_started ON user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON user_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_visitor ON user_sessions(visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_source ON user_sessions(source);

-- Ordered navigation events per session (for click-through details)
CREATE TABLE IF NOT EXISTS session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT NOT NULL,
  referrer TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_time ON session_events(session_id, occurred_at);

-- Trigger: bump session last_seen_at and page_count on each event
CREATE OR REPLACE FUNCTION bump_session_on_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_sessions
  SET last_seen_at = NEW.occurred_at,
      page_count = page_count + 1
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_session_on_event ON session_events;
CREATE TRIGGER trg_bump_session_on_event
AFTER INSERT ON session_events
FOR EACH ROW EXECUTE FUNCTION bump_session_on_event();

-- Trigger: maintain counts and visitor current_source on session creation
CREATE OR REPLACE FUNCTION on_session_insert_update_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE visitors
  SET sessions_count = sessions_count + 1,
      current_source = NEW.source,
      last_seen_at = NEW.started_at
  WHERE id = NEW.visitor_id;

  IF NEW.user_id IS NOT NULL THEN
    UPDATE users
    SET sessions_count = sessions_count + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_session_insert ON user_sessions;
CREATE TRIGGER trg_on_session_insert
AFTER INSERT ON user_sessions
FOR EACH ROW EXECUTE FUNCTION on_session_insert_update_counts();

-- Trigger: adjust users.sessions_count if a session moves between users (e.g., anonymous -> logged in)
CREATE OR REPLACE FUNCTION on_session_user_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    IF OLD.user_id IS NOT NULL THEN
      UPDATE users SET sessions_count = GREATEST(0, sessions_count - 1) WHERE id = OLD.user_id;
    END IF;
    IF NEW.user_id IS NOT NULL THEN
      UPDATE users SET sessions_count = sessions_count + 1 WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_session_user_change ON user_sessions;
CREATE TRIGGER trg_on_session_user_change
AFTER UPDATE OF user_id ON user_sessions
FOR EACH ROW EXECUTE FUNCTION on_session_user_change();

-- Views for listing sessions and drilling down into details
CREATE OR REPLACE VIEW v_sessions_list AS
SELECT
  s.id AS session_id,
  s.visitor_id,
  s.user_id,
  u.email AS user_email,
  s.source,
  s.landing_path,
  s.started_at,
  s.last_seen_at,
  s.ended_at,
  s.page_count
FROM user_sessions s
LEFT JOIN users u ON u.id = s.user_id;

CREATE OR REPLACE VIEW v_session_events AS
SELECT
  e.session_id,
  e.occurred_at,
  e.path,
  e.referrer
FROM session_events e
ORDER BY e.occurred_at ASC, e.id ASC;

-- Helper view: active sessions (last_seen within 30 minutes)
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT *
FROM user_sessions
WHERE ended_at IS NULL AND last_seen_at >= NOW() - INTERVAL '30 minutes';

-- Newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authentication and registration rules (documented expectations)
-- 
-- NEW EMAIL VERIFICATION FLOW:
-- - Local registrations are stored in pending_registrations table until email verified
-- - Users are ONLY added to users table after clicking verification link
-- - All new users are created with verified=TRUE (no unverified users in production table)
-- 
-- 1) On Local Register (NEW FLOW):
--    - Create entry in pending_registrations (NOT users table)
--    - Generate verification token with 24-hour expiration
--    - Send verification email with token
--    - On verification: create user in users table with verified=TRUE, delete pending registration
--    - If pending registration expires: automatic cleanup removes it from pending_registrations
-- 
-- 2) On Google OAuth sign-in:
--    - If a user with same email exists and provider='local', link accounts by setting users.google_id
--    - Keep provider='local' so both local and Google login remain allowed
--    - If no user exists, create with provider='google', password_hash=NULL, verified=TRUE (auto-verified)
--    - Google users can immediately login without email verification
-- 
-- 3) On Local Login:
--    - Only permitted when provider='local' and verified=TRUE
--    - Users must complete email verification before first login
-- 
-- 4) On Google Login:
--    - Permitted regardless of verified flag (Google OAuth implies verified email)
--    - Can be used to link with existing local account
-- 
-- 5) Account Merging:
--    - Google user can set password: sets password_hash, changes provider to 'local', keeps google_id
--    - Result: user can login with both methods (Google OAuth OR email/password)

-- Dashboard metrics (overview)
-- This block creates a snapshot table and a view for the latest snapshot,
-- then inserts a one-time snapshot using current data.
BEGIN;

-- 1) Table to store dashboard snapshots
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id BIGSERIAL PRIMARY KEY,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Users
  total_users BIGINT NOT NULL,
  verified_users BIGINT NOT NULL,
  signups_24h BIGINT NOT NULL,
  -- Newsletter (totals only)
  newsletter_total BIGINT NOT NULL,
  newsletter_signups_24h BIGINT NOT NULL,
  -- Traffic (last 7 days)
  traffic_instagram BIGINT NOT NULL,
  traffic_youtube BIGINT NOT NULL,
  traffic_google BIGINT NOT NULL,
  traffic_others BIGINT NOT NULL,
  traffic_others_refs JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- 2) View for the Overview tab that always points to the latest snapshot
DROP VIEW IF EXISTS dashboard_overview_latest;
CREATE VIEW dashboard_overview_latest AS
SELECT dm.*
FROM dashboard_metrics dm
ORDER BY snapshot_at DESC
LIMIT 1;

-- 3) One-time populate a snapshot with current aggregates
WITH
  u AS (
    SELECT
      COUNT(*)::BIGINT AS total_users,
      COUNT(*) FILTER (WHERE verified)::BIGINT AS verified_users,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS signups_24h
    FROM users
  ),
  n AS (
    SELECT
      COUNT(*)::BIGINT AS newsletter_total,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS newsletter_signups_24h
    FROM newsletter_subscriptions
  ),
  tr AS (
    SELECT
      COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_instagram,
      COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_youtube,
      COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_google,
      COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_others
    FROM traffic_events
    WHERE occurred_at >= NOW() - INTERVAL '7 days'
  ),
  otr AS (
    SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS others_refs
    FROM (
      SELECT COALESCE(NULLIF(referrer,''),'(direct)') AS ref, COUNT(*) AS cnt
      FROM traffic_events
      WHERE occurred_at >= NOW() - INTERVAL '7 days' AND source = 'other'
      GROUP BY COALESCE(NULLIF(referrer,''),'(direct)')
      ORDER BY cnt DESC
      LIMIT 5
    ) t
  )
INSERT INTO dashboard_metrics (
  total_users, verified_users, signups_24h,
  newsletter_total, newsletter_signups_24h,
  traffic_instagram, traffic_youtube, traffic_google, traffic_others, traffic_others_refs
)
SELECT
  u.total_users, u.verified_users, u.signups_24h,
  n.newsletter_total, n.newsletter_signups_24h,
  tr.traffic_instagram, tr.traffic_youtube, tr.traffic_google, tr.traffic_others, otr.others_refs
FROM u, n, tr, otr;

COMMIT;



