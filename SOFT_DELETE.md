# Soft Delete Implementation

## Overview

Soft delete functionality has been implemented to prevent permanent data loss and allow for data recovery. Instead of permanently deleting records from the database, records are marked as "deleted" with a timestamp and excluded from normal queries.

## Implementation Details

### Database Schema Changes

#### Migration: `add_soft_deletes.js`

Added `deleted_at TIMESTAMPTZ NULL` column to:
- `users`
- `visitors`
- `newsletter_subscriptions`

#### Indexes Created

1. **Active Record Indexes** (partial indexes where `deleted_at IS NULL`):
   - `idx_users_active` - Optimizes user lookups
   - `idx_users_email_active` - Optimizes email searches
   - `idx_visitors_active` - Optimizes visitor lookups
   - `idx_newsletter_active` - Optimizes newsletter subscription queries

2. **Deleted Record Index**:
   - `idx_users_deleted_at` - Optimizes cleanup script queries

### API Endpoints

#### Soft Delete User
```http
DELETE /api/admin/users/:id
```
- Sets `deleted_at = NOW()` instead of permanently deleting
- Returns `404` if user not found or already deleted
- Prevents self-deletion
- Invalidates user and dashboard caches

#### Restore User
```http
POST /api/admin/users/:id/restore
```
- Sets `deleted_at = NULL` to restore soft-deleted user
- Returns restored user object
- Returns `404` if user not found or not deleted
- Invalidates user and dashboard caches

### Query Updates

All queries that access the `users` table now include `WHERE deleted_at IS NULL` to exclude soft-deleted records:

#### Files Updated:
- `server/routes/admin/users.js` - All user management queries
- `server/routes/auth.js` - Authentication and registration queries
- `server/middleware/auth.js` - User verification queries
- `server/routes/track.js` - User tracking queries
- `server/routes/admin/dashboard.js` - Dashboard metrics
- `server/routes/admin/traffic.js` - Traffic analytics

### Cleanup Script

#### Location
`server/scripts/cleanup-soft-deleted.js`

#### Usage
```bash
# Dry run (shows what would be deleted without actually deleting)
node server/scripts/cleanup-soft-deleted.js --dry-run

# Delete records older than 90 days (default)
node server/scripts/cleanup-soft-deleted.js

# Delete records older than 30 days
node server/scripts/cleanup-soft-deleted.js --days=30
```

#### Configuration
Set retention period via environment variable:
```bash
SOFT_DELETE_RETENTION_DAYS=90  # Default: 90 days
```

#### Scheduled Cleanup
For production, add to cron:
```bash
# Run cleanup every Sunday at 2 AM
0 2 * * 0 cd /path/to/PeakSelf && node server/scripts/cleanup-soft-deleted.js
```

### Migration Commands

#### Apply Migration
```bash
node server/migrations/run.js add_soft_deletes up
```

#### Rollback Migration
```bash
node server/migrations/run.js add_soft_deletes down
```

## Testing

### Test Coverage
- ✅ Soft delete user endpoint
- ✅ Restore user endpoint
- ✅ Query filtering (all routes)
- ✅ Error handling (404, validation)
- ✅ Self-deletion prevention

### Run Tests
```bash
cd server
npm test
```

All 289 tests pass, including 2 new tests for the restore endpoint.

## Benefits

1. **Data Recovery** - Accidentally deleted users can be restored
2. **Audit Trail** - Deletion timestamp provides audit information
3. **Referential Integrity** - Related records (sessions, visitors) remain intact
4. **Compliance** - Supports GDPR "right to erasure" with delayed permanent deletion
5. **Performance** - Partial indexes ensure queries remain fast

## Security Considerations

1. **Admin-Only Access** - Only admins can delete/restore users
2. **Self-Protection** - Users cannot delete their own accounts
3. **Cache Invalidation** - Caches are properly cleared on delete/restore
4. **Query Safety** - All queries filter out soft-deleted records by default

## Future Enhancements

Potential improvements for future versions:

1. **Admin UI** - View and restore deleted users from admin panel
2. **Bulk Operations** - Soft delete multiple users at once
3. **Deletion Reason** - Add optional reason field for audit trail
4. **Automatic Cleanup** - Background job to automatically run cleanup script
5. **Notification** - Email admins before permanent deletion
6. **Soft Delete History** - Track who deleted and who restored records

## Notes

- Soft-deleted users cannot log in (filtered by `deleted_at IS NULL`)
- Email uniqueness is preserved (soft-deleted emails can't be re-registered until permanently deleted)
- Sessions from soft-deleted users remain in database but are inaccessible
- Dashboard metrics automatically exclude soft-deleted users
