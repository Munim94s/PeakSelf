/**
 * Application-wide constants
 * Centralizes all magic numbers and configuration values
 */

// ============================================================================
// TIME CONSTANTS (in milliseconds)
// ============================================================================

/** One minute in milliseconds */
export const ONE_MINUTE_MS = 60 * 1000;

/** One hour in milliseconds */
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

/** One day in milliseconds */
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** One week in milliseconds */
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================

/** Max age for JWT access token cookie (10 day) */
export const COOKIE_JWT_MAX_AGE = 30 * ONE_DAY_MS;

/** Max age for session cookie (7 days) */
export const COOKIE_SESSION_MAX_AGE = ONE_WEEK_MS;

/** Max age for visitor ID tracking cookie (30 days) */
export const COOKIE_VISITOR_MAX_AGE = 30 * ONE_DAY_MS;

/** Max age for session ID tracking cookie (30 minutes) */
export const COOKIE_SESSION_TRACKING_MAX_AGE = 30 * ONE_MINUTE_MS;

/** Max age for traffic source tracking cookie (30 days) */
export const COOKIE_SOURCE_MAX_AGE = 30 * ONE_DAY_MS;

// ============================================================================
// SESSION & TOKEN CONFIGURATION
// ============================================================================

/** Session timeout duration (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * ONE_MINUTE_MS;

/** JWT token expiration (1 day) */
export const JWT_EXPIRATION = '1d';

/** Email verification token expiration (24 hours) */
export const EMAIL_VERIFICATION_EXPIRATION_MS = 24 * ONE_HOUR_MS;

// ============================================================================
// RATE LIMIT WINDOWS
// ============================================================================

/** 15 minutes window for rate limiting */
export const RATE_LIMIT_WINDOW_15MIN = 15 * ONE_MINUTE_MS;

/** 30 minutes window for rate limiting */
export const RATE_LIMIT_WINDOW_30MIN = 30 * ONE_MINUTE_MS;

// ============================================================================
// RATE LIMIT MAXIMUMS
// ============================================================================

export const RATE_LIMITS = {
  /** Auth password endpoints (login/register): 15 requests per 30 minutes */
  AUTH_PASSWORD: {
    windowMs: RATE_LIMIT_WINDOW_30MIN,
    max: 15,
  },
  
  /** Auth OAuth endpoints: 15 requests per 15 minutes */
  AUTH_OAUTH: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 15,
  },
  
  /** General auth endpoints (logout, verify, etc.): 25 requests per 30 minutes */
  AUTH_GENERAL: {
    windowMs: RATE_LIMIT_WINDOW_30MIN,
    max: 25,
  },
  
  /** Newsletter subscription: 3 requests per 15 minutes */
  SUBSCRIBE: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 3,
  },
  
  /** Admin endpoints: 60 requests per 15 minutes */
  ADMIN: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 60,
  },
  
  /** Tracking endpoints: 500 requests per 15 minutes */
  TRACKING: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 500,
  },
  
  /** General API endpoints: 100 requests per 15 minutes */
  API: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 100,
  },
  
  /** Global fallback: 200 requests per 15 minutes */
  GLOBAL: {
    windowMs: RATE_LIMIT_WINDOW_15MIN,
    max: 200,
  },
};

// ============================================================================
// TRACKING COOKIE NAMES
// ============================================================================

export const TRACKING_COOKIES = {
  /** Visitor ID cookie name */
  VISITOR_ID: 'ps_vid',
  
  /** Session ID cookie name */
  SESSION_ID: 'ps_sid',
  
  /** Traffic source cookie name */
  SOURCE: 'ps_src',
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Default JWT secret for development (should be overridden in production) */
export const DEFAULT_JWT_SECRET = 'dev_jwt_secret_change_me';

/** Default session secret for development (should be overridden in production) */
export const DEFAULT_SESSION_SECRET = 'dev_secret_change_me';
