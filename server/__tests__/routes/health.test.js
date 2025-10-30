import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import { createMockPool } from '../setup.js';

// Mock the database pool
const mockPool = createMockPool();
jest.unstable_mockModule('../../utils/db.js', () => ({
  default: mockPool,
  pool: mockPool,
}));

// Mock logger
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    stream: { write: jest.fn() },
  },
}));

describe('Health Check Routes', () => {
  let app;
  let healthRouter;

  beforeAll(async () => {
    // Import router after mocks
    const healthModule = await import('../../routes/health.js');
    healthRouter = healthModule.default;

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all checks pass', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.database.status).toBe('up');
      expect(response.body.checks.database).toHaveProperty('latency');
      expect(response.body.checks.memory.status).toBe('ok');
    });

    it('should return unhealthy status when database is down', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('down');
      expect(response.body.checks.database).toHaveProperty('error');
      expect(response.body.checks.database.error).toContain('Connection refused');
    });

    it('should include version and environment info', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });

    it('should include memory usage information', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks.memory).toHaveProperty('total');
      expect(response.body.checks.memory).toHaveProperty('free');
      expect(response.body.checks.memory).toHaveProperty('used');
      expect(response.body.checks.memory).toHaveProperty('usagePercent');
      expect(response.body.checks.memory.total).toMatch(/GB$/);
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status when database is accessible', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
      expect(response.body.database.status).toBe('up');
      expect(response.body.database).toHaveProperty('latency');
    });

    it('should return not_ready status when database is down', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database unavailable'));

      const response = await request(app)
        .get('/api/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not_ready');
      expect(response.body.database.status).toBe('down');
      expect(response.body.database).toHaveProperty('error');
      expect(response.body.database.error).toContain('Database unavailable');
    });

    it('should measure database latency', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body.database.latency).toMatch(/\d+ms/);
    });
  });

  describe('GET /api/health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('pid');
    });

    it('should return current process uptime', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return current process PID', async () => {
      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(typeof response.body.pid).toBe('number');
      expect(response.body.pid).toBe(process.pid);
    });

    it('should not require database connectivity', async () => {
      // Even with database mock throwing errors, live should succeed
      mockPool.query.mockRejectedValue(new Error('Database down'));

      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
    });
  });

  describe('Response Format', () => {
    it('should return valid ISO 8601 timestamps', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(() => new Date(response.body.timestamp)).not.toThrow();
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return response times in milliseconds', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ health_check: 1 }],
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.responseTime).toMatch(/^\d+ms$/);
    });
  });
});
