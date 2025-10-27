import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { createMockRequest, createMockResponse, createMockNext, createMockPool } from '../setup.js';

// Mock the database pool
const mockPool = createMockPool();
jest.unstable_mockModule('../../utils/db.js', () => ({
  default: mockPool,
}));

describe('Authentication Middleware Tests', () => {
  let req, res, next;
  let authModule;

  beforeEach(async () => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    jest.clearAllMocks();
    
    // Import after mocks are set up
    authModule = await import('../../middleware/auth.js');
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('verifyJwt', () => {
    it('should verify valid JWT from cookie', () => {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      const result = authModule.verifyJwt(req);

      expect(result).toBeDefined();
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('user');
    });

    it('should verify valid JWT from Authorization header', () => {
      const payload = { sub: 'user-456', email: 'admin@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.headers = { authorization: `Bearer ${token}` };

      const result = authModule.verifyJwt(req);

      expect(result).toBeDefined();
      expect(result.sub).toBe('user-456');
      expect(result.email).toBe('admin@example.com');
      expect(result.role).toBe('admin');
    });

    it('should return null for invalid JWT', () => {
      req.cookies = { access_token: 'invalid-token' };

      const result = authModule.verifyJwt(req);

      expect(result).toBeNull();
    });

    it('should return null when no token provided', () => {
      const result = authModule.verifyJwt(req);

      expect(result).toBeNull();
    });

    it('should return null for expired JWT', () => {
      const payload = { sub: 'user-789', email: 'expired@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });
      req.cookies = { access_token: token };

      const result = authModule.verifyJwt(req);

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get user from JWT with source jwt', () => {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      const result = authModule.getCurrentUser(req);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        source: 'jwt',
      });
    });

    it('should get user from session with source session', () => {
      req.user = {
        id: 'user-456',
        email: 'session@example.com',
        role: 'user',
      };

      const result = authModule.getCurrentUser(req);

      expect(result).toEqual({
        id: 'user-456',
        email: 'session@example.com',
        role: 'user',
        source: 'session',
      });
    });

    it('should prefer JWT over session', () => {
      const payload = { sub: 'jwt-user', email: 'jwt@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };
      req.user = { id: 'session-user', email: 'session@example.com', role: 'user' };

      const result = authModule.getCurrentUser(req);

      expect(result.id).toBe('jwt-user');
      expect(result.source).toBe('jwt');
    });

    it('should return null when no authentication present', () => {
      const result = authModule.getCurrentUser(req);

      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated user via JWT', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      await authModule.requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.currentUser).toBeDefined();
      expect(req.currentUser.id).toBe('user-123');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow authenticated user via session', async () => {
      req.user = { id: 'user-456', email: 'session@example.com', role: 'user' };

      await authModule.requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.currentUser).toBeDefined();
      expect(req.currentUser.id).toBe('user-456');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      await authModule.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject user with invalid JWT', async () => {
      req.cookies = { access_token: 'invalid-token' };

      await authModule.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user with session', async () => {
      req.user = { id: 'admin-123', email: 'admin@example.com', role: 'admin' };

      await authModule.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.currentUser).toBeDefined();
      expect(req.currentUser.role).toBe('admin');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin user with JWT', async () => {
      const payload = { sub: 'admin-456', email: 'admin@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      await authModule.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.currentUser).toBeDefined();
      expect(req.currentUser.role).toBe('admin');
    });

    it('should reject non-admin user', async () => {
      const payload = { sub: 'user-123', email: 'user@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      // Mock database query to return non-admin role
      mockPool.query.mockResolvedValue({
        rows: [{ email: 'user@example.com', role: 'user' }],
      });

      await authModule.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', async () => {
      await authModule.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should verify admin role from database when JWT present', async () => {
      const payload = { sub: 'admin-789', email: 'admin@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      // Mock database query to confirm admin role
      mockPool.query.mockResolvedValue({
        rows: [{ email: 'admin@example.com', role: 'admin' }],
      });

      await authModule.requireAdmin(req, res, next);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT email, role FROM users'),
        [payload.sub]
      );
      expect(next).toHaveBeenCalled();
    });

    it('should reject when user role changed to non-admin in database', async () => {
      const payload = { sub: 'user-999', email: 'demoted@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      // Mock database showing user is no longer admin
      mockPool.query.mockResolvedValue({
        rows: [{ email: 'demoted@example.com', role: 'user' }],
      });

      await authModule.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const payload = { sub: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      // Mock database error
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await authModule.requireAdmin(req, res, next);

      // Should still allow if JWT says admin (fallback behavior)
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Authentication Integration', () => {
    it('should handle multiple authentication sources correctly', async () => {
      // JWT should take precedence
      const jwtPayload = { sub: 'jwt-user', email: 'jwt@example.com', role: 'admin' };
      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };
      req.user = { id: 'session-user', email: 'session@example.com', role: 'user' };

      const user = authModule.getCurrentUser(req);

      expect(user.id).toBe('jwt-user');
      expect(user.source).toBe('jwt');
    });

    it('should add currentUser to request in requireAuth', async () => {
      const payload = { sub: 'test-user', email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.cookies = { access_token: token };

      await authModule.requireAuth(req, res, next);

      expect(req.currentUser).toEqual({
        id: 'test-user',
        email: 'test@example.com',
        role: 'user',
        source: 'jwt',
      });
    });

    it('should add currentUser to request in requireAdmin', async () => {
      req.user = { id: 'admin-user', email: 'admin@example.com', role: 'admin' };

      await authModule.requireAdmin(req, res, next);

      expect(req.currentUser).toEqual({
        id: 'admin-user',
        email: 'admin@example.com',
        role: 'admin',
        source: 'session',
      });
    });
  });
});
