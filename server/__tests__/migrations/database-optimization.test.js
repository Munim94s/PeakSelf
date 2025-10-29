import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMockPool } from '../setup.js';

const mockPool = createMockPool();
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../utils/db.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: mockLogger
}));

describe('Database Optimization Migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pg_stat_statements Migration', () => {
    let migration;

    beforeEach(async () => {
      migration = await import('../../migrations/enable_pg_stat_statements.js');
    });

    it('should enable pg_stat_statements extension', async () => {
      mockPool.query
        .mockResolvedValueOnce({}) // CREATE EXTENSION
        .mockResolvedValueOnce({ rows: [{ extname: 'pg_stat_statements', extversion: '1.11' }] }); // Verify

      await migration.up();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS pg_stat_statements')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('pg_stat_statements version 1.11 is now active')
      );
    });

    it('should handle extension already enabled', async () => {
      mockPool.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ extname: 'pg_stat_statements', extversion: '1.10' }] });

      await migration.up();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('pg_stat_statements version 1.10 is now active')
      );
    });

    it('should handle shared_preload_libraries error', async () => {
      const error = new Error('shared_preload_libraries');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(migration.up()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('shared_preload_libraries')
      );
    });

    it('should drop extension on down migration', async () => {
      mockPool.query.mockResolvedValueOnce({});

      await migration.down();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DROP EXTENSION IF EXISTS pg_stat_statements CASCADE')
      );
    });
  });

  describe('Performance Indexes Migration', () => {
    let migration;

    beforeEach(async () => {
      migration = await import('../../migrations/add_performance_indexes.js');
    });

    it('should create all performance indexes', async () => {
      // Mock BEGIN
      mockPool.query.mockResolvedValueOnce({});
      
      // Mock all 9 index creations
      for (let i = 0; i < 9; i++) {
        mockPool.query.mockResolvedValueOnce({});
      }
      
      // Mock COMMIT
      mockPool.query.mockResolvedValueOnce({});
      
      // Mock ANALYZE queries
      mockPool.query.mockResolvedValueOnce({});
      mockPool.query.mockResolvedValueOnce({});
      mockPool.query.mockResolvedValueOnce({});
      mockPool.query.mockResolvedValueOnce({});
      mockPool.query.mockResolvedValueOnce({});

      await migration.up();

      // Verify transaction started
      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      
      // Verify commit
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
      
      // Verify all indexes were created
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_traffic_events_source_time'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_users_role_verified'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_users_verified'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_user_sessions_visitor_time'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_user_sessions_user_time'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_session_events_session_time'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_traffic_events_time'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_newsletter_email'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('idx_blog_posts_status_time'));
    });

    it('should rollback on error', async () => {
      mockPool.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // First index
        .mockRejectedValueOnce(new Error('Index creation failed')) // Second index fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(migration.up()).rejects.toThrow('Index creation failed');
      
      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should drop all indexes on down migration', async () => {
      mockPool.query.mockResolvedValueOnce({}); // BEGIN
      
      // Mock all DROP INDEX queries
      for (let i = 0; i < 9; i++) {
        mockPool.query.mockResolvedValueOnce({});
      }
      
      mockPool.query.mockResolvedValueOnce({}); // COMMIT

      await migration.down();

      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Dropped all performance indexes'));
    });

    it('should create composite indexes correctly', async () => {
      mockPool.query.mockResolvedValue({});

      await migration.up();

      // Check that composite indexes include multiple columns
      const createIndexCalls = mockPool.query.mock.calls
        .filter(call => typeof call[0] === 'string' && call[0].includes('CREATE INDEX'));
      
      // Should have composite index for traffic_events(source, occurred_at DESC)
      const trafficIndex = createIndexCalls.find(call => 
        call[0].includes('idx_traffic_events_source_time')
      );
      expect(trafficIndex).toBeDefined();
      expect(trafficIndex[0]).toContain('source');
      expect(trafficIndex[0]).toContain('occurred_at DESC');
    });

    it('should create partial indexes with WHERE clauses', async () => {
      mockPool.query.mockResolvedValue({});

      await migration.up();

      const createIndexCalls = mockPool.query.mock.calls
        .filter(call => typeof call[0] === 'string' && call[0].includes('CREATE INDEX'));
      
      // Should have partial index for users with deleted_at IS NULL
      const usersIndex = createIndexCalls.find(call => 
        call[0].includes('idx_users_role_verified')
      );
      expect(usersIndex).toBeDefined();
      expect(usersIndex[0]).toContain('WHERE deleted_at IS NULL');
    });
  });

  describe('Migration Safety', () => {
    it('pg_stat_statements should use IF NOT EXISTS', async () => {
      const migration = await import('../../migrations/enable_pg_stat_statements.js');
      mockPool.query.mockResolvedValue({ rows: [{ extname: 'pg_stat_statements', extversion: '1.11' }] });

      await migration.up();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS')
      );
    });

    it('indexes should use IF NOT EXISTS', async () => {
      const migration = await import('../../migrations/add_performance_indexes.js');
      mockPool.query.mockResolvedValue({});

      await migration.up();

      const createIndexCalls = mockPool.query.mock.calls
        .filter(call => typeof call[0] === 'string' && call[0].includes('CREATE INDEX'));
      
      // All indexes should use IF NOT EXISTS
      createIndexCalls.forEach(call => {
        expect(call[0]).toContain('IF NOT EXISTS');
      });
    });
  });
});
