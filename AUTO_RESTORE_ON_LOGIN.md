# Auto-Restore Soft-Deleted Users on Login

## 🎯 Feature Overview

When a soft-deleted user tries to log in (either via email/password or Google OAuth), they are **automatically restored** instead of being rejected.

This provides a better user experience and allows users to "undelete" themselves by simply logging back in.

---

## 🔄 How It Works

### Email/Password Login Flow

```
User enters email & password
        ↓
Check for active user (deleted_at IS NULL)
        ↓
   Not found? ──────────────────┐
        ↓                       │
   Active user found            │
        ↓                       │
   Verify password              │
        ↓                       │
   Login successful        Check soft-deleted user (deleted_at IS NOT NULL)
                                ↓
                           Found deleted user?
                                ↓
                           Verify password
                                ↓
                           Password correct?
                                ↓
                           Restore user (SET deleted_at = NULL)
                                ↓
                           Invalidate caches
                                ↓
                           Log restoration
                                ↓
                           Login successful ✅
```

### Google OAuth Login Flow

```
User signs in with Google
        ↓
Check for active user by google_id
        ↓
   Found? ────> Update & login
        ↓
   Not found
        ↓
Check for soft-deleted user by google_id
        ↓
   Found? ────> Restore & login
        ↓
   Not found
        ↓
Check for active user by email
        ↓
   Found? ────> Link Google account & login
        ↓
   Not found
        ↓
Check for soft-deleted user by email
        ↓
   Found? ────> Restore, link Google & login
        ↓
   Not found
        ↓
Create new user ✅
```

---

## 💻 Implementation Details

### Local Login (routes/auth.js:286)

```javascript
// Check for active user first
let { rows } = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", 
  [email]
);
let user = rows[0];

// If no active user found, check if user is soft-deleted
if (!user) {
  const deletedCheck = await pool.query(
    "SELECT * FROM users WHERE email = $1 AND deleted_at IS NOT NULL", 
    [email]
  );
  const deletedUser = deletedCheck.rows[0];
  
  if (deletedUser) {
    // User was soft-deleted, check password first
    const ok = await bcrypt.compare(password, deletedUser.password_hash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    // Password is correct, restore the user automatically
    const restored = await pool.query(
      "UPDATE users SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *",
      [deletedUser.id]
    );
    user = restored.rows[0];
    
    // Invalidate caches
    invalidate.users();
    invalidate.dashboard();
    
    logger.info(`User ${user.email} automatically restored on login`);
  }
}
```

### Google OAuth (routes/auth.js:130)

```javascript
// Check if user with google_id was soft-deleted
const deletedByGoogleId = await pool.query(
  "SELECT * FROM users WHERE google_id = $1 AND deleted_at IS NOT NULL", 
  [googleId]
);
if (deletedByGoogleId.rows[0]) {
  // Restore the soft-deleted user
  const restored = await pool.query(
    "UPDATE users SET deleted_at = NULL, name = COALESCE(name, $1), avatar_url = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
    [displayName, avatarUrl, deletedByGoogleId.rows[0].id]
  );
  invalidate.users();
  invalidate.dashboard();
  logger.info(`User ${email} automatically restored on Google OAuth login`);
  return done(null, restored.rows[0]);
}

// Check if user with email was soft-deleted
const deletedByEmail = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND deleted_at IS NOT NULL", 
  [email]
);
if (deletedByEmail.rows[0]) {
  // Restore the soft-deleted user and link Google account
  const restored = await pool.query(
    "UPDATE users SET deleted_at = NULL, google_id = $1, avatar_url = COALESCE($2, avatar_url), name = COALESCE(name, $3), updated_at = NOW() WHERE id = $4 RETURNING *",
    [googleId, avatarUrl, displayName, deletedByEmail.rows[0].id]
  );
  invalidate.users();
  invalidate.dashboard();
  logger.info(`User ${email} automatically restored on Google OAuth login`);
  return done(null, restored.rows[0]);
}
```

---

## 🛡️ Security Features

### Password Verification Required

Soft-deleted users are NOT restored unless the correct password is provided:

```javascript
// Check password BEFORE restoring
const ok = await bcrypt.compare(password, deletedUser.password_hash);
if (!ok) {
  return res.status(400).json({ error: "Invalid credentials" });
}

// Only restore if password matches
const restored = await pool.query(
  "UPDATE users SET deleted_at = NULL WHERE id = $1",
  [deletedUser.id]
);
```

This prevents unauthorized restoration of deleted accounts.

### Same Error Message

Whether the user doesn't exist or has the wrong password, they get the same error:

```
"Invalid credentials"
```

This prevents account enumeration attacks.

### Cache Invalidation

After restoration, caches are properly invalidated:

```javascript
invalidate.users();
invalidate.dashboard();
```

This ensures admin dashboard shows updated user counts immediately.

### Logging

All restorations are logged for audit purposes:

```javascript
logger.info(`User ${user.email} automatically restored on login`);
```

---

## 📊 Database Changes

### Before Login
```sql
SELECT * FROM users WHERE email = 'john@example.com';
```

```
id   | email              | deleted_at
-----+--------------------+---------------------
u123 | john@example.com   | 2025-10-28 19:00:00  ← Soft deleted
```

### After Successful Login
```sql
SELECT * FROM users WHERE email = 'john@example.com';
```

```
id   | email              | deleted_at
-----+--------------------+-----------
u123 | john@example.com   | NULL      ← Restored!
```

---

## 🎯 User Experience

### Scenario 1: User Accidentally Deleted

**What happens:**
1. Admin accidentally deletes user
2. User tries to log in
3. Password is correct → **User automatically restored**
4. User successfully logs in
5. Everything works normally

**User experience:**
- ✅ No error message about being deleted
- ✅ Seamless login experience
- ✅ All data intact (sessions, history, etc.)

### Scenario 2: Wrong Password

**What happens:**
1. User is soft-deleted
2. User tries to log in with wrong password
3. Password verification fails → **User NOT restored**
4. Error: "Invalid credentials"

**User experience:**
- ❌ Cannot restore account without correct password
- ✅ Security maintained

### Scenario 3: Google OAuth

**What happens:**
1. User is soft-deleted
2. User signs in with Google
3. Google auth successful → **User automatically restored**
4. Google account linked (if not already)
5. User successfully logs in

**User experience:**
- ✅ Single sign-on works
- ✅ Account automatically recovered
- ✅ Can use both Google and email/password login

---

## ⚙️ Configuration

No configuration needed - the feature works automatically!

### Environment Variables
None required specifically for this feature.

### Logging
Restoration events are logged at INFO level:
```
User john@example.com automatically restored on login
User alice@example.com automatically restored on Google OAuth login
```

---

## 🧪 Testing

### Test Case 1: Email/Password Restoration
```bash
# 1. Soft delete user
UPDATE users SET deleted_at = NOW() WHERE email = 'test@example.com';

# 2. Try to login
POST /api/auth/login
Body: { email: 'test@example.com', password: 'correct-password' }

# Expected: 200 OK, user restored
```

### Test Case 2: Wrong Password (No Restoration)
```bash
# 1. Soft delete user
UPDATE users SET deleted_at = NOW() WHERE email = 'test@example.com';

# 2. Try to login with wrong password
POST /api/auth/login
Body: { email: 'test@example.com', password: 'wrong-password' }

# Expected: 400 Bad Request, "Invalid credentials"
# User remains deleted
```

### Test Case 3: Google OAuth Restoration
```bash
# 1. Soft delete user
UPDATE users SET deleted_at = NOW() WHERE google_id = 'google-123';

# 2. Sign in with Google
GET /api/auth/google

# Expected: User restored and logged in
```

### Test Case 4: Verify Restoration in Database
```bash
# After successful restoration
SELECT email, deleted_at FROM users WHERE email = 'test@example.com';

# Expected: deleted_at = NULL
```

---

## 🔄 Related Features

This feature works seamlessly with:
- ✅ **Deleted Users Tab** - Can still manually restore from admin panel
- ✅ **Bulk Operations** - Can still bulk restore multiple users
- ✅ **90-Day Cleanup** - Only auto-restores soft-deleted users (before permanent deletion)
- ✅ **Session Management** - Restored users get fresh session
- ✅ **Cache Invalidation** - Admin dashboard updates immediately

---

## 📝 Notes

### Why Auto-Restore?

1. **Better UX** - Users don't see confusing "account deleted" errors
2. **Self-Service** - Users can restore themselves without admin help
3. **Accidental Deletion Recovery** - Undo mistakes easily
4. **Secure** - Requires password verification

### What About Permanent Deletion?

After 90 days (or when manually deleted via bulk delete), users are **permanently removed** from the database. They **cannot** be auto-restored because the record no longer exists.

### Can Admin See Restoration?

Yes! Check the server logs:
```
logger.info(`User ${user.email} automatically restored on login`);
```

---

## ✅ Summary

**Auto-restore on login:**
- ✅ Email/password login restores soft-deleted users
- ✅ Google OAuth login restores soft-deleted users
- ✅ Password verification required (secure)
- ✅ Cache invalidation (admin dashboard updates)
- ✅ Logging (audit trail)
- ✅ No configuration needed (automatic)

**User benefits:**
- No confusing error messages
- Self-service account recovery
- Seamless experience

**Security maintained:**
- Password verification required
- Same error for wrong password/no account
- All restorations logged

The feature works transparently - soft-deleted users just log in normally and their account comes back! 🎉
