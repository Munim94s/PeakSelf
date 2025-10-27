import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../../setup.js';

// Mock modules
const mockPool = createMockPool();

jest.unstable_mockModule('../../../utils/db.js', () => ({
  default: mockPool,
}));

jest.unstable_mockModule('../../../utils/dateUtils.js', () => ({
  normalizeRange: jest.fn((range, fallback) => ({ interval: '7 days', label: 'last 7 days' })),
}));

describe('Admin Dashboard Routes Tests', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Mock requireAdmin middleware
    app.use((req, res, next) => {
      req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin', source: 'jwt' };
      next();
    });

    const dashboardRouter = (await import('../../../routes/admin/dashboard.js')).default;
    app.use('/api/admin', dashboardRouter);

    adminToken = jwt.sign(
      { sub: 'admin-123', email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/', () => {
    it('should return admin welcome message', async () => {
      const response = await request(app)
        .get('/api/admin/')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.message).toBe('Welcome, admin');
      expect(response.body.user).toEqual({
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'admin',
        authSource: 'jwt',
      });
      expect(response.body.sections).toHaveLength(4);
      expect(response.body.sections[0].key).toBe('overview');
    });
  });

  describe('GET /api/admin/overview', () => {
    it('should return snapshot data when available', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01T00:00:00Z',
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

      expect(response.body.source).toBe('snapshot');
      expect(response.body.total_users).toBe(100);
      expect(response.body.verified_users).toBe(80);
    });

    it('should fallback to live data when snapshot unavailable', async () => {
      mockPool.query
        .mockRejectedValueOnce(new Error('View does not exist'))
        .mockResolvedValueOnce({
          rows: [{
            total_users: 50,
            verified_users: 40,
            signups_24h: 3,
            newsletter_total: 25,
            newsletter_signups_24h: 1,
            sessions_instagram: 5,
            sessions_facebook: 8,
            sessions_youtube: 10,
            sessions_google: 12,
            sessions_others: 15,
            sessions_others_refs: []
          }]
        });

      const response = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.source).toBe('live');
      expect(response.body.total_users).toBe(50);
    });

    it('should return empty snapshot when no data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Should trigger fallback
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_users: 0,
          verified_users: 0,
          signups_24h: 0,
          newsletter_total: 0,
          newsletter_signups_24h: 0,
          sessions_instagram: 0,
          sessions_facebook: 0,
          sessions_youtube: 0,
          sessions_google: 0,
          sessions_others: 0,
          sessions_others_refs: []
        }]
      });

      const response = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockPool.query
        .mockRejectedValueOnce(new Error('DB error'))
        .mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch dashboard');
    });

    it('should include sessions_others_refs in response', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          snapshot_at: '2024-01-01T00:00:00Z',
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
          sessions_others_refs: [{ ref: 'twitter.com', cnt: 10 }, { ref: 'reddit.com', cnt: 5 }]
        }]
      });

      const response = await request(app)
        .get('/api/admin/overview')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.sessions_others_refs).toHaveLength(2);
      expect(response.body.sessions_others_refs[0].ref).toBe('twitter.com');
    });
  });
});
