# How Auth Checks for Deleted Users & Testing Guide

## 🔐 Auth Query Filtering Explained

### Every Auth Query Includes the Filter

All authentication-related queries automatically filter out soft-deleted users by adding `AND deleted_at IS NULL`:

```sql
-- ❌ WRONG - Would include deleted users
SELECT * FROM users WHERE email = 'john@example.com';

-- ✅ CORRECT - Excludes deleted users
SELECT * FROM users WHERE email = 'john@example.com' AND deleted_at IS NULL;
```

---

## 📍 Where Auth Checks Happen

### 1. **Login** (`POST /api/auth/login`)
```javascript
// Line 301 in server/routes/auth.js
const { rows } = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", 
  [email]
);
```

**What happens:**
- User tries to log in with email/password
- Query looks for user with `deleted_at IS NULL`
- If soft-deleted → query returns 0 rows → login fails
- Error: "Invalid credentials" (doesn't reveal user was deleted)

---

### 2. **Session Deserialization** (Every Protected Request)
```javascript
// Line 116 in server/routes/auth.js
passport.deserializeUser(async (obj, done) => {
  const { rows } = await pool.query(
    "SELECT id, email, provider, verified, name, avatar_url, role FROM users WHERE id = $1 AND deleted_at IS NULL", 
    [obj.id]
  );
  if (!rows[0]) return done(null, false);
  done(null, rows[0]);
});
```

**What happens:**
- User has active session/JWT
- Admin soft-deletes the user
- Next request: Session tries to deserialize user
- Query with `deleted_at IS NULL` returns nothing
- User automatically logged out

---

### 3. **JWT Verification in Admin Routes**
```javascript
// Line 104 in server/middleware/auth.js
const { rows } = await pool.query(
  'SELECT email, role FROM users WHERE id = $1 AND deleted_at IS NULL', 
  [decoded.sub]
);
```

**What happens:**
- User has valid JWT token
- Admin soft-deletes the user
- User tries to access admin panel
- Query checks if user exists with `deleted_at IS NULL`
- Returns empty → Access denied

---

### 4. **Registration Check**
```javascript
// Line 240 in server/routes/auth.js
const { rows } = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", 
  [email]
);
```

**What happens:**
- Someone tries to register with email
- Query checks for existing active users only
- Soft-deleted users are ignored
- Allows re-registration with same email (after cleanup)

---

### 5. **Google OAuth**
```javascript
// Line 144 & 155 in server/routes/auth.js
await pool.query("SELECT * FROM users WHERE google_id = $1 AND deleted_at IS NULL", [googleId]);
await pool.query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
```

**What happens:**
- User signs in with Google
- System checks for existing account
- Only matches active accounts
- Soft-deleted accounts not linked

---

## 🧪 Testing 90-Day Cleanup

### Method 1: Manual Database Time Travel

```sql
-- 1. Create a test user
INSERT INTO users (email, password_hash, provider, verified)
VALUES ('test-delete@example.com', 'hash', 'local', TRUE);

-- 2. Soft delete with timestamp 91 days ago
UPDATE users 
SET deleted_at = NOW() - INTERVAL '91 days'
WHERE email = 'test-delete@example.com';

-- 3. Verify user is marked for deletion
SELECT id, email, deleted_at,
       EXTRACT(DAY FROM (NOW() - deleted_at)) AS days_deleted
FROM users 
WHERE email = 'test-delete@example.com';
-- Should show ~91 days

-- 4. Test cleanup query (DRY RUN)
SELECT id, email, deleted_at
FROM users
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
-- Should include our test user

-- 5. Permanent delete (simulate cleanup)
DELETE FROM users
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days'
  AND email = 'test-delete@example.com';
-- Returns: DELETE 1

-- 6. Verify permanent deletion
SELECT * FROM users WHERE email = 'test-delete@example.com';
-- Returns: 0 rows (gone forever!)
```

---

### Method 2: Run Automated Tests

```bash
cd server
npm test -- __tests__/scripts/cleanup-soft-deleted.test.js
```

**Tests include:**
- ✅ Soft delete with current timestamp
- ✅ Auth queries don't find deleted users
- ✅ Simulate 91-day-old deletion
- ✅ Identify users ready for cleanup
- ✅ Exclude users < 90 days old
- ✅ Permanent deletion works correctly
- ✅ Full cleanup scenario

---

### Method 3: Manual Testing with Cleanup Script

**Step 1: Create test data with old deletion**
```sql
-- Create test user deleted 100 days ago
INSERT INTO users (email, password_hash, provider, verified, deleted_at)
VALUES ('old-deleted@example.com', 'hash', 'local', TRUE, NOW() - INTERVAL '100 days');

-- Create test user deleted 30 days ago
INSERT INTO users (email, password_hash, provider, verified, deleted_at)
VALUES ('recent-deleted@example.com', 'hash', 'local', TRUE, NOW() - INTERVAL '30 days');

-- Create active test user
INSERT INTO users (email, password_hash, provider, verified)
VALUES ('active@example.com', 'hash', 'local', TRUE);
```

**Step 2: Run cleanup script (dry run)**
```bash
node server/scripts/cleanup-soft-deleted.js --dry-run
```

**Expected output:**
```
Processing users table...
[DRY RUN] Would delete 1 records from users (deleted > 90 days ago)
```

**Step 3: Verify which user would be deleted**
```sql
SELECT email, deleted_at, 
       EXTRACT(DAY FROM (NOW() - deleted_at)) AS days_ago
FROM users 
WHERE email IN ('old-deleted@example.com', 'recent-deleted@example.com', 'active@example.com')
ORDER BY email;
```

**Expected:**
```
email                      | deleted_at           | days_ago
---------------------------+----------------------+---------
active@example.com         | NULL                 | NULL
old-deleted@example.com    | 2025-07-20 19:00:00 | 100
recent-deleted@example.com | 2025-09-28 19:00:00 | 30
```

**Step 4: Run actual cleanup**
```bash
node server/scripts/cleanup-soft-deleted.js
```

**Step 5: Verify results**
```sql
SELECT email FROM users 
WHERE email IN ('old-deleted@example.com', 'recent-deleted@example.com', 'active@example.com');
```

**Expected:**
```
email
---------------------------
active@example.com
recent-deleted@example.com
-- old-deleted@example.com is GONE
```

---

## 🎯 Real-World Testing Scenarios

### Scenario 1: User Tries to Login After Soft Delete

```bash
# 1. Create and login as test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Admin soft-deletes user via SQL
psql -c "UPDATE users SET deleted_at = NOW() WHERE email = 'test@example.com';"

# 3. Try to login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Expected: {"error":"Invalid credentials"}
```

---

### Scenario 2: Active Session After Soft Delete

```bash
# 1. Login and get session cookie
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Verify session works
curl http://localhost:5000/api/auth/me -b cookies.txt
# Expected: {"user":{...}}

# 3. Admin soft-deletes user
psql -c "UPDATE users SET deleted_at = NOW() WHERE email = 'test@example.com';"

# 4. Try to access protected route
curl http://localhost:5000/api/auth/me -b cookies.txt
# Expected: {"user":null} - Session invalid
```

---

### Scenario 3: Restore Deleted User

```bash
# 1. Soft delete user
psql -c "UPDATE users SET deleted_at = NOW() WHERE email = 'test@example.com';"

# 2. Verify cannot login
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: {"error":"Invalid credentials"}

# 3. Admin restores user
curl -X POST http://localhost:5000/api/admin/users/{id}/restore \
  -H "Authorization: Bearer {admin_token}"

# 4. Verify can login again
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: {"message":"Logged in",...}
```

---

## 📊 Monitoring Soft Deletes

### Check Deletion Statistics
```sql
-- Count users by status
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_users,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL AND deleted_at >= NOW() - INTERVAL '90 days') AS soft_deleted_recent,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days') AS ready_for_cleanup
FROM users;
```

### List Users Ready for Cleanup
```sql
SELECT 
  id, 
  email, 
  deleted_at,
  EXTRACT(DAY FROM (NOW() - deleted_at))::INTEGER AS days_ago
FROM users
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days'
ORDER BY deleted_at ASC;
```

### Recent Deletions (Last 7 Days)
```sql
SELECT id, email, role, deleted_at
FROM users
WHERE deleted_at >= NOW() - INTERVAL '7 days'
ORDER BY deleted_at DESC;
```

---

## 🔍 Debugging Tips

### Check if User is Soft-Deleted
```sql
SELECT id, email, deleted_at,
       CASE 
         WHEN deleted_at IS NULL THEN 'ACTIVE'
         WHEN deleted_at >= NOW() - INTERVAL '90 days' THEN 'SOFT_DELETED'
         ELSE 'READY_FOR_CLEANUP'
       END AS status
FROM users
WHERE email = 'user@example.com';
```

### Test Auth Query Manually
```sql
-- What auth sees
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND deleted_at IS NULL;
-- Empty result = user cannot login

-- What the database actually has
SELECT * FROM users 
WHERE email = 'user@example.com';
-- Shows the actual record with deleted_at
```

### Verify Indexes Are Working
```sql
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE email = 'test@example.com' 
  AND deleted_at IS NULL;
-- Should use idx_users_email_active index
```

---

## ✅ Summary

| Check | Location | SQL Filter | Result if Deleted |
|-------|----------|------------|-------------------|
| **Login** | `routes/auth.js:301` | `AND deleted_at IS NULL` | Login fails |
| **Session** | `routes/auth.js:116` | `AND deleted_at IS NULL` | Auto logged out |
| **JWT Admin** | `middleware/auth.js:104` | `AND deleted_at IS NULL` | Access denied |
| **Registration** | `routes/auth.js:240` | `AND deleted_at IS NULL` | Can re-register |
| **OAuth** | `routes/auth.js:144` | `AND deleted_at IS NULL` | Not linked |

## 🧪 Run Tests

```bash
# Run cleanup tests
npm test -- __tests__/scripts/cleanup-soft-deleted.test.js

# Run all tests
npm test
```

All 289 tests should pass! ✅
