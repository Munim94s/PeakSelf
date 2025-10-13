# Email Verification System Migration

## Overview
This migration implements a new email verification system where users are **NOT added to the database** until they verify their email address.

## What Changed

### Before (Old Flow)
1. User registers → immediately added to `users` table with `verified = FALSE`
2. User receives verification email
3. User clicks link → `verified` set to `TRUE`
4. User could login even before verification (bad UX)

### After (New Flow)
1. User registers → stored in `pending_registrations` table (NOT in `users` table)
2. User receives verification email
3. User clicks link → account created in `users` table with `verified = TRUE`
4. User can now login with verified account

## Benefits
- ✅ No unverified users cluttering the database
- ✅ Users can only login after email verification
- ✅ Automatic cleanup of expired pending registrations
- ✅ Prevents spam accounts
- ✅ Better user experience - clear flow

## Migration Steps

### 1. Run the Migration SQL
```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database -f server/migrations/add_pending_registrations.sql
```

Or manually execute the SQL in your database client.

### 2. Restart Your Server
The server will automatically:
- Create the necessary table if it doesn't exist (using CREATE IF NOT EXISTS)
- Start the cleanup job for expired pending registrations (runs every hour)

## New Database Table

### `pending_registrations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | User's email address |
| password_hash | TEXT | Hashed password |
| name | TEXT | Optional user name |
| token | TEXT | Unique verification token |
| expires_at | TIMESTAMPTZ | Token expiration (24 hours) |
| created_at | TIMESTAMPTZ | Registration timestamp |

## API Changes

### POST `/api/auth/register`
**Before:** Created user immediately and returned user object
**After:** Creates pending registration and returns message to check email

**New Response:**
```json
{
  "message": "Registration initiated. Please check your email to verify your account before logging in.",
  "email": "user@example.com"
}
```

### GET `/api/auth/verify-email?token=xxx`
**Before:** Updated existing user's `verified` flag
**After:** Creates user from pending registration with `verified = TRUE`, then redirects to login page

**New Redirect:**
```
{CLIENT_URL}/login?verified=true&message=Email%20verified!%20You%20can%20now%20login.
```

## Automatic Cleanup
The system automatically deletes expired pending registrations every hour. Pending registrations expire after 24 hours if not verified.

## Backwards Compatibility
The verification endpoint still supports the old flow for:
- Existing users who need to verify their email
- Google OAuth users who set a password

## Testing

### Test New Registration Flow
1. Register a new account: `POST /api/auth/register`
2. Check database - should NOT see user in `users` table
3. Check `pending_registrations` table - should see the entry
4. Click verification link from email (or console in dev mode)
5. Check database - user now in `users` table with `verified = TRUE`
6. Login successfully

### Test in Development (No SMTP)
The verification link is printed to console when SMTP is not configured:
```
[DEV] Verification link for user@example.com: http://localhost:5000/api/auth/verify-email?token=...
```

## Environment Variables
Make sure these are set in your `.env`:
- `CLIENT_URL` - Frontend URL for redirects (default: http://localhost:5173)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration (optional in dev)

## Rollback
If you need to rollback:
```sql
DROP TABLE IF EXISTS pending_registrations CASCADE;
```
Then revert the code changes in `server/routes/auth.js`.
