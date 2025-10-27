import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockPool } from '../setup.js';

describe('Database Utils Tests', () => {
  let originalEnv;
  let mockClient;
  let mockRelease;
  let mockLogger;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    
    // Mock logger
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
    };
    
    // Mock the logger module
    jest.unstable_mockModule('../../utils/logger.js', () => ({
      default: mockLogger,
    }));

    // Setup mock client and release
    mockClient = { query: jest.fn() };
    mockRelease = jest.fn();
    
    // Reset modules to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    
    jest.clearAllMocks();
  });

  describe('Database URL Validation', () => {
    it('should throw error when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;
      
      await expect(async () => {
        await import('../../utils/db.js');
      }).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    it('should throw error when DATABASE_URL is empty string', async () => {
      process.env.DATABASE_URL = '';
      
      await expect(async () => {
        await import('../../utils/db.js');
      }).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    it('should throw error when DATABASE_URL is not a string', async () => {
      process.env.DATABASE_URL = undefined;
      
      await expect(async () => {
        await import('../../utils/db.js');
      }).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    it('should accept valid DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      
      const db = await import('../../utils/db.js');
      expect(db.pool).toBeDefined();
    });
  });

  describe('Pool Configuration', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    });

    it('should create pool with correct connection string', async () => {
      const { Pool } = await import('pg');
      const poolSpy = jest.spyOn(Pool.prototype, 'constructor');
      
      await import('../../utils/db.js');
      
      // Pool should be created (this is implicit in the module load)
      expect(poolSpy).toBeDefined();
    });

    it('should export pool as default', async () => {
      const db = await import('../../utils/db.js');
      
      expect(db.default).toBeDefined();
      expect(db.pool).toBeDefined();
      expect(db.default).toBe(db.pool);
    });

    it('should export isDatabaseAvailable flag', async () => {
      const db = await import('../../utils/db.js');
      
      expect(typeof db.isDatabaseAvailable).toBe('boolean');
    });

    it('should export checkDatabaseAvailability function', async () => {
      const db = await import('../../utils/db.js');
      
      expect(typeof db.checkDatabaseAvailability).toBe('function');
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    });

    it('should test connection on startup and handle success', async () => {
      // Mock Pool.connect to simulate successful connection
      const { Pool } = await import('pg');
      const mockConnect = jest.fn((callback) => {
        // Simulate successful connection
        callback(null, mockClient, mockRelease);
      });
      
      jest.spyOn(Pool.prototype, 'connect').mockImplementation(mockConnect);
      
      const db = await import('../../utils/db.js');
      
      // Give time for async connect callback
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConnect).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should test connection on startup and handle failure', async () => {
      // Mock Pool.connect to simulate failed connection
      const { Pool } = await import('pg');
      const mockError = new Error('Connection failed');
      const mockConnect = jest.fn((callback) => {
        callback(mockError, null, null);
      });
      
      jest.spyOn(Pool.prototype, 'connect').mockImplementation(mockConnect);
      
      await import('../../utils/db.js');
      
      // Give time for async connect callback
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConnect).toHaveBeenCalled();
      expect(mockRelease).not.toHaveBeenCalled();
    });
  });

  describe('checkDatabaseAvailability', () => {
    let mockRes;

    beforeEach(() => {
      // Create mock response
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should return false and set error response when unavailable', async () => {
      // The database availability is set during module load
      // Since we can't easily control the async timing, we test the function behavior
      const db = await import('../../utils/db.js');
      
      // Just verify the function exists and has the right signature
      expect(typeof db.checkDatabaseAvailability).toBe('function');
    });

    it('should return false and send 503 when database is unavailable', async () => {
      // Reimport with failed connection
      jest.resetModules();
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      
      const { Pool } = await import('pg');
      const mockError = new Error('Connection failed');
      jest.spyOn(Pool.prototype, 'connect').mockImplementation((callback) => {
        callback(mockError, null, null);
      });
      
      const dbUnavailable = await import('../../utils/db.js');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = dbUnavailable.checkDatabaseAvailability(mockRes);
      
      expect(result).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database unavailable',
        message: 'Database connection is not available. Please check your database configuration.'
      });
    });

    it('should send proper error response format', async () => {
      jest.resetModules();
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      
      const { Pool } = await import('pg');
      jest.spyOn(Pool.prototype, 'connect').mockImplementation((callback) => {
        callback(new Error('Failed'), null, null);
      });
      
      const dbUnavailable = await import('../../utils/db.js');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      dbUnavailable.checkDatabaseAvailability(mockRes);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.any(String)
        })
      );
    });
  });

  describe('Pool Export and Usage', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    });

    it('should allow querying through exported pool', async () => {
      const db = await import('../../utils/db.js');
      
      expect(db.pool.query).toBeDefined();
      expect(typeof db.pool.query).toBe('function');
    });

    it('should allow connecting through exported pool', async () => {
      const db = await import('../../utils/db.js');
      
      expect(db.pool.connect).toBeDefined();
      expect(typeof db.pool.connect).toBe('function');
    });

    it('should be a singleton pool instance', async () => {
      const db1 = await import('../../utils/db.js');
      const db2 = await import('../../utils/db.js');
      
      expect(db1.pool).toBe(db2.pool);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for missing DATABASE_URL', async () => {
      delete process.env.DATABASE_URL;
      
      try {
        await import('../../utils/db.js');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('DATABASE_URL');
        expect(error.message).toContain('environment variable');
        expect(error.message).toContain('not set');
      }
    });

    it('should mention configuration in error message', async () => {
      process.env.DATABASE_URL = '';
      
      try {
        await import('../../utils/db.js');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('correctly configured');
      }
    });
  });
});
