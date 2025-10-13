# queries.sql - Schema Update Summary

## ✅ Updated for New Email Verification System

Your `queries.sql` file has been updated to include the new email verification system and comprehensive documentation.

---

## 📋 Complete Table List

When you run `queries.sql` on an empty database, it will create:

### Authentication Tables
1. **`users`** - Verified user accounts
   - All users have `verified = TRUE` in the new flow
   - Includes email, password_hash, provider, google_id, role, etc.

2. **`pending_registrations`** ⭐ NEW
   - Temporary storage for registrations before email verification
   - Automatically cleaned up after 24 hours
   - Deleted when user verifies email

3. **`email_verification_tokens`**
   - Legacy table for existing user email verification
   - Still used for edge cases and existing flows

### Session Tables
4. **`sessions`** - Server-side session storage

### Analytics Tables
5. **`traffic_events`** - Incoming traffic tracking
6. **`visitors`** - 30-day visitor tracking
7. **`user_sessions`** - User browsing sessions (30min inactivity)
8. **`session_events`** - Navigation events per session

### Other Tables
9. **`newsletter_subscriptions`** - Newsletter signups
10. **`dashboard_metrics`** - Admin dashboard snapshots

---

## 📝 Documentation Included

### Header Documentation (Lines 1-18)
```sql
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
```

### Authentication Rules (Lines 271-301)
Comprehensive documentation of:
- New email verification flow
- Google OAuth handling
- Local login requirements
- Account merging scenarios

---

## 🔑 Key Features of pending_registrations Table

```sql
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes:
- `idx_pending_registrations_token` - Fast token lookups
- `idx_pending_registrations_email` - Case-insensitive email search
- `idx_pending_registrations_expires` - Efficient cleanup queries
- `idx_pending_registrations_email_unique` - Prevent duplicate registrations

---

## 🚀 Usage

### For New/Empty Databases
```bash
psql -U your_username -d your_database -f queries.sql
```

This will:
1. Check if database is empty (safety check)
2. Create all tables in the correct order
3. Set up all indexes and triggers
4. Create initial dashboard snapshot
5. Be ready for your application to use

### For Existing Databases
If you already have a database running, use the migration instead:
```bash
npm run migrate
```

---

## 🔒 Safety Features

1. **Empty Database Check**
   - Script aborts if any tables already exist
   - Prevents accidental overwrites
   - Use migrations for existing databases

2. **Idempotent Statements**
   - Uses `CREATE TABLE IF NOT EXISTS`
   - Uses `CREATE INDEX IF NOT EXISTS`
   - Safe to run multiple times on empty DB

3. **Foreign Key Constraints**
   - Proper CASCADE deletes
   - Data integrity maintained
   - Orphaned records prevented

---

## 📊 Schema Highlights

### Users Table Verification Flow
- **OLD:** Users created with `verified = FALSE`, must verify later
- **NEW:** Users only created after verification with `verified = TRUE`
- **Result:** No unverified users in production table

### Automatic Cleanup
The application server (via `server/routes/auth.js`) automatically:
- Runs cleanup every hour
- Deletes expired pending_registrations
- Keeps database clean

### Google OAuth
- Users created immediately with `verified = TRUE`
- No email verification required
- Can be linked with local accounts

---

## 🗺️ Table Relationships

```
users
  ├─→ email_verification_tokens (legacy, via user_id)
  ├─→ visitors (optional, via user_id)
  ├─→ user_sessions (optional, via user_id)
  └─→ newsletter_subscriptions (separate, no FK)

pending_registrations (no foreign keys - isolated until verified)

visitors
  └─→ user_sessions (via visitor_id)
      └─→ session_events (via session_id)

traffic_events (standalone analytics)

dashboard_metrics (standalone snapshots)

sessions (standalone session store)
```

---

## ✅ What's Different from Before

1. ✅ Added `pending_registrations` table
2. ✅ Added comprehensive header documentation
3. ✅ Updated authentication rules documentation
4. ✅ Clarified new email verification flow
5. ✅ Documented Google OAuth auto-verification
6. ✅ Added account merging scenarios

---

## 📚 Related Files

- **Migration Script:** `server/migrations/run_migration.js`
- **Migration SQL:** `server/migrations/add_pending_registrations.sql`
- **Auth Logic:** `server/routes/auth.js`
- **Quick Start:** `QUICK_START.md`
- **Full Docs:** `server/migrations/README.md`

---

## 🎉 Ready to Use!

Your `queries.sql` is now fully updated and documented. It's ready to be used for:
- New database setups
- Development environments
- Testing environments
- Documentation reference

For existing production databases, always use the migration script instead!
