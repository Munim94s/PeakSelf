import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createMockPool } from '../../setup.js';

// Mock modules
const mockPool = createMockPool();
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn()
};

jest.unstable_mockModule('../../../utils/db.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../../../utils/cache.js', () => ({
  default: mockCache
}));

jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Admin Performance Routes', () => {
  let app;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Mock requireAdmin middleware
    app.use((req, res, next) => {
      req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin' };
      next();
    });

    // Import and mount router
    const performanceRouter = (await import('../../../routes/admin/performance.js')).default;
    app.use('/api/admin/performance', performanceRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.get.mockReturnValue(null);
    mockCache.set.mockReturnValue(true);
  });

  describe('GET /api/admin/performance/summary', () => {
    it('should return performance summary', async () => {
      // Mock queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ enabled: true }] })
        .mockResolvedValueOnce({ rows: [{ total_queries: 42 }] })
        .mockResolvedValueOnce({ rows: [{ count: 15 }] })
        .mockResolvedValueOnce({ rows: [{ count: 20 }] })
        .mockResolvedValueOnce({ rows: [{ count: 7 }] })
        .mockResolvedValueOnce({ rows: [{ database_size: '128 MB' }] })
        .mockResolvedValueOnce({ rows: [{ active_connections: 5 }] });

      const res = await request(app).get('/api/admin/performance/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('query_stats');
      expect(res.body.data).toHaveProperty('query_breakdown');
      expect(res.body.data).toHaveProperty('database_size');
      expect(res.body.data).toHaveProperty('connections');
    });

    it('should return 503 if extension not enabled', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ enabled: false }] });

      const res = await request(app).get('/api/admin/performance/summary');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not enabled');
    });
  });

  describe('GET /api/admin/performance/queries', () => {
    it('should return paginated queries', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ enabled: true }] })
        .mockResolvedValueOnce({ rows: [{ total: 100 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/admin/performance/queries')
        .query({ filter: 'application' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('POST /api/admin/performance/reset', () => {
    it('should reset query statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ enabled: true }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/api/admin/performance/reset');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset successfully');
      expect(mockCache.invalidate).toHaveBeenCalledWith('performance:');
    });
  });
});
