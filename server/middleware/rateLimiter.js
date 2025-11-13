/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse, brute force attacks, and DDoS.
 * Uses different rate limits for different endpoint types.
 */

import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../constants.js';

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
  windowMs: RATE_LIMITS.AUTH_PASSWORD.windowMs,
  max: RATE_LIMITS.AUTH_PASSWORD.max,
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
  windowMs: RATE_LIMITS.AUTH_OAUTH.windowMs,
  max: RATE_LIMITS.AUTH_OAUTH.max,
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
  windowMs: RATE_LIMITS.AUTH_GENERAL.windowMs,
  max: RATE_LIMITS.AUTH_GENERAL.max,
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
  windowMs: RATE_LIMITS.SUBSCRIBE.windowMs,
  max: RATE_LIMITS.SUBSCRIBE.max,
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
  windowMs: RATE_LIMITS.API.windowMs,
  max: RATE_LIMITS.API.max,
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
  windowMs: RATE_LIMITS.ADMIN.windowMs,
  max: RATE_LIMITS.ADMIN.max,
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
  windowMs: RATE_LIMITS.TRACKING.windowMs,
  max: RATE_LIMITS.TRACKING.max,
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
  windowMs: RATE_LIMITS.GLOBAL.windowMs,
  max: RATE_LIMITS.GLOBAL.max,
  message: 'Too many requests from this IP, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.ENABLE_RATE_LIMIT !== 'true'
});

// Log rate limiter initialization
import logger from '../utils/logger.js';
logger.info('Rate limiters initialized');
logger.info(`ENABLE_RATE_LIMIT = ${process.env.ENABLE_RATE_LIMIT}`);
if (process.env.ENABLE_RATE_LIMIT === 'true') {
  logger.info('Auth (password/register): 5 requests per 30 minutes');
  logger.info('Auth (OAuth): 5 requests per 15 minutes');
  logger.info('Auth (general): 15 requests per 30 minutes');
  logger.info('Subscribe endpoint: 3 requests per 15 minutes');
  logger.info('Admin endpoints: 30 requests per 15 minutes');
  logger.info('Tracking endpoints: 500 requests per 15 minutes');
  logger.info('General API: 100 requests per 15 minutes');
  logger.info('Global fallback: 200 requests per 15 minutes');
} else {
  logger.warn('Rate limiting DISABLED');
  logger.info('Set ENABLE_RATE_LIMIT=true to enable rate limiting');
}
