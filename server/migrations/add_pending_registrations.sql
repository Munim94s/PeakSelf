-- Migration: Add pending_registrations table
-- This table stores user registration data before email verification
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

-- Index to quickly find tokens and clean up expired entries
CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(token);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pending_registrations_expires ON pending_registrations(expires_at);

-- Prevent duplicate pending registrations for the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_registrations_email_unique ON pending_registrations(LOWER(email));
