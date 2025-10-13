/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse, brute force attacks, and DDoS.
 * Uses different rate limits for different endpoint types.
 */

import rateLimit from 'express-rate-limit';

/**
 * Standard error handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: req.rateLimit?.resetTime 
      ? new Date(req.rateLimit.resetTime).toISOString()
      : 'in a few minutes'
  });
};

/**
 * OAuth-specific rate limit handler that redirects with error message
 * Used for OAuth flows that need redirects instead of JSON responses
 */
const oauthRateLimitHandler = (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetTime = req.rateLimit?.resetTime 
    ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 60000) // minutes
    : 15;
  res.redirect(`${clientUrl}/rate-limit?retry_in=${resetTime}`);
};

/**
 * Strict rate limiter for password-based authentication (login/register)
 * Prevents brute force attacks and spam registrations
 * 
 * Limits: 5 requests per 30 minutes per IP
 */
export const authPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts from this IP, please try again after 30 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitHandler,
  // Skip rate limiting unless explicitly enabled
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Strict rate limiter for OAuth flows (Google, etc.)
 * OAuth requires multiple redirects per login, so this allows ~1-2 login attempts
 * 
 * Limits: 5 requests per 15 minutes per IP
 */
export const authOAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OAuth attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: oauthRateLimitHandler, // Use redirect handler for OAuth
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * General auth limiter for other auth endpoints (logout, verify, etc.)
 * 
 * Limits: 15 requests per 30 minutes per IP
 */
export const authGeneralLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 15, // 15 requests per window
  message: 'Too many authentication requests from this IP, please try again after 30 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Very strict rate limiter for newsletter subscription
 * Prevents spam subscriptions
 * 
 * Limits: 3 requests per 15 minutes per IP
 */
export const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: 'Too many subscription attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Moderate rate limiter for general API endpoints
 * Protects against general abuse
 * 
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Strict rate limiter for admin endpoints
 * Extra protection for sensitive administrative functions
 * 
 * Limits: 30 requests per 15 minutes per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Too many admin requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Very lenient rate limiter for tracking endpoints
 * These need to handle high traffic from legitimate users
 * 
 * Limits: 500 requests per 15 minutes per IP
 */
export const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: 'Too many tracking requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

/**
 * Global rate limiter (fallback)
 * Applied to all routes that don't have specific limiters
 * 
 * Limits: 200 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: 'Too many requests from this IP, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

// Log rate limiter initialization
console.log('✅ Rate limiters initialized');
console.log('   DEBUG: ENABLE_RATE_LIMIT =', process.env.ENABLE_RATE_LIMIT);
if (process.env.ENABLE_RATE_LIMIT === 'true') {
  console.log('   Auth (password/register): 5 requests per 30 minutes');
  console.log('   Auth (OAuth): 5 requests per 15 minutes');
  console.log('   Auth (general): 15 requests per 30 minutes');
  console.log('   Subscribe endpoint: 3 requests per 15 minutes');
  console.log('   Admin endpoints: 30 requests per 15 minutes');
  console.log('   Tracking endpoints: 500 requests per 15 minutes');
  console.log('   General API: 100 requests per 15 minutes');
  console.log('   Global fallback: 200 requests per 15 minutes');
} else {
  console.log('   ⚠️  Rate limiting DISABLED');
  console.log('   💡 Set ENABLE_RATE_LIMIT=true to enable rate limiting');
}
