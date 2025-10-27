# Missing Tests Analysis - PeakSelf

## Current Coverage: 61.63% statements, 52.87% branches, 66.35% functions

---

## ❌ CRITICAL - 0% Coverage (High Priority)

### 1. **utils/db.js** (0% coverage)
**Lines: 5-45**

Missing tests:
- ✗ Database URL validation
  - Invalid DATABASE_URL format
  - Missing DATABASE_URL
  - Empty DATABASE_URL
- ✗ Pool connection testing
  - Successful connection
  - Connection failure handling
  - Connection timeout
- ✗ `checkDatabaseAvailability()` function
  - Returns true when DB available
  - Returns false and 503 when DB unavailable
- ✗ Database availability flag updates
  - `isDatabaseAvailable` set to true on success
  - `isDatabaseAvailable` set to false on failure

**Test file needed**: `__tests__/utils/db.test.js`

---

### 2. **utils/supabase.js** (0% coverage)
**Lines: 4-71**

Missing tests:
- ✗ Supabase client initialization
  - Client created when credentials provided
  - Client is null when credentials missing
  - Warning logged when credentials missing
- ✗ `uploadImage()` function
  - Successful image upload
  - Returns correct URL and path
  - Handles upload errors
  - Throws when Supabase not configured
  - Validates file buffer, filename, contentType
- ✗ `deleteImage()` function
  - Successful image deletion
  - Handles deletion errors
  - Throws when Supabase not configured

**Test file needed**: `__tests__/utils/supabase.test.js`

---

### 3. **utils/validateEnv.js** (0% coverage)
**Lines: 8-217**

Missing tests:
- ✗ Required variable validation
  - DATABASE_URL validation (format, missing)
  - SESSION_SECRET validation (length, missing)
  - JWT_SECRET validation (length, default value, missing)
  - NODE_ENV validation (valid values, missing)
- ✗ Optional variable validation
  - PORT validation (number format)
  - SMTP_PORT validation (number format)
- ✗ `validateEnv()` function
  - Collects all errors
  - Collects warnings
  - Exits process on errors
  - Production-specific checks (SMTP warning)
  - Console output formatting

**Test file needed**: `__tests__/utils/validateEnv.test.js`

---

### 4. **routes/admin/index.js** (0% coverage)
**Lines: 9-19**

Missing tests:
- ✗ Admin router initialization
  - requireAdmin middleware applied
  - All sub-routers mounted correctly
  - Dashboard route at '/'
  - Users route at '/users'
  - Traffic route at '/traffic'
  - Sessions route at '/sessions'
  - Blog route at '/blog'

**Test file needed**: `__tests__/routes/admin/index.test.js`

---

## ⚠️ LOW COVERAGE - Priority Areas

### 5. **middleware/rateLimiter.js** (48.57% coverage)
**Uncovered lines: 15,29-33,66,81,113,129,145,161,168-175**

Missing tests:
- ✗ Rate limit handler execution
  - `rateLimitHandler()` response format
  - `oauthRateLimitHandler()` redirect logic
  - Retry-after time calculation
- ✗ Rate limit skip logic
  - Skips when `ENABLE_RATE_LIMIT !== 'true'`
  - Enforces when enabled
- ✗ Individual limiter configurations
  - authPasswordLimiter limits
  - authOAuthLimiter with redirect
  - authGeneralLimiter limits
  - subscribeLimiter strict limits
  - apiLimiter moderate limits
  - adminLimiter strict limits
  - trackingLimiter lenient limits
  - globalLimiter fallback limits
- ✗ Console logging output
  - Initialization logs
  - DEBUG output
  - Limit configuration display

**Add to**: `__tests__/middleware/security.test.js` or create `__tests__/middleware/rateLimiter.test.js`

---

### 6. **routes/auth.js** (53.66% coverage)
**Major uncovered lines: 353, 379-389, 424-444, 459, 463, 468, 487, 494**

Missing tests:
- ✗ Google OAuth failure endpoint (line 353)
  - GET /auth/google/failure
- ✗ Email verification edge cases (379-389)
  - Google + local account merging
  - Existing local user conflict
- ✗ Old verification flow (424-444)
  - Legacy email_verification_tokens table
  - Token consumption
  - Auto-login after verification
- ✗ Logout edge cases (459, 463, 468)
  - Logout error handling
  - No session case
  - Session destroy error
- ✗ /me endpoint errors (487)
  - Invalid JWT handling
- ✗ Debug endpoint (494)
  - Development-only /debug/session route

**Add to**: `__tests__/routes/api.test.js`

---

### 7. **routes/track.js** (60% coverage)
**Major uncovered lines: 84,87-111,127-141,161-162,182-186,191,240**

Missing tests:
- ✗ Visitor tracking edge cases
  - DB reset scenario (recreate visitor with same ID)
  - User linking to visitor
  - Missing source cookie handling
- ✗ Session management
  - Stale session detection
  - Session ending logic
  - User field updates (source, referrer, landing_path)
  - Session user attachment
- ✗ Error fallbacks
  - Session error fallback to simple traffic log
  - Traffic event insertion failure (line 240)
  - Users table schema mismatch handling

**Add to**: `__tests__/routes/api.test.js` or create `__tests__/routes/track.test.js`

---

## 📝 ADDITIONAL TEST COVERAGE NEEDED

### 8. **routes/subscribe.js** 
**Current tests exist but could be expanded**

Missing edge cases:
- ✗ Email transporter failures
- ✗ Duplicate subscription edge cases
- ✗ Invalid email formats
- ✗ Token validation in verify endpoint

**Expand**: `__tests__/routes/api.test.js`

---

### 9. **middleware/csrf.js**
**Partially tested**

Missing tests:
- ✗ CSRF token expiration
- ✗ Token validation failures
- ✗ Cookie tampering detection
- ✗ Double-submit cookie pattern

**Add to**: `__tests__/middleware/security.test.js`

---

### 10. **middleware/auth.js**
**100% statement coverage but missing branch coverage**

Missing branch tests:
- ✗ Edge cases in JWT verification
- ✗ Session vs JWT priority scenarios
- ✗ Admin role revocation mid-session

**Expand**: `__tests__/middleware/auth.test.js`

---

## 🎯 INTEGRATION & E2E TESTS

### Missing Integration Tests:
- ✗ **Full user registration flow**
  - Register → Email → Verify → Login → Access protected routes
- ✗ **OAuth + Local account merging**
  - Login with Google → Register with same email → Verify → Login with both methods
- ✗ **Admin workflows**
  - Create blog post → Upload image → Update → Delete
  - Invite user → User registers → Promote to admin
- ✗ **Tracking full session**
  - Multiple page views → Session continuity → User identification
- ✗ **Rate limiting enforcement**
  - Hit limit → Receive 429 → Wait → Retry successfully

### Missing Error Scenario Tests:
- ✗ Database connection loss during operation
- ✗ Supabase storage unavailable
- ✗ SMTP server timeout
- ✗ Concurrent session management
- ✗ Race conditions in tracking

---

## 📊 COVERAGE GOALS

### Target Coverage:
- **Statements**: 80% (current: 61.63%)
- **Branches**: 75% (current: 52.87%)
- **Functions**: 80% (current: 66.35%)
- **Lines**: 80% (current: 62.28%)

### Priority Order:
1. **Critical (0% coverage)**: db.js, supabase.js, validateEnv.js, admin/index.js
2. **Low coverage**: rateLimiter.js, auth.js, track.js
3. **Edge cases**: All existing test files
4. **Integration tests**: Full user flows

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Phase 1: Critical 0% Files (Week 1)
- [ ] Create `__tests__/utils/db.test.js`
- [ ] Create `__tests__/utils/supabase.test.js`
- [ ] Create `__tests__/utils/validateEnv.test.js`
- [ ] Create `__tests__/routes/admin/index.test.js`

### Phase 2: Expand Existing Tests (Week 2)
- [ ] Expand `__tests__/middleware/security.test.js` (rateLimiter)
- [ ] Expand `__tests__/routes/api.test.js` (auth edge cases)
- [ ] Create `__tests__/routes/track.test.js`
- [ ] Expand `__tests__/middleware/auth.test.js` (branch coverage)

### Phase 3: Integration Tests (Week 3)
- [ ] Create `__tests__/integration/user-flow.test.js`
- [ ] Create `__tests__/integration/admin-flow.test.js`
- [ ] Create `__tests__/integration/tracking-flow.test.js`

### Phase 4: Error Scenarios (Week 4)
- [ ] Add database failure tests across all routes
- [ ] Add external service failure tests
- [ ] Add concurrency/race condition tests

---

## 📦 REQUIRED MOCK UPDATES

### New Mocks Needed:
- Supabase Storage mock
- File upload buffer mocks
- Environment variable injection
- Database connection failure simulation
- SMTP timeout simulation

### Mock Improvements:
- Better rate limiter mocking
- Async error handling in mocks
- Session store mocking
- Cookie parsing edge cases

---

## 🚀 QUICK WINS (High Impact, Low Effort)

1. **Test admin router mounting** (~30 min)
2. **Test rate limit handlers** (~1 hour)
3. **Test validateEnv with various inputs** (~1 hour)
4. **Test Supabase client initialization** (~30 min)
5. **Test db.js checkDatabaseAvailability** (~30 min)

Total: ~3.5 hours to add significant coverage

---

## 📈 ESTIMATED COVERAGE IMPACT

Implementing all Phase 1 tests: **+15% statement coverage**
Implementing all Phase 2 tests: **+10% statement coverage**
Implementing all Phase 3-4 tests: **+8% statement coverage**

**Final estimated coverage: ~80% across all metrics** ✅
