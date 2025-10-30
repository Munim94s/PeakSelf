import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  stream: { write: jest.fn() },
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger,
}));

describe('Error Logging Routes', () => {
  let app;
  let errorsRouter;

  beforeAll(async () => {
    // Import router after mocks
    const errorsModule = await import('../../routes/errors.js');
    errorsRouter = errorsModule.default;

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/errors', errorsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/errors/log', () => {
    it('should log frontend error successfully', async () => {
      const errorData = {
        message: 'Test error message',
        stack: 'Error: Test error\n  at Component',
        componentStack: '  at ErrorTest\n  at App',
        userAgent: 'Mozilla/5.0',
        url: 'http://localhost:3000/test',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('errorId');
      expect(response.body.data.errorId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.objectContaining({
          errorId: expect.any(String),
          message: errorData.message,
          stack: errorData.stack,
          componentStack: errorData.componentStack,
          userAgent: errorData.userAgent,
          url: errorData.url,
        })
      );
    });

    it('should reject error without message', async () => {
      const errorData = {
        stack: 'Error stack',
        userAgent: 'Mozilla/5.0',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('message is required');
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        'Frontend Error:',
        expect.anything()
      );
    });

    it('should handle errors with minimal data', async () => {
      const errorData = {
        message: 'Minimal error',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('errorId');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.objectContaining({
          message: 'Minimal error',
        })
      );
    });

    it('should log all provided error context', async () => {
      const errorData = {
        message: 'Detailed error',
        stack: 'Full stack trace',
        componentStack: 'Component hierarchy',
        userAgent: 'Browser info',
        url: 'http://example.com/page',
        timestamp: '2025-10-30T12:00:00Z',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.objectContaining({
          message: errorData.message,
          stack: errorData.stack,
          componentStack: errorData.componentStack,
          userAgent: errorData.userAgent,
          url: errorData.url,
          timestamp: errorData.timestamp,
        })
      );
    });

    it('should include IP address in logged error', async () => {
      const errorData = {
        message: 'Test error',
      };

      await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.objectContaining({
          ip: expect.any(String),
        })
      );
    });

    it('should handle TypeError messages', async () => {
      const errorData = {
        message: "TypeError: Cannot read property 'name' of null",
        stack: 'TypeError: Cannot read property \'name\' of null\n  at Component',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle ReferenceError messages', async () => {
      const errorData = {
        message: 'ReferenceError: variable is not defined',
        stack: 'ReferenceError: variable is not defined\n  at Component',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should generate unique error IDs', async () => {
      const errorData = {
        message: 'Test error',
      };

      const response1 = await request(app)
        .post('/api/errors/log')
        .send(errorData);

      const response2 = await request(app)
        .post('/api/errors/log')
        .send(errorData);

      expect(response1.body.data.errorId).not.toBe(response2.body.data.errorId);
    });

    it('should handle long error messages', async () => {
      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const errorData = {
        message: longMessage,
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Frontend Error:',
        expect.objectContaining({
          message: longMessage,
        })
      );
    });

    it('should handle special characters in error messages', async () => {
      const errorData = {
        message: 'Error with special chars: <script>alert("xss")</script>',
      };

      const response = await request(app)
        .post('/api/errors/log')
        .send(errorData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
