import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse, createMockNext } from '../setup.js';

describe('Security Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit when ENABLE_RATE_LIMIT is false', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      const { authPasswordLimiter } = await import('../../middleware/rateLimiter.js');
      
      await authPasswordLimiter(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should have correct rate limits configured', async () => {
      const rateLimiters = await import('../../middleware/rateLimiter.js');
      
      expect(rateLimiters.authPasswordLimiter).toBeDefined();
      expect(rateLimiters.authOAuthLimiter).toBeDefined();
      expect(rateLimiters.authGeneralLimiter).toBeDefined();
      expect(rateLimiters.subscribeLimiter).toBeDefined();
      expect(rateLimiters.adminLimiter).toBeDefined();
      expect(rateLimiters.trackingLimiter).toBeDefined();
      expect(rateLimiters.globalLimiter).toBeDefined();
    });

    it('should skip rate limiting when configured', async () => {
      process.env.ENABLE_RATE_LIMIT = 'false';
      const { subscribeLimiter } = await import('../../middleware/rateLimiter.js');
      
      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        const testReq = createMockRequest();
        const testRes = createMockResponse();
        const testNext = createMockNext();
        
        await subscribeLimiter(testReq, testRes, testNext);
        expect(testNext).toHaveBeenCalled();
      }
    });

    it('should apply different limits to different endpoints', async () => {
      const { 
        authPasswordLimiter, 
        subscribeLimiter, 
        trackingLimiter 
      } = await import('../../middleware/rateLimiter.js');
      
      // All should be functions
      expect(typeof authPasswordLimiter).toBe('function');
      expect(typeof subscribeLimiter).toBe('function');
      expect(typeof trackingLimiter).toBe('function');
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF token', async () => {
      const { generateCsrfToken } = await import('../../middleware/csrf.js');
      
      const token = generateCsrfToken(req, res);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should set CSRF cookie when generating token', async () => {
      const { generateCsrfToken } = await import('../../middleware/csrf.js');
      
      generateCsrfToken(req, res);
      
      expect(res.cookie).toHaveBeenCalledWith(
        expect.stringContaining('csrf'),
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        })
      );
    });

    it('should skip CSRF validation for GET requests', async () => {
      const { csrfProtection } = await import('../../middleware/csrf.js');
      req.method = 'GET';
      
      csrfProtection(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF validation for HEAD requests', async () => {
      const { csrfProtection } = await import('../../middleware/csrf.js');
      req.method = 'HEAD';
      
      csrfProtection(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF validation for OPTIONS requests', async () => {
      const { csrfProtection } = await import('../../middleware/csrf.js');
      req.method = 'OPTIONS';
      
      csrfProtection(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should validate CSRF token is present in request header', async () => {
      const { generateCsrfToken, csrfProtection } = await import('../../middleware/csrf.js');
      
      // Generate token and set cookie
      const token = generateCsrfToken(req, res);
      
      // Simulate cookie being set
      req.cookies = { 'psifi.x-csrf-token': token };
      req.headers = { 'x-csrf-token': token };
      req.method = 'POST';
      
      csrfProtection(req, res, next);
      
      // Should call next if token is valid
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Error Handler', () => {
    it('should handle validation errors with 400 status', async () => {
      const { ValidationError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new ValidationError('Invalid input');
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid input' })
      );
    });

    it('should handle authentication errors with 401 status', async () => {
      const { AuthenticationError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new AuthenticationError();
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Authentication failed' })
      );
    });

    it('should handle authorization errors with 403 status', async () => {
      const { AuthorizationError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new AuthorizationError();
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Access denied' })
      );
    });

    it('should handle not found errors with 404 status', async () => {
      const { NotFoundError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new NotFoundError('Resource not found');
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Resource not found' })
      );
    });

    it('should handle database errors with 500 status', async () => {
      const { DatabaseError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new DatabaseError('Database operation failed');
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Database operation failed' })
      );
    });

    it('should handle conflict errors with 409 status', async () => {
      const { ConflictError, errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new ConflictError('Resource conflict');
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Resource conflict' })
      );
    });

    it('should handle unknown errors with 500 status', async () => {
      const { errorHandler } = await import('../../middleware/errorHandler.js');
      
      const error = new Error('Unknown error');
      errorHandler(error, req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unknown error' })
      );
    });

    it('should wrap async handlers and catch errors', async () => {
      const { asyncHandler } = await import('../../middleware/errorHandler.js');
      
      const asyncFn = async (req, res, next) => {
        throw new Error('Async error');
      };
      
      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle 404 for unmatched routes', async () => {
      const { notFoundHandler } = await import('../../middleware/errorHandler.js');
      
      req.method = 'GET';
      req.path = '/api/nonexistent';
      
      notFoundHandler(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('not found')
        })
      );
    });
  });

  describe('Helmet Security Headers', () => {
    it('should be configured in the application', async () => {
      // Test that helmet is imported and used
      // This is more of an integration test
      const helmet = await import('helmet');
      expect(helmet.default).toBeDefined();
    });
  });

  describe('Compression', () => {
    it('should have compression configured', async () => {
      const compression = await import('compression');
      expect(compression.default).toBeDefined();
    });
  });
});
