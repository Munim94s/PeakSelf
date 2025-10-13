# Rate Limiting Update - Registration Endpoint

## ✅ Updated: Registration Rate Limit

The registration endpoint now has a stricter rate limit to prevent spam and abuse.

---

## 📊 Current Configuration

### Registration Endpoint (`POST /api/auth/register`)
- **Rate Limiter:** `authPasswordLimiter`
- **Limit:** **5 requests per 30 minutes per IP** ✅
- **Window:** 30 minutes (1800 seconds)
- **Applies to:** Registration and Login routes

### Implementation
```javascript
// server/routes/auth.js line 212
router.post("/register", authPasswordLimiter, async (req, res) => {
  // Registration logic...
});
```

---

## 🔐 Complete Rate Limiting Setup

### Auth Endpoints

1. **Password Auth (Login/Register)** - `authPasswordLimiter`
   - **5 requests per 30 minutes**
   - Prevents brute force and spam registrations
   - Applied to: `/api/auth/register`, `/api/auth/login`

2. **OAuth (Google)** - `authOAuthLimiter`
   - **5 requests per 15 minutes**
   - Applied to: `/api/auth/google`, `/api/auth/google/callback`

3. **General Auth** - `authGeneralLimiter`
   - **15 requests per 15 minutes**
   - Applied to: `/api/auth/logout`, `/api/auth/verify-email`, etc.

### Other Endpoints

4. **Newsletter Subscribe** - `subscribeLimiter`
   - **3 requests per 15 minutes**
   - Very strict to prevent spam

5. **Admin Endpoints** - `adminLimiter`
   - **30 requests per 15 minutes**

6. **Tracking Endpoints** - `trackingLimiter`
   - **500 requests per 15 minutes**
   - Lenient for high-traffic analytics

7. **General API** - `apiLimiter`
   - **100 requests per 15 minutes**

8. **Global Fallback** - `globalLimiter`
   - **200 requests per 15 minutes**

---

## 🎯 What This Means for Users

### Registration Attempts
Users can attempt to register **5 times in 30 minutes** from the same IP address.

After 5 attempts, they'll receive:
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": "2025-10-10T01:30:00.000Z"
}
```

### Response Headers
The API returns helpful headers:
- `RateLimit-Limit: 5` - Maximum requests allowed
- `RateLimit-Remaining: 4` - Requests remaining in window
- `RateLimit-Reset: 1728532200` - When the limit resets (Unix timestamp)

---

## 🛡️ Security Benefits

1. **Prevents Spam Registrations**
   - Limits mass account creation
   - Reduces fake accounts

2. **Protects Against Brute Force**
   - Same limiter applies to login
   - Makes password guessing impractical

3. **Reduces Database Load**
   - Limits pending_registrations table growth
   - Prevents email spam

4. **Fair Resource Usage**
   - 5 attempts is reasonable for legitimate users
   - 30-minute window prevents abuse

---

## ⚙️ Configuration

### Enable Rate Limiting
Rate limiting must be explicitly enabled via environment variable:

```bash
# .env
ENABLE_RATE_LIMIT=true
```

### Default Behavior
- **Development:** Rate limiting DISABLED by default
- **Production:** Should be ENABLED

---

## 🧪 Testing Rate Limiting

### Test Registration Rate Limit
```bash
# Make 6 registration attempts quickly
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"Test123!\"}"
  echo "\n"
done

# The 6th request should be rate limited
```

### Expected Result
- Requests 1-5: Success (or validation errors)
- Request 6: `429 Too Many Requests` with retry information

---

## 📝 Files Modified

1. ✅ `server/middleware/rateLimiter.js`
   - Updated `authPasswordLimiter` from 15 to 30 minutes
   - Updated documentation comments
   - Updated console log messages

2. ✅ `server/routes/auth.js`
   - Already using `authPasswordLimiter` on register route (line 212)
   - Already using `authPasswordLimiter` on login route (line 276)

---

## 🔍 Verification

### Check Rate Limiter Configuration
```bash
# Start server and look for:
✅ Rate limiters initialized
   DEBUG: ENABLE_RATE_LIMIT = true
   Auth (password/register): 5 requests per 30 minutes
   ...
```

### Check Registration Endpoint
```bash
curl -v http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Look for headers:
# RateLimit-Limit: 5
# RateLimit-Remaining: 4
```

---

## 💡 Best Practices

### For Users
- Don't retry registration multiple times rapidly
- Check email for verification link before trying again
- Contact support if repeatedly having issues

### For Admins
- Monitor rate limit logs for abuse patterns
- Consider IP whitelisting for internal testing
- Adjust limits based on traffic patterns

---

## 🎉 Summary

✅ Registration endpoint now limits to **5 attempts per 30 minutes**  
✅ Applies to both registration and login  
✅ Same IP address is tracked  
✅ Automatic reset after 30 minutes  
✅ Clear error messages for users  
✅ Standard rate limit headers included  

The system is now protected against spam registrations and brute force attacks!
