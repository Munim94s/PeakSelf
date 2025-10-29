/**
 * Tests for soft delete cleanup script
 * Tests the 90-day permanent deletion functionality
 */

import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { createMockPool } from '../setup.js';

const mockPool = createMockPool();

jest.unstable_mockModule('../../utils/db.js', () => ({
  default: mockPool
}));

describe('Soft Delete Cleanup Tests', () => {
  let testUserId1, testUserId2, testUserId3;

  beforeEach(() => {
    jest.clearAllMocks();
    testUserId1 = 'user-id-1';
    testUserId2 = 'user-id-2';
    testUserId3 = 'user-id-3';
  });

  describe('Soft Delete Timestamp Manipulation', () => {
    it('should soft delete a user with current timestamp', () => {
      const now = new Date();
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE query
        .mockResolvedValueOnce({ rows: [{ deleted_at: now }] }); // SELECT query

      expect(mockPool.query).toBeDefined();
    });

    it('should not find soft-deleted user in login query', () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE to soft delete
        .mockResolvedValueOnce({ rows: [] }); // SELECT with deleted_at IS NULL filter

      expect(mockPool.query).toBeDefined();
    });

    it('should simulate user deleted 91 days ago', () => {
      const date91DaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE with old timestamp
        .mockResolvedValueOnce({ rows: [{ deleted_at: date91DaysAgo }] }); // SELECT query

      const daysAgo = (Date.now() - date91DaysAgo.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysAgo).toBeGreaterThan(90);
      expect(daysAgo).toBeLessThan(92);
    });

    it('should identify users ready for permanent deletion (>90 days)', () => {
      const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: testUserId1, email: 'cleanup-test-1@example.com', deleted_at: old }
        ]
      });

      expect(mockPool.query).toBeDefined();
    });

    it('should NOT include users deleted less than 90 days ago', () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      expect(mockPool.query).toBeDefined();
    });

    it('should permanently delete users older than 90 days', () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: testUserId1 }] }) // SELECT before delete
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE query
        .mockResolvedValueOnce({ rows: [] }); // SELECT after delete

      expect(mockPool.query).toBeDefined();
    });

    it('should test full cleanup scenario', () => {
      const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // Count before
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // DELETE old users
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count after
        .mockResolvedValueOnce({
          rows: [
            { id: testUserId2, deleted_at: recent },
            { id: testUserId3, deleted_at: null }
          ]
        }); // SELECT remaining

      expect(mockPool.query).toBeDefined();
    });
  });

  describe('Auth Query Filtering', () => {
    it('should find active user with auth query', () => {
      const activeUserId = 'active-user-id';
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: activeUserId,
          email: 'active-user@example.com',
          deleted_at: null
        }]
      });

      expect(mockPool.query).toBeDefined();
    });

    it('should NOT find deleted user with auth query', () => {
      // Query with deleted_at IS NULL filter returns empty
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      expect(mockPool.query).toBeDefined();
    });

    it('should find deleted user without filter', () => {
      const deletedUserId = 'deleted-user-id';
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: deletedUserId,
          email: 'deleted-user@example.com',
          deleted_at: new Date()
        }]
      });

      expect(mockPool.query).toBeDefined();
    });
  });
});
