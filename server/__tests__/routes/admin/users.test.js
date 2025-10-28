import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../../setup.js';

// Mock modules
const mockPool = createMockPool();
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });

jest.unstable_mockModule('../../../utils/db.js', () => ({
  default: mockPool,
  checkDatabaseAvailability: jest.fn(() => true),
}));

jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

const mockRateLimiter = (req, res, next) => next();
jest.unstable_mockModule('../../../middleware/rateLimiter.js', () => ({
  adminLimiter: mockRateLimiter,
}));

describe('Admin Users Routes Tests', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Mock requireAdmin middleware
    app.use((req, res, next) => {
      req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin' };
      next();
    });

    // Import and mount router
    const usersRouter = (await import('../../../routes/admin/users.js')).default;
    app.use('/api/admin/users', usersRouter);

    // Generate admin token
    adminToken = jwt.sign(
      { sub: 'admin-123', email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should list all users', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'user1@test.com', role: 'user', verified: true, name: 'User One' },
          { id: 'user-2', email: 'user2@test.com', role: 'admin', verified: true, name: 'Admin User' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].email).toBe('user1@test.com');
    });

    it('should filter admins only', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-2', email: 'admin@test.com', role: 'admin', verified: true, name: 'Admin User' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users?filter=admins')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].role).toBe('admin');
    });

    it('should filter unverified users', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-3', email: 'unverified@test.com', role: 'user', verified: false, name: null },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users?filter=unverified')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].verified).toBe(false);
    });

    it('should search users by email', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'john@test.com', role: 'user', verified: true, name: 'John' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users?q=john')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].email).toBe('john@test.com');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(500);

      expect(response.body.error).toBe('Failed to list users');
    });
  });

  describe('GET /api/admin/users/.csv', () => {
    it('should export users to CSV', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'user1@test.com', role: 'user', verified: true, name: 'User One' },
          { id: 'user-2', email: 'user2@test.com', role: 'admin', verified: false, name: null },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users/.csv')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('users.csv');
      expect(response.text).toContain('id,email,role,verified,name');
      expect(response.text).toContain('user1@test.com');
    });

    it('should handle CSV special characters', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'test@test.com', role: 'user', verified: true, name: 'Name, with comma' },
          { id: 'user-2', email: 'test2@test.com', role: 'user', verified: true, name: 'Name "with" quotes' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/users/.csv')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.text).toContain('"Name, with comma"');
      expect(response.text).toContain('Name ""with"" quotes');
    });
  });

  describe('POST /api/admin/users/:id/make-admin', () => {
    it('should promote user to admin', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'user@test.com', role: 'admin', verified: true, name: 'User' },
        ],
      });

      const response = await request(app)
        .post('/api/admin/users/user-1/make-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.user.role).toBe('admin');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET role'),
        ['user-1']
      );
    });

    it('should return 404 for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/admin/users/nonexistent/make-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('POST /api/admin/users/:id/remove-admin', () => {
    it('should demote admin to user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-2', email: 'demoted@test.com', role: 'user', verified: true, name: 'User' },
        ],
      });

      const response = await request(app)
        .post('/api/admin/users/user-2/remove-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.user.role).toBe('user');
    });

    it('should prevent removing own admin role', async () => {
      const response = await request(app)
        .post('/api/admin/users/admin-123/remove-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(400);

      expect(response.body.error).toBe('You cannot remove your own admin role');
    });

    it('should return 404 if user not found or not admin', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/admin/users/user-999/remove-admin')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('User not found or not an admin');
    });
  });

  describe('POST /api/admin/users/:id/restore', () => {
    it('should restore soft-deleted user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 'user-1', email: 'restored@test.com', role: 'user', verified: true, name: 'Restored' },
        ],
      });

      const response = await request(app)
        .post('/api/admin/users/user-1/restore')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.user.email).toBe('restored@test.com');
      expect(response.body.message).toBe('User restored successfully');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET deleted_at = NULL'),
        ['user-1']
      );
    });

    it('should return 404 for non-deleted user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/admin/users/user-999/restore')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('User not found or not deleted');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should soft delete user', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/admin/users/user-1')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET deleted_at'),
        ['user-1']
      );
    });

    it('should prevent deleting own account', async () => {
      const response = await request(app)
        .delete('/api/admin/users/admin-123')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(400);

      expect(response.body.error).toBe('You cannot delete your own account');
    });

    it('should return 404 for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const response = await request(app)
        .delete('/api/admin/users/nonexistent')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('User not found or already deleted');
    });
  });

  describe('POST /api/admin/users/invite', () => {
    it('should invite new user', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: 'new-user', email: 'new@test.com' }] }) // Insert user
        .mockResolvedValueOnce({ rows: [] }); // Insert token

      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ email: 'new@test.com', name: 'New User' })
        .expect(200);

      expect(response.body.message).toContain('Invitation sent');
    });

    it('should handle existing user invitation', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'existing', email: 'existing@test.com' }] }) // Check existing
        .mockResolvedValueOnce({ rows: [] }); // Insert token

      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ email: 'existing@test.com' })
        .expect(200);

      expect(response.body.message).toContain('Invitation sent');
    });

    it('should require email', async () => {
      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Email is required');
    });

    it('should handle email sending errors gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new', email: 'new@test.com' }] })
        .mockResolvedValueOnce({ rows: [] });

      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const response = await request(app)
        .post('/api/admin/users/invite')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ email: 'new@test.com' })
        .expect(200);

      expect(response.body.message).toContain('Invitation sent');
    });
  });
});
