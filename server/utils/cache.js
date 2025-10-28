import NodeCache from 'node-cache';
import logger from './logger.js';

/**
 * Cache configuration with different TTLs for different data types
 * TTL is in seconds
 */
const CACHE_CONFIG = {
  DASHBOARD_METRICS: 60,   // 60 seconds
  TRAFFIC_SUMMARY: 60,     // 60 seconds
  USER_STATS: 60,          // 60 seconds
  SESSION_STATS: 60,       // 60 seconds
  DEFAULT: 60              // 60 seconds default
};

/**
 * Cache keys for consistency
 */
export const CACHE_KEYS = {
  DASHBOARD_METRICS: 'dashboard:metrics',
  TRAFFIC_SUMMARY: (range) => `traffic:summary:${range}`,
  TRAFFIC_SOURCES: (range) => `traffic:sources:${range}`,
  USER_STATS: 'users:stats',
  SESSION_STATS: (range) => `sessions:stats:${range}`,
  RECENT_SESSIONS: 'sessions:recent'
};

/**
 * Initialize cache instance
 * - stdTTL: default TTL in seconds
 * - checkperiod: automatic check for expired keys (every 10 minutes)
 * - useClones: clone variables to prevent external modifications
 */
const cache = new NodeCache({
  stdTTL: CACHE_CONFIG.DEFAULT,
  checkperiod: 600,
  useClones: true
});

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
export const get = (key) => {
  const value = cache.get(key);
  return value;
};

/**
 * Set value in cache with optional TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Optional TTL in seconds (uses default if not provided)
 * @returns {boolean} Success status
 */
export const set = (key, value, ttl) => {
  const success = cache.set(key, value, ttl);
  if (!success) {
    logger.warn(`Cache SET failed: ${key}`);
  }
  return success;
};

/**
 * Delete specific key from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
export const del = (key) => {
  const count = cache.del(key);
  return count;
};

/**
 * Delete multiple keys from cache
 * @param {string[]} keys - Array of cache keys
 * @returns {number} Number of deleted entries
 */
export const delMultiple = (keys) => {
  const count = cache.del(keys);
  return count;
};

/**
 * Clear all cache entries
 */
export const flush = () => {
  cache.flushAll();
};

/**
 * Clear cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'traffic:*')
 */
export const flushPattern = (pattern) => {
  const keys = cache.keys();
  const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
  const matchingKeys = keys.filter(key => regex.test(key));
  
  if (matchingKeys.length > 0) {
    const count = cache.del(matchingKeys);
    return count;
  }
  return 0;
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
export const getStats = () => {
  return cache.getStats();
};

/**
 * Wrapper function to cache query results
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to execute if cache miss
 * @param {number} ttl - Optional TTL in seconds
 * @returns {Promise<*>} Cached or fresh data
 */
export const wrap = async (key, fn, ttl) => {
  // Try to get from cache first
  const cached = get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss - execute function
  try {
    const result = await fn();
    set(key, result, ttl);
    return result;
  } catch (error) {
    logger.error(`Cache wrap error for key ${key}: ${error.message}`);
    throw error;
  }
};

/**
 * Cache invalidation helpers
 */
export const invalidate = {
  // Clear all dashboard-related caches
  dashboard: () => {
    return del(CACHE_KEYS.DASHBOARD_METRICS);
  },

  // Clear all traffic-related caches
  traffic: () => {
    return flushPattern('traffic:*');
  },

  // Clear all user-related caches
  users: () => {
    return flushPattern('users:*');
  },

  // Clear all session-related caches
  sessions: () => {
    return flushPattern('sessions:*');
  },

  // Clear all caches (use sparingly)
  all: () => {
    flush();
  }
};

// Export cache configuration for reference
export { CACHE_CONFIG };

// Default export
export default {
  get,
  set,
  del,
  delMultiple,
  flush,
  flushPattern,
  getStats,
  wrap,
  invalidate,
  CACHE_KEYS,
  CACHE_CONFIG
};
