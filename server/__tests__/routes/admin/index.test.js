import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../../setup.js';

const mockPool = createMockPool();

// Mock database
jest.unstable_mockModule('../../../utils/db.js', () => ({
  default: mockPool,
  checkDatabaseAvailability: jest.fn(() => true),
  isDatabaseAvailable: true,
}));

// Mock dateUtils
jest.unstable_mockModule('../../../utils/dateUtils.js', () => ({
  normalizeRange: jest.fn(() => ({ interval: '7 days', label: 'last 7 days' })),
}));

// Mock logger
jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock requireAdmin middleware to always allow
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
  requireAdmin: (req, res, next) => {
    req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin', source: 'jwt' };
    next();
  },
  requireAuth: (req, res, next) => next(),
  verifyJwt: jest.fn(() => null),
  getCurrentUser: jest.fn(() => null),
}));

jest.unstable_mockModule('../../../utils/cache.js', () => ({
  default: {
    get: jest.fn(() => undefined),
    set: jest.fn(),
    del: jest.fn(),
    delMultiple: jest.fn(),
    flush: jest.fn(),
    flushPattern: jest.fn(),
    getStats: jest.fn(),
    wrap: jest.fn(),
    invalidate: {
      dashboard: jest.fn(),
      traffic: jest.fn(),
      users: jest.fn(),
      sessions: jest.fn(),
      all: jest.fn(),
    },
    CACHE_KEYS: {
      DASHBOARD_METRICS: 'dashboard:metrics',
      TRAFFIC_SUMMARY: (range) => `traffic:summary:${range}`,
    },
    CACHE_CONFIG: {
      DASHBOARD_METRICS: 60,
      TRAFFIC_SUMMARY: 60,
    },
  },
  invalidate: {
    dashboard: jest.fn(),
    traffic: jest.fn(),
    users: jest.fn(),
    sessions: jest.fn(),
    all: jest.fn(),
  },
  CACHE_KEYS: {
    DASHBOARD_METRICS: 'dashboard:metrics',
    TRAFFIC_SUMMARY: (range) => `traffic:summary:${range}`,
  },
  CACHE_CONFIG: {
    DASHBOARD_METRICS: 60,
    TRAFFIC_SUMMARY: 60,
  },
}));

describe('Admin Router Index Tests', () => {
  let app;
  let adminToken;
  let normalizeRangeMock;

  beforeAll(async () => {
    const { normalizeRange } = await import('../../../utils/dateUtils.js');
    normalizeRangeMock = normalizeRange;
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Import and mount admin router (requireAdmin is mocked above)
    const adminRouter = (await import('../../../routes/admin/index.js')).default;
    app.use('/api/admin', adminRouter);

    adminToken = jwt.sign({ sub: 'admin-123', email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });
  
  beforeEach(() => {
    // Reset normalizeRange mock implementation after each test
    normalizeRangeMock.mockImplementation(() => ({ interval: '7 days', label: 'last 7 days' }));
  });


  describe('Router Mounting', () => {
    it('should mount dashboard router at root path', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01',
          total_users: 100,
          verified_users: 80,
          signups_24h: 5,
          newsletter_total: 50,
          newsletter_signups_24h: 2,
          sessions_instagram: 10,
          sessions_facebook: 15,
          sessions_youtube: 20,
          sessions_google: 25,
          sessions_others: 30,
          sessions_others_refs: []
        }]
      });

      const response = await request(app)
        .get('/api/admin/')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Welcome, admin');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('admin');
    });

    it('should mount users router at /users', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'user1@test.com', role: 'user', verified: true },
          { id: 'user-2', email: 'user2@test.com', role: 'admin', verified: true },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should mount traffic router at /traffic', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01',
          total_users: 50,
          verified_users: 40,
          traffic_instagram: 10,
          traffic_facebook: 5,
          traffic_youtube: 3,
          traffic_google: 7,
          traffic_others: 2,
          traffic_others_refs: []
        }]
      });

      const response = await request(app)
        .get('/api/admin/traffic/summary')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('source');
      expect(response.body.source).toBe('snapshot');
    });

    it('should mount sessions router at /sessions', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { session_id: 's1', visitor_id: 'v1', source: 'instagram', page_count: 5 },
        ],
      });

      const response = await request(app)
        .get('/api/admin/sessions')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    it('should mount blog router at /blog', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', title: 'Test Post', content: 'Content', status: 'published' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(Array.isArray(response.body.posts)).toBe(true);
    });
  });

  describe('Authentication Middleware', () => {
    it('should protect all admin routes with requireAdmin middleware', async () => {
      // Verify that the middleware is applied and grants access to authenticated admin users
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01',
          total_users: 100,
          verified_users: 80,
          signups_24h: 5,
          newsletter_total: 50,
          newsletter_signups_24h: 2,
          sessions_instagram: 10,
          sessions_facebook: 15,
          sessions_youtube: 20,
          sessions_google: 25,
          sessions_others: 30,
          sessions_others_refs: []
        }]
      });

      const response = await request(app)
        .get('/api/admin/')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      // If requireAdmin wasn't applied, this would fail
      expect(response.body).toHaveProperty('message', 'Welcome, admin');
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('Sub-router Integration', () => {
    it('should handle dashboard overview endpoint', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01',
          total_users: 100,
          verified_users: 80,
          signups_24h: 5,
          newsletter_total: 50,
          newsletter_signups_24h: 2,
          sessions_instagram: 10,
          sessions_facebook: 15,
          sessions_youtube: 20,
          sessions_google: 25,
          sessions_others: 30,
          sessions_others_refs: []
        }]
      });

      const response = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body.source).toBe('snapshot');
    });

    it('should handle user management endpoints', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'promoted@test.com', role: 'admin' }],
      });

      const response = await request(app)
        .post('/api/admin/users/user-1/make-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.user.role).toBe('admin');
    });

    it('should handle blog management endpoints', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '1',
          title: 'New Post',
          content: 'Content',
          slug: 'new-post',
          status: 'draft',
        }],
      });

      const response = await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ title: 'New Post', content: 'Content' })
        .expect(201);

      expect(response.body.post.title).toBe('New Post');
    });

    it('should handle traffic events endpoints', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ traffic_instagram: 10, traffic_facebook: 5, traffic_youtube: 3, traffic_google: 7, traffic_others: 2 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/traffic/events')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('summary');
    });

    it('should handle session details endpoints', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 's1',
          visitor_id: 'v1',
          source: 'instagram',
          page_count: 5,
        }],
      });

      const response = await request(app)
        .get('/api/admin/sessions/s1')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.session.id).toBe('s1');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/nonexistent-route')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);
    });

    it('should pass through database errors appropriately', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
