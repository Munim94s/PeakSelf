# How Soft Delete Works - Visual Guide

## 🎯 The Concept

Instead of permanently deleting data from the database, we mark it as "deleted" with a timestamp. This allows for:
- **Data recovery** if deletion was accidental
- **Audit trail** showing when data was deleted
- **Compliance** with data retention policies

---

## 📊 Database Structure

### Before Soft Delete
```
users table:
┌─────────┬───────────────────┬──────┬──────────┐
│ id      │ email             │ role │ verified │
├─────────┼───────────────────┼──────┼──────────┤
│ user-1  │ john@example.com  │ user │ true     │
│ user-2  │ jane@example.com  │ user │ true     │
│ user-3  │ bob@example.com   │ admin│ true     │
└─────────┴───────────────────┴──────┴──────────┘
```

### After Soft Delete Implementation
```
users table (with deleted_at column):
┌─────────┬───────────────────┬──────┬──────────┬────────────────────────┐
│ id      │ email             │ role │ verified │ deleted_at             │
├─────────┼───────────────────┼──────┼──────────┼────────────────────────┤
│ user-1  │ john@example.com  │ user │ true     │ NULL (active)          │
│ user-2  │ jane@example.com  │ user │ true     │ NULL (active)          │
│ user-3  │ bob@example.com   │ admin│ true     │ NULL (active)          │
└─────────┴───────────────────┴──────┴──────────┴────────────────────────┘
```

---

## 🔄 Soft Delete Lifecycle

### 1️⃣ Active User (Normal State)
```
┌─────────────────────────────┐
│ User Record                 │
├─────────────────────────────┤
│ id: user-1                  │
│ email: john@example.com     │
│ role: user                  │
│ deleted_at: NULL ← Active! │
└─────────────────────────────┘

✅ User can log in
✅ Appears in user lists
✅ All features work normally
```

### 2️⃣ Soft Deleted User
```
Admin clicks "Delete" button
        ↓
┌─────────────────────────────────────────┐
│ DELETE /api/admin/users/user-1          │
│                                         │
│ SQL: UPDATE users                       │
│      SET deleted_at = NOW()             │
│      WHERE id = 'user-1'                │
│        AND deleted_at IS NULL           │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│ User Record (Soft Deleted)              │
├─────────────────────────────────────────┤
│ id: user-1                              │
│ email: john@example.com                 │
│ role: user                              │
│ deleted_at: 2025-10-28 19:30:00 ← Set! │
└─────────────────────────────────────────┘

❌ User CANNOT log in
❌ Does NOT appear in user lists
❌ All queries filter them out
✅ Data still exists in database
```

### 3️⃣ Restored User
```
Admin clicks "Restore" button
        ↓
┌─────────────────────────────────────────┐
│ POST /api/admin/users/user-1/restore    │
│                                         │
│ SQL: UPDATE users                       │
│      SET deleted_at = NULL              │
│      WHERE id = 'user-1'                │
│        AND deleted_at IS NOT NULL       │
└─────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────┐
│ User Record (Restored)                  │
├─────────────────────────────────────────┤
│ id: user-1                              │
│ email: john@example.com                 │
│ role: user                              │
│ deleted_at: NULL ← Restored!           │
└─────────────────────────────────────────┘

✅ User can log in again
✅ Appears in user lists again
✅ All features work normally again
```

### 4️⃣ Permanent Deletion (After 90 Days)
```
Cleanup script runs (scheduled or manual)
        ↓
┌─────────────────────────────────────────────┐
│ node server/scripts/cleanup-soft-deleted.js │
│                                             │
│ SQL: DELETE FROM users                      │
│      WHERE deleted_at IS NOT NULL           │
│        AND deleted_at < NOW() - 90 days     │
└─────────────────────────────────────────────┘
        ↓
Record is PERMANENTLY removed from database
⚠️ CANNOT be restored after this point
```

---

## 🔍 How Queries Filter Deleted Records

### All User Queries Include This Filter
```sql
-- Before soft delete
SELECT * FROM users WHERE email = 'john@example.com';

-- After soft delete (automatic filter)
SELECT * FROM users 
WHERE email = 'john@example.com' 
  AND deleted_at IS NULL;  ← Excludes soft-deleted users
```

### Query Results
```
Active users (deleted_at IS NULL):
┌─────────┬───────────────────┬──────────────┐
│ id      │ email             │ deleted_at   │
├─────────┼───────────────────┼──────────────┤
│ user-1  │ john@example.com  │ NULL ✅      │
│ user-2  │ jane@example.com  │ NULL ✅      │
└─────────┴───────────────────┴──────────────┘

Deleted users (deleted_at IS NOT NULL):
┌─────────┬───────────────────┬────────────────────┐
│ id      │ email             │ deleted_at         │
├─────────┼───────────────────┼────────────────────┤
│ user-3  │ bob@example.com   │ 2025-10-28 19:30  │
└─────────┴───────────────────┴────────────────────┘
```

---

## 🔐 API Endpoints

### Delete a User (Soft Delete)
```http
DELETE /api/admin/users/user-1
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "ok": true
}
```

**What happens internally:**
```sql
UPDATE users 
SET deleted_at = NOW() 
WHERE id = 'user-1' 
  AND deleted_at IS NULL;
```

---

### Restore a User
```http
POST /api/admin/users/user-1/restore
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "user": {
    "id": "user-1",
    "email": "john@example.com",
    "role": "user",
    "verified": true,
    "name": "John Doe"
  },
  "message": "User restored successfully"
}
```

**What happens internally:**
```sql
UPDATE users 
SET deleted_at = NULL, updated_at = NOW() 
WHERE id = 'user-1' 
  AND deleted_at IS NOT NULL;
```

---

## 🧹 Cleanup Script

### View What Would Be Deleted (Dry Run)
```bash
node server/scripts/cleanup-soft-deleted.js --dry-run
```

**Output:**
```
================================================================================
Soft Delete Cleanup Script
================================================================================
Mode: DRY RUN
Retention Period: 90 days
Cutoff Date: 2025-07-30T19:38:00.000Z
================================================================================

Processing users table...
[DRY RUN] Would delete 5 records from users (deleted > 90 days ago)

Processing visitors table...
No old soft-deleted records found in visitors

Processing newsletter_subscriptions table...
[DRY RUN] Would delete 2 records from newsletter_subscriptions (deleted > 90 days ago)

================================================================================
Cleanup Summary
================================================================================
Users: 5 would be deleted
Visitors: 0 would be deleted
Newsletter Subscriptions: 2 would be deleted
Total: 7 records would be deleted
================================================================================

⚠️  This was a DRY RUN. No records were actually deleted.
Run without --dry-run to perform the actual deletion.
```

### Permanently Delete Old Records
```bash
# Use default 90 days
node server/scripts/cleanup-soft-deleted.js

# Or specify custom retention period
node server/scripts/cleanup-soft-deleted.js --days=30
```

---

## 📈 Performance Optimization

### Partial Indexes (Only Index Active Records)
```sql
-- This index ONLY includes non-deleted users
CREATE INDEX idx_users_active 
ON users(id) 
WHERE deleted_at IS NULL;

-- This index ONLY includes non-deleted emails
CREATE INDEX idx_users_email_active 
ON users(email) 
WHERE deleted_at IS NULL;
```

**Why?**
- Smaller indexes = faster queries
- Most queries only need active users
- Deleted users don't slow down normal operations

---

## 🛡️ Security Features

### 1. Admin-Only Access
```javascript
// Only admins can delete/restore
router.delete('/:id', requireAdmin, async (req, res) => {
  // Soft delete logic
});

router.post('/:id/restore', requireAdmin, async (req, res) => {
  // Restore logic
});
```

### 2. Self-Protection
```javascript
// Prevent admin from deleting themselves
if (id === String(req.currentUser.id)) {
  return res.status(400).json({ 
    error: 'You cannot delete your own account' 
  });
}
```

### 3. Cache Invalidation
```javascript
// Clear caches after delete/restore
invalidate.users();
invalidate.dashboard();
```

---

## 🎓 Real-World Example

### Scenario: Accidental User Deletion

**9:00 AM** - Admin accidentally deletes user
```
User: john@example.com
Action: Soft deleted (deleted_at = 2025-10-28 09:00:00)
Status: Cannot log in, not visible in admin panel
```

**9:15 AM** - User reports they can't log in
```
Admin checks logs: "Oh no, I deleted the wrong user!"
```

**9:16 AM** - Admin restores user
```http
POST /api/admin/users/user-1/restore
```

**9:17 AM** - User can log in again
```
User: john@example.com
Action: Restored (deleted_at = NULL)
Status: Everything works normally again
```

**Without soft delete:** User data would be gone forever! 😱  
**With soft delete:** Crisis averted in 2 minutes! 🎉

---

## 📝 Summary

| Feature | How It Works |
|---------|-------------|
| **Delete** | Sets `deleted_at = NOW()`, user becomes invisible |
| **Restore** | Sets `deleted_at = NULL`, user becomes active again |
| **Queries** | Always filter `WHERE deleted_at IS NULL` |
| **Cleanup** | Permanently deletes records older than 90 days |
| **Performance** | Partial indexes keep queries fast |
| **Security** | Admin-only, self-protection, cache invalidation |

## 🔗 Related Files

- `server/routes/admin/users.js` - Delete & restore endpoints
- `server/migrations/add_soft_deletes.js` - Database migration
- `server/scripts/cleanup-soft-deleted.js` - Cleanup script
- `SOFT_DELETE.md` - Complete documentation
