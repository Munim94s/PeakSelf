# Soft Delete Quick Reference

## 🚀 Commands

### Run Migration
```bash
node server/migrations/run.js add_soft_deletes up
```

### Rollback Migration
```bash
node server/migrations/run.js add_soft_deletes down
```

### Cleanup Script (Dry Run)
```bash
node server/scripts/cleanup-soft-deleted.js --dry-run
```

### Cleanup Script (Live - Deletes Records)
```bash
# Default: 90 days retention
node server/scripts/cleanup-soft-deleted.js

# Custom retention period
node server/scripts/cleanup-soft-deleted.js --days=30
node server/scripts/cleanup-soft-deleted.js --days=180
```

---

## 🔌 API Endpoints

### Soft Delete User
```http
DELETE /api/admin/users/:id
Authorization: Bearer <admin_token>
```

### Restore User
```http
POST /api/admin/users/:id/restore
Authorization: Bearer <admin_token>
```

---

## 💾 Database Queries

### Find All Soft-Deleted Users
```sql
SELECT id, email, role, deleted_at 
FROM users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### Find Users Deleted in Last 7 Days
```sql
SELECT id, email, role, deleted_at 
FROM users 
WHERE deleted_at >= NOW() - INTERVAL '7 days'
ORDER BY deleted_at DESC;
```

### Find Users Ready for Permanent Deletion (>90 days)
```sql
SELECT id, email, role, deleted_at 
FROM users 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days'
ORDER BY deleted_at ASC;
```

### Count Active vs Deleted Users
```sql
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_users,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_users,
  COUNT(*) AS total_users
FROM users;
```

### Manually Soft Delete a User
```sql
UPDATE users 
SET deleted_at = NOW() 
WHERE id = 'user-id-here';
```

### Manually Restore a User
```sql
UPDATE users 
SET deleted_at = NULL 
WHERE id = 'user-id-here';
```

### Manually Permanently Delete Old Soft-Deleted Users
```sql
DELETE FROM users 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
```

---

## 📊 Monitoring Queries

### Soft Delete Statistics
```sql
SELECT 
  'users' AS table_name,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days') AS ready_for_cleanup
FROM users

UNION ALL

SELECT 
  'visitors' AS table_name,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days') AS ready_for_cleanup
FROM visitors

UNION ALL

SELECT 
  'newsletter_subscriptions' AS table_name,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days') AS ready_for_cleanup
FROM newsletter_subscriptions;
```

---

## ⚙️ Environment Variables

```bash
# .env file
SOFT_DELETE_RETENTION_DAYS=90  # Default retention period
```

---

## 🔧 Troubleshooting

### Check if Migration is Applied
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'deleted_at';
```

### Check if Indexes Exist
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'users' 
  AND indexname LIKE '%deleted%';
```

### Verify Query Filtering
```sql
-- This should return 0 if all queries properly filter
SELECT COUNT(*) 
FROM users 
WHERE deleted_at IS NOT NULL;
```

---

## 📅 Production Cron Setup

### Weekly Cleanup (Sundays at 2 AM)
```bash
0 2 * * 0 cd /path/to/PeakSelf && node server/scripts/cleanup-soft-deleted.js >> /var/log/peakself-cleanup.log 2>&1
```

### Daily Dry Run Report (Mondays at 9 AM)
```bash
0 9 * * 1 cd /path/to/PeakSelf && node server/scripts/cleanup-soft-deleted.js --dry-run | mail -s "PeakSelf Cleanup Report" admin@example.com
```

---

## 🎯 Key Points

✅ **Soft delete sets** `deleted_at = NOW()`  
✅ **Restore sets** `deleted_at = NULL`  
✅ **All queries filter** `WHERE deleted_at IS NULL`  
✅ **Cleanup deletes records** older than 90 days  
✅ **Partial indexes** keep queries fast  
✅ **Admin-only** access to delete/restore  

---

## 📖 Full Documentation

- `SOFT_DELETE_EXPLAINED.md` - Visual guide with examples
- `SOFT_DELETE.md` - Complete technical documentation
- `queries.sql` - Updated schema with soft delete columns
