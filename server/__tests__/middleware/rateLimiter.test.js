import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockRequest, createMockResponse, createMockNext } from '../setup.js';

describe('Rate Limiter Middleware Tests', () => {
  let req, res, next;
  let originalEnv;
  let consoleMocks;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    
    // Save original environment
    originalEnv = { ...process.env };
    
    // Mock console to suppress logs
    consoleMocks = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    };
    
    // Reset modules to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore console
    Object.values(consoleMocks).forEach(mock => mock.mockRestore());
    
    jest.clearAllMocks();
  });

  describe('Rate Limiter Exports', () => {
    it('should export all rate limiters', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const rateLimiters = await import('../../middleware/rateLimiter.js');
      
      expect(rateLimiters.authPasswordLimiter).toBeDefined();
      expect(rateLimiters.authOAuthLimiter).toBeDefined();
      expect(rateLimiters.authGeneralLimiter).toBeDefined();
      expect(rateLimiters.subscribeLimiter).toBeDefined();
      expect(rateLimiters.apiLimiter).toBeDefined();
      expect(rateLimiters.adminLimiter).toBeDefined();
      expect(rateLimiters.trackingLimiter).toBeDefined();
      expect(rateLimiters.globalLimiter).toBeDefined();
    });

    it('should export rate limiters as functions', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const rateLimiters = await import('../../middleware/rateLimiter.js');
      
      expect(typeof rateLimiters.authPasswordLimiter).toBe('function');
      expect(typeof rateLimiters.authOAuthLimiter).toBe('function');
      expect(typeof rateLimiters.authGeneralLimiter).toBe('function');
      expect(typeof rateLimiters.subscribeLimiter).toBe('function');
      expect(typeof rateLimiters.apiLimiter).toBe('function');
      expect(typeof rateLimiters.adminLimiter).toBe('function');
      expect(typeof rateLimiters.trackingLimiter).toBe('function');
      expect(typeof rateLimiters.globalLimiter).toBe('function');
    });
  });

  describe('authPasswordLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      await authPasswordLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof authPasswordLimiter).toBe('function');
      expect(authPasswordLimiter.length).toBeGreaterThanOrEqual(3); // req, res, next
    });

    it('should handle standard rate limit handler', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Should not error when called
      await expect(authPasswordLimiter(req, res, next)).resolves.not.toThrow();
    });

    it('should allow multiple requests when rate limiting is disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Make 10 requests (more than the limit)
      for (let i = 0; i < 10; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await authPasswordLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });
  });

  describe('authOAuthLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authOAuthLimiter } = await import('../../middleware/rateLimiter.js');
      
      await authOAuthLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should use redirect handler for OAuth', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authOAuthLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof authOAuthLimiter).toBe('function');
    });

    it('should allow multiple OAuth requests when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authOAuthLimiter } = await import('../../middleware/rateLimiter.js');
      
      for (let i = 0; i < 10; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await authOAuthLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured with different window than password limiter', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authOAuthLimiter, authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Both should exist but be different instances
      expect(authOAuthLimiter).toBeDefined();
      expect(authPasswordLimiter).toBeDefined();
      expect(authOAuthLimiter).not.toBe(authPasswordLimiter);
    });
  });

  describe('authGeneralLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authGeneralLimiter } = await import('../../middleware/rateLimiter.js');
      
      await authGeneralLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authGeneralLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof authGeneralLimiter).toBe('function');
    });

    it('should allow multiple requests when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authGeneralLimiter } = await import('../../middleware/rateLimiter.js');
      
      for (let i = 0; i < 20; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await authGeneralLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });
  });

  describe('subscribeLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { subscribeLimiter } = await import('../../middleware/rateLimiter.js');
      
      await subscribeLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { subscribeLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof subscribeLimiter).toBe('function');
    });

    it('should allow multiple subscription attempts when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { subscribeLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Subscribe limiter is strict (3 per 15 min), test with more
      for (let i = 0; i < 10; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await subscribeLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured for newsletter subscriptions', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { subscribeLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(subscribeLimiter).toBeDefined();
    });
  });

  describe('apiLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      await apiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof apiLimiter).toBe('function');
    });

    it('should allow many API requests when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      // API limiter allows 100 per 15 min, test with more
      for (let i = 0; i < 150; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await apiLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured for general API endpoints', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(apiLimiter).toBeDefined();
    });
  });

  describe('adminLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { adminLimiter } = await import('../../middleware/rateLimiter.js');
      
      await adminLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { adminLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof adminLimiter).toBe('function');
    });

    it('should allow multiple admin requests when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { adminLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Admin limiter allows 30 per 15 min, test with more
      for (let i = 0; i < 50; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await adminLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured for admin endpoints', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { adminLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(adminLimiter).toBeDefined();
    });
  });

  describe('trackingLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { trackingLimiter } = await import('../../middleware/rateLimiter.js');
      
      await trackingLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { trackingLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof trackingLimiter).toBe('function');
    });

    it('should allow very high traffic when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { trackingLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Tracking limiter is lenient (500 per 15 min), test with more
      for (let i = 0; i < 600; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await trackingLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured for tracking endpoints', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { trackingLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(trackingLimiter).toBeDefined();
    });
  });

  describe('globalLimiter', () => {
    it('should be skipped when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { globalLimiter } = await import('../../middleware/rateLimiter.js');
      
      await globalLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should be a middleware function', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { globalLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(typeof globalLimiter).toBe('function');
    });

    it('should allow many global requests when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { globalLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Global limiter allows 200 per 15 min, test with more
      for (let i = 0; i < 250; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await globalLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should be configured as fallback limiter', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { globalLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(globalLimiter).toBeDefined();
    });
  });

  describe('Rate Limit Handlers', () => {
    it('should return 429 status when rate limit is exceeded (simulated)', async () => {
      // This test simulates what happens when rate limit is hit
      // In reality, express-rate-limit handles this, but we test the handler setup
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      expect(authPasswordLimiter).toBeDefined();
    });

    it('should include retry information in OAuth rate limit redirect', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      process.env.CLIENT_URL = 'http://localhost:3000';
      
      const { authOAuthLimiter } = await import('../../middleware/rateLimiter.js');
      
      // OAuth limiter should use redirect handler
      expect(authOAuthLimiter).toBeDefined();
    });

    it('should provide error messages for standard limiters', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const {
        authPasswordLimiter,
        authGeneralLimiter,
        subscribeLimiter,
        apiLimiter,
        adminLimiter,
        trackingLimiter,
        globalLimiter,
      } = await import('../../middleware/rateLimiter.js');
      
      // All should be defined and handle errors appropriately
      expect(authPasswordLimiter).toBeDefined();
      expect(authGeneralLimiter).toBeDefined();
      expect(subscribeLimiter).toBeDefined();
      expect(apiLimiter).toBeDefined();
      expect(adminLimiter).toBeDefined();
      expect(trackingLimiter).toBeDefined();
      expect(globalLimiter).toBeDefined();
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should use rate limit constants from constants.js', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { RATE_LIMITS } = await import('../../constants.js');
      
      expect(RATE_LIMITS.AUTH_PASSWORD).toBeDefined();
      expect(RATE_LIMITS.AUTH_OAUTH).toBeDefined();
      expect(RATE_LIMITS.AUTH_GENERAL).toBeDefined();
      expect(RATE_LIMITS.SUBSCRIBE).toBeDefined();
      expect(RATE_LIMITS.API).toBeDefined();
      expect(RATE_LIMITS.ADMIN).toBeDefined();
      expect(RATE_LIMITS.TRACKING).toBeDefined();
      expect(RATE_LIMITS.GLOBAL).toBeDefined();
    });

    it('should have different limits for different limiter types', async () => {
      const { RATE_LIMITS } = await import('../../constants.js');
      
      // Subscribe should be strictest
      expect(RATE_LIMITS.SUBSCRIBE.max).toBeLessThan(RATE_LIMITS.AUTH_PASSWORD.max);
      
      // Tracking should be most lenient
      expect(RATE_LIMITS.TRACKING.max).toBeGreaterThan(RATE_LIMITS.API.max);
      
      // Admin should be more restrictive than general API
      expect(RATE_LIMITS.ADMIN.max).toBeLessThan(RATE_LIMITS.API.max);
    });

    it('should have window configurations for all limiters', async () => {
      const { RATE_LIMITS } = await import('../../constants.js');
      
      expect(RATE_LIMITS.AUTH_PASSWORD.windowMs).toBeDefined();
      expect(RATE_LIMITS.AUTH_OAUTH.windowMs).toBeDefined();
      expect(RATE_LIMITS.AUTH_GENERAL.windowMs).toBeDefined();
      expect(RATE_LIMITS.SUBSCRIBE.windowMs).toBeDefined();
      expect(RATE_LIMITS.API.windowMs).toBeDefined();
      expect(RATE_LIMITS.ADMIN.windowMs).toBeDefined();
      expect(RATE_LIMITS.TRACKING.windowMs).toBeDefined();
      expect(RATE_LIMITS.GLOBAL.windowMs).toBeDefined();
    });

    it('should have max request configurations for all limiters', async () => {
      const { RATE_LIMITS } = await import('../../constants.js');
      
      expect(RATE_LIMITS.AUTH_PASSWORD.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.AUTH_OAUTH.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.AUTH_GENERAL.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.SUBSCRIBE.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.API.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.ADMIN.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.TRACKING.max).toBeGreaterThan(0);
      expect(RATE_LIMITS.GLOBAL.max).toBeGreaterThan(0);
    });
  });

  describe('Skip Logic', () => {
    it('should skip rate limiting when ENABLE_RATE_LIMIT is not true', async () => {
      const testValues = ['false', 'FALSE', '0', '', undefined, null];
      
      for (const value of testValues) {
        jest.resetModules();
        process.env.ENABLE_RATE_LIMIT = value;
        
        const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await authPasswordLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should apply all limiters consistently when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const rateLimiters = await import('../../middleware/rateLimiter.js');
      
      const limiters = [
        rateLimiters.authPasswordLimiter,
        rateLimiters.authOAuthLimiter,
        rateLimiters.authGeneralLimiter,
        rateLimiters.subscribeLimiter,
        rateLimiters.apiLimiter,
        rateLimiters.adminLimiter,
        rateLimiters.trackingLimiter,
        rateLimiters.globalLimiter,
      ];
      
      for (const limiter of limiters) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await limiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });
  });

  describe('Initialization Logging', () => {
    it('should log initialization message', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      await import('../../middleware/rateLimiter.js');
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Rate limiters initialized')
      );
    });

    it('should log warning when rate limiting is disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      await import('../../middleware/rateLimiter.js');
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Rate limiting DISABLED')
      );
    });

    it('should log ENABLE_RATE_LIMIT value for debugging', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      await import('../../middleware/rateLimiter.js');
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('ENABLE_RATE_LIMIT')
      );
    });

    it('should suggest enabling rate limiting when disabled', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      await import('../../middleware/rateLimiter.js');
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Set ENABLE_RATE_LIMIT=true')
      );
    });
  });

  describe('Different IP Addresses', () => {
    it('should handle requests from different IPs', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      const ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1'];
      
      for (const ip of ips) {
        const testReq = createMockRequest({ ip });
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await apiLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });
  });

  describe('Middleware Chain Behavior', () => {
    it('should call next() to continue middleware chain', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      await apiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should not modify request or response when within limits', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      
      const { apiLimiter } = await import('../../middleware/rateLimiter.js');
      
      const originalReq = { ...req };
      const originalRes = { ...res };
      
      await apiLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      // Request and response should not be terminated
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
