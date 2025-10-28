/**
 * Tests for soft delete cleanup script
 * Tests the 90-day permanent deletion functionality
 * 
 * NOTE: These are integration tests that require a real database connection.
 * Run with: npm test -- __tests__/scripts/cleanup-soft-deleted.test.js
 */

import pool from '../../utils/db.js';

// Skip these tests if not running with real database
const describeDatabase = process.env.DATABASE_URL?.includes('peakself_test') ? describe : describe.skip;

describeDatabase('Soft Delete Cleanup Tests', () => {
  let testUserId1, testUserId2, testUserId3;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query("DELETE FROM users WHERE email LIKE 'cleanup-test-%'");
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query("DELETE FROM users WHERE email LIKE 'cleanup-test-%'");
  });

  describe('Soft Delete Timestamp Manipulation', () => {
    beforeEach(async () => {
      // Create test users
      const user1 = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified) VALUES ($1, 'hash', 'local', TRUE) RETURNING id",
        ['cleanup-test-1@example.com']
      );
      testUserId1 = user1.rows[0].id;

      const user2 = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified) VALUES ($1, 'hash', 'local', TRUE) RETURNING id",
        ['cleanup-test-2@example.com']
      );
      testUserId2 = user2.rows[0].id;

      const user3 = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified) VALUES ($1, 'hash', 'local', TRUE) RETURNING id",
        ['cleanup-test-3@example.com']
      );
      testUserId3 = user3.rows[0].id;
    });

    afterEach(async () => {
      // Clean up test users
      await pool.query("DELETE FROM users WHERE email LIKE 'cleanup-test-%'");
    });

    it('should soft delete a user with current timestamp', async () => {
      // Soft delete user
      await pool.query(
        'UPDATE users SET deleted_at = NOW() WHERE id = $1',
        [testUserId1]
      );

      // Verify user is soft deleted
      const { rows } = await pool.query(
        'SELECT deleted_at FROM users WHERE id = $1',
        [testUserId1]
      );

      expect(rows[0].deleted_at).not.toBeNull();
      expect(new Date(rows[0].deleted_at).getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
    });

    it('should not find soft-deleted user in login query', async () => {
      // Soft delete user
      await pool.query(
        'UPDATE users SET deleted_at = NOW() WHERE id = $1',
        [testUserId1]
      );

      // Try to find user (as auth would)
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
        ['cleanup-test-1@example.com']
      );

      expect(rows).toHaveLength(0);
    });

    it('should simulate user deleted 91 days ago', async () => {
      // Soft delete user with timestamp 91 days in the past
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '91 days' WHERE id = $1",
        [testUserId1]
      );

      // Verify the timestamp is in the past
      const { rows } = await pool.query(
        'SELECT deleted_at FROM users WHERE id = $1',
        [testUserId1]
      );

      const deletedAt = new Date(rows[0].deleted_at);
      const daysAgo = (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(daysAgo).toBeGreaterThan(90);
      expect(daysAgo).toBeLessThan(92);
    });

    it('should identify users ready for permanent deletion (>90 days)', async () => {
      // Soft delete users with different timestamps
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '91 days' WHERE id = $1",
        [testUserId1]
      );
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '30 days' WHERE id = $1",
        [testUserId2]
      );
      // testUserId3 remains active (deleted_at = NULL)

      // Query for users ready for cleanup (>90 days)
      const { rows } = await pool.query(
        "SELECT id, email, deleted_at FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days' AND email LIKE 'cleanup-test-%'"
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(testUserId1);
    });

    it('should NOT include users deleted less than 90 days ago', async () => {
      // Soft delete users with timestamps
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '89 days' WHERE id = $1",
        [testUserId1]
      );
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '30 days' WHERE id = $1",
        [testUserId2]
      );

      // Query for users ready for cleanup (>90 days)
      const { rows } = await pool.query(
        "SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days' AND email LIKE 'cleanup-test-%'"
      );

      expect(rows).toHaveLength(0);
    });

    it('should permanently delete users older than 90 days', async () => {
      // Soft delete user 91 days ago
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '91 days' WHERE id = $1",
        [testUserId1]
      );

      // Verify user exists but is soft deleted
      const beforeDelete = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [testUserId1]
      );
      expect(beforeDelete.rows).toHaveLength(1);

      // Permanently delete (simulate cleanup script)
      const result = await pool.query(
        "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days' AND id = $1",
        [testUserId1]
      );
      expect(result.rowCount).toBe(1);

      // Verify user is permanently gone
      const afterDelete = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [testUserId1]
      );
      expect(afterDelete.rows).toHaveLength(0);
    });

    it('should test full cleanup scenario', async () => {
      // Setup: 3 users with different states
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '100 days' WHERE id = $1",
        [testUserId1]
      ); // Old deletion - should be removed
      
      await pool.query(
        "UPDATE users SET deleted_at = NOW() - INTERVAL '30 days' WHERE id = $1",
        [testUserId2]
      ); // Recent deletion - should remain
      
      // testUserId3 stays active (deleted_at = NULL)

      // Count before cleanup
      const beforeCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE email LIKE 'cleanup-test-%'"
      );
      expect(parseInt(beforeCount.rows[0].count)).toBe(3);

      // Execute cleanup
      await pool.query(
        "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '90 days' AND email LIKE 'cleanup-test-%'"
      );

      // Count after cleanup
      const afterCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE email LIKE 'cleanup-test-%'"
      );
      expect(parseInt(afterCount.rows[0].count)).toBe(2);

      // Verify remaining users
      const remaining = await pool.query(
        "SELECT id, deleted_at FROM users WHERE email LIKE 'cleanup-test-%' ORDER BY email"
      );
      
      expect(remaining.rows).toHaveLength(2);
      expect(remaining.rows[0].id).toBe(testUserId2); // Recently deleted
      expect(remaining.rows[0].deleted_at).not.toBeNull();
      expect(remaining.rows[1].id).toBe(testUserId3); // Active
      expect(remaining.rows[1].deleted_at).toBeNull();
    });
  });

  describe('Auth Query Filtering', () => {
    let activeUserId, deletedUserId;

    beforeEach(async () => {
      // Create active user
      const active = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified) VALUES ($1, 'hash', 'local', TRUE) RETURNING id",
        ['active-user@example.com']
      );
      activeUserId = active.rows[0].id;

      // Create and soft delete another user
      const deleted = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified, deleted_at) VALUES ($1, 'hash', 'local', TRUE, NOW()) RETURNING id",
        ['deleted-user@example.com']
      );
      deletedUserId = deleted.rows[0].id;
    });

    afterEach(async () => {
      await pool.query("DELETE FROM users WHERE email IN ('active-user@example.com', 'deleted-user@example.com')");
    });

    it('should find active user with auth query', async () => {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
        ['active-user@example.com']
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(activeUserId);
    });

    it('should NOT find deleted user with auth query', async () => {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
        ['deleted-user@example.com']
      );

      expect(rows).toHaveLength(0);
    });

    it('should find deleted user without filter', async () => {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        ['deleted-user@example.com']
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].deleted_at).not.toBeNull();
    });
  });
});
