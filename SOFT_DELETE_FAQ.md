# Soft Delete FAQ

## ❓ Your Questions Answered

### Q1: How does the auth API check if a user is deleted or not?

**Answer:** Every authentication query includes `AND deleted_at IS NULL` to filter out soft-deleted users.

#### 5 Places Where Auth Checks Happen:

```
1. Login (routes/auth.js:301)
   └─ SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL
   └─ Result: Deleted user cannot login (returns "Invalid credentials")

2. Session Deserialization (routes/auth.js:116) 
   └─ SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL
   └─ Result: Active session becomes invalid immediately

3. JWT Admin Check (middleware/auth.js:104)
   └─ SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL
   └─ Result: JWT token doesn't work anymore

4. Registration (routes/auth.js:240)
   └─ SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL
   └─ Result: Can re-register with same email (if cleaned up)

5. Google OAuth (routes/auth.js:144, 155)
   └─ SELECT * FROM users WHERE google_id/email = $1 AND deleted_at IS NULL
   └─ Result: Soft-deleted accounts won't link to OAuth
```

**Visual Flow:**
```
User Tries to Login
       ↓
Query: SELECT * FROM users 
       WHERE email = 'john@example.com' 
       AND deleted_at IS NULL  ← This filters out deleted users
       ↓
If deleted_at IS NOT NULL: Query returns 0 rows
       ↓
Login fails with "Invalid credentials"
```

---

### Q2: How to test if a user actually gets deleted after 90 days?

**Answer:** Use PostgreSQL's `INTERVAL` to simulate time travel!

#### Method 1: SQL Time Travel (Fastest)

```sql
-- Step 1: Create test user
INSERT INTO users (email, password_hash, provider, verified)
VALUES ('test@example.com', 'hash', 'local', TRUE);

-- Step 2: Soft delete with timestamp 91 days ago
UPDATE users 
SET deleted_at = NOW() - INTERVAL '91 days'
WHERE email = 'test@example.com';

-- Step 3: Verify it's marked for cleanup
SELECT email, deleted_at,
       EXTRACT(DAY FROM (NOW() - deleted_at)) AS days_ago
FROM users 
WHERE email = 'test@example.com';
-- Shows: days_ago = 91

-- Step 4: Run cleanup (same logic as script)
DELETE FROM users
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days'
  AND email = 'test@example.com';

-- Step 5: Verify permanent deletion
SELECT * FROM users WHERE email = 'test@example.com';
-- Returns: 0 rows (GONE!)
```

#### Method 2: Automated Tests

```bash
npm test -- __tests__/scripts/cleanup-soft-deleted.test.js
```

Tests include:
- ✅ Soft delete with timestamp
- ✅ Auth queries exclude deleted users
- ✅ Simulate 91-day-old deletion
- ✅ Identify users ready for cleanup
- ✅ Permanent deletion works

#### Method 3: Cleanup Script with Test Data

```bash
# 1. Create test data
psql <<SQL
INSERT INTO users (email, password_hash, provider, verified, deleted_at)
VALUES ('old@example.com', 'hash', 'local', TRUE, NOW() - INTERVAL '100 days'),
       ('recent@example.com', 'hash', 'local', TRUE, NOW() - INTERVAL '30 days');
SQL

# 2. Dry run to see what would be deleted
node server/scripts/cleanup-soft-deleted.js --dry-run

# Expected: Would delete 1 record (old@example.com)

# 3. Run actual cleanup
node server/scripts/cleanup-soft-deleted.js

# 4. Verify
psql -c "SELECT email FROM users WHERE email LIKE '%@example.com';"
# Should only show: recent@example.com
```

---

## 🔑 Key Concepts

### Soft Delete = Invisible, Not Gone

```
Normal User Row:
┌──────┬───────────────┬────────────┐
│ id   │ email         │ deleted_at │
├──────┼───────────────┼────────────┤
│ u123 │ john@test.com │ NULL       │ ← Active (visible)
└──────┴───────────────┴────────────┘

After Soft Delete:
┌──────┬───────────────┬───────────────────────┐
│ id   │ email         │ deleted_at            │
├──────┼───────────────┼───────────────────────┤
│ u123 │ john@test.com │ 2025-10-28 19:30:00  │ ← Invisible
└──────┴───────────────┴───────────────────────┘
                              ↓
                    Still in database, but...
                              ↓
        All queries filter: WHERE deleted_at IS NULL
                              ↓
                    User appears "deleted"
```

### Time Travel with INTERVAL

```sql
-- Current time
NOW() = 2025-10-28 19:00:00

-- 91 days ago
NOW() - INTERVAL '91 days' = 2025-07-29 19:00:00

-- Set deletion timestamp in the past
UPDATE users SET deleted_at = NOW() - INTERVAL '91 days';

-- PostgreSQL thinks the user was deleted 91 days ago!
```

---

## 📝 Quick Test Checklist

### Test 1: Soft Delete Blocks Login
```bash
# ✅ Create user → ✅ Login works → ✅ Soft delete → ❌ Login fails
```

### Test 2: Session Invalidation
```bash
# ✅ Login → ✅ Get session → ✅ Soft delete → ❌ Session invalid
```

### Test 3: 90-Day Cleanup
```bash
# ✅ Create user → ✅ Delete 91 days ago → ✅ Cleanup → ❌ User gone
```

### Test 4: Restore Works
```bash
# ✅ Soft delete → ❌ Cannot login → ✅ Restore → ✅ Can login again
```

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG: Forgetting the filter
```sql
SELECT * FROM users WHERE email = 'john@example.com';
-- BAD: Returns soft-deleted users too!
```

### ✅ CORRECT: Always include the filter
```sql
SELECT * FROM users WHERE email = 'john@example.com' AND deleted_at IS NULL;
-- GOOD: Only active users
```

---

### ❌ WRONG: Using real time for testing
```bash
# Have to wait 90 days... 😴
```

### ✅ CORRECT: Use time travel
```sql
UPDATE users SET deleted_at = NOW() - INTERVAL '91 days';
-- Instant 90-day test! ⚡
```

---

## 📚 Further Reading

| Document | Purpose |
|----------|---------|
| `SOFT_DELETE_EXPLAINED.md` | Visual guide with diagrams |
| `SOFT_DELETE_AUTH_TESTING.md` | Detailed testing guide |
| `SOFT_DELETE_QUICKREF.md` | Quick command reference |
| `SOFT_DELETE.md` | Complete technical documentation |

---

## 💡 Pro Tips

1. **Always test with time travel** - Don't wait 90 days!
   ```sql
   UPDATE users SET deleted_at = NOW() - INTERVAL '91 days';
   ```

2. **Use dry-run first** - See what would be deleted
   ```bash
   node server/scripts/cleanup-soft-deleted.js --dry-run
   ```

3. **Check auth filters** - Verify all queries include:
   ```sql
   AND deleted_at IS NULL
   ```

4. **Monitor deletion age** - Track how old deletions are:
   ```sql
   SELECT email, EXTRACT(DAY FROM (NOW() - deleted_at)) AS days_ago
   FROM users WHERE deleted_at IS NOT NULL;
   ```

5. **Test restore** - Verify users can be brought back:
   ```bash
   POST /api/admin/users/:id/restore
   ```

---

## 🎯 TL;DR

**How auth checks:**
- Every query adds `AND deleted_at IS NULL`
- Deleted users become invisible to auth system
- Login/session/JWT all automatically blocked

**How to test 90-day deletion:**
- Use `NOW() - INTERVAL '91 days'` to simulate old deletions
- Run cleanup script or `DELETE` query
- Verify user is permanently gone from database

**Key commands:**
```bash
# Time travel delete
UPDATE users SET deleted_at = NOW() - INTERVAL '91 days' WHERE email = 'test@example.com';

# Test cleanup
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '90 days' AND email = 'test@example.com';

# Verify gone
SELECT * FROM users WHERE email = 'test@example.com'; -- 0 rows
```
