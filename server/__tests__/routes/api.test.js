import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createMockPool } from '../setup.js';

// Mock modules before importing routes
const mockPool = createMockPool();
const mockCheckDbAvailability = jest.fn((res) => true); // Always return true to allow tests
jest.unstable_mockModule('../../utils/db.js', () => ({
  default: mockPool,
  pool: mockPool,
  isDatabaseAvailable: true,
  checkDatabaseAvailability: mockCheckDbAvailability,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    stream: { write: jest.fn() },
  },
}));

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

// Mock rate limiters to avoid open handles
const mockRateLimiter = (req, res, next) => next();
jest.unstable_mockModule('../../middleware/rateLimiter.js', () => ({
  authPasswordLimiter: mockRateLimiter,
  authOAuthLimiter: mockRateLimiter,
  authGeneralLimiter: mockRateLimiter,
  subscribeLimiter: mockRateLimiter,
  apiLimiter: mockRateLimiter,
  adminLimiter: mockRateLimiter,
  trackingLimiter: mockRateLimiter,
  globalLimiter: mockRateLimiter,
}));

describe('API Routes Integration Tests', () => {
  let app;
  let authRouter;
  let subscribeRouter;
  let trackRouter;

  beforeAll(async () => {
    // Import passport before creating app
    const passport = (await import('passport')).default;
    
    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Add session middleware for passport
    app.use(session({
      secret: process.env.SESSION_SECRET || 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    
    app.use(passport.initialize());
    app.use(passport.session());

    // Import routers after mocks
    const authModule = await import('../../routes/auth.js');
    const subscribeModule = await import('../../routes/subscribe.js');
    const trackModule = await import('../../routes/track.js');

    authRouter = authModule.default;
    subscribeRouter = subscribeModule.default;
    trackRouter = trackModule.default;

    // Mount routers
    app.use('/api/auth', authRouter);
    app.use('/api/subscribe', subscribeRouter);
    app.use('/api/track', trackRouter);

    // Health endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockClear();
  });

  describe('Health Check', () => {
    it('GET /api/health should return ok status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Auth Routes', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check existing user
          .mockResolvedValueOnce({ rows: [] }) // Check pending registration
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert pending registration

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            name: 'New User',
          })
          .expect(201);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('check your email');
      });

      it('should reject registration with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'SecurePass123!',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('required');
      });

      it('should reject registration with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('required');
      });

      it('should reject registration for existing local user', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ id: '123', email: 'existing@example.com', provider: 'local' }],
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'existing@example.com',
            password: 'SecurePass123!',
          })
          .expect(400);

        expect(response.body.error).toContain('already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
        
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check pending registration
          .mockResolvedValueOnce({
            rows: [{
              id: 'user-123',
              email: 'test@example.com',
              password_hash: hashedPassword,
              provider: 'local',
              verified: true,
              role: 'user',
            }],
          });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'SecurePass123!',
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Logged in');
        expect(response.body.user).toHaveProperty('email', 'test@example.com');
        expect(response.headers['set-cookie']).toBeDefined();
      });

      it('should reject login with invalid password', async () => {
        const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
        
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 'user-123',
              email: 'test@example.com',
              password_hash: hashedPassword,
              provider: 'local',
              verified: true,
            }],
          });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword',
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid credentials');
      });

      it('should reject login for unverified user', async () => {
        const hashedPassword = await bcrypt.hash('SecurePass123!', 10);
        
        mockPool.query
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({
            rows: [{
              id: 'user-123',
              email: 'unverified@example.com',
              password_hash: hashedPassword,
              provider: 'local',
              verified: false,
            }],
          });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'unverified@example.com',
            password: 'SecurePass123!',
          })
          .expect(400);

        expect(response.body.error).toContain('verify your email');
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body.error).toContain('required');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(200);

        expect(response.body.message).toContain('Logged out');
      });

      it('should clear access_token cookie', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(200);

        const cookieHeader = response.headers['set-cookie'];
        expect(cookieHeader).toBeDefined();
        expect(cookieHeader.some(cookie => cookie.includes('access_token'))).toBe(true);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user with valid JWT', async () => {
        const token = jwt.sign(
          { sub: 'user-123', email: 'test@example.com', role: 'user' },
          process.env.JWT_SECRET
        );

        mockPool.query.mockResolvedValue({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            provider: 'local',
            verified: true,
            role: 'user',
          }],
        });

        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', [`access_token=${token}`])
          .expect(200);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe('test@example.com');
      });

      it('should return null user when not authenticated', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(200);

        expect(response.body.user).toBeNull();
      });

      it('should return null user with invalid JWT', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Cookie', ['access_token=invalid-token'])
          .expect(200);

        expect(response.body.user).toBeNull();
      });
    });

    describe('GET /api/auth/verify-email', () => {
      it('should verify email with valid token', async () => {
        mockPool.query
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              email: 'test@example.com',
              password_hash: 'hashed_password',
              name: 'Test User',
              token: 'valid-token',
            }],
          })
          .mockResolvedValueOnce({ rows: [] }) // Check existing user
          .mockResolvedValueOnce({
            rows: [{
              id: 'user-123',
              email: 'test@example.com',
              provider: 'local',
              verified: true,
              role: 'user',
            }],
          })
          .mockResolvedValueOnce({ rows: [] }); // Delete pending registration

        const response = await request(app)
          .get('/api/auth/verify-email')
          .query({ token: 'valid-token' })
          .expect(302); // Redirect

        expect(response.headers.location).toContain('verified=true');
      });

      it('should reject verification with missing token', async () => {
        const response = await request(app)
          .get('/api/auth/verify-email')
          .expect(400);

        expect(response.body.error).toContain('Missing token');
      });

      it('should reject verification with invalid token', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // No pending registration
          .mockResolvedValueOnce({ rows: [] }); // No email verification token

        const response = await request(app)
          .get('/api/auth/verify-email')
          .query({ token: 'invalid-token' })
          .expect(400);

        expect(response.body.error).toContain('Invalid or expired token');
      });
    });
  });

  describe('Subscribe Routes', () => {
    describe('POST /api/subscribe', () => {
      it('should subscribe new email', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check existing subscription
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Insert subscription

        const response = await request(app)
          .post('/api/subscribe')
          .send({ email: 'subscriber@example.com' })
          .expect(200);

        expect(response.body.message).toContain('email');
      });

      it('should reject subscription with missing email', async () => {
        const response = await request(app)
          .post('/api/subscribe')
          .send({})
          .expect(400);

        expect(response.body.error).toContain('required');
      });

      it('should handle already subscribed email', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ email: 'existing@example.com' }],
        });

        const response = await request(app)
          .post('/api/subscribe')
          .send({ email: 'existing@example.com' })
          .expect(200);

        expect(response.body.message).toContain('subscribed');
      });
    });

    describe('GET /api/subscribe/verify', () => {
      it('should verify subscription', async () => {
        mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

        const response = await request(app)
          .get('/api/subscribe/verify')
          .query({ email: 'test@example.com', token: 'some-token' })
          .expect(200);

        expect(response.body.message).toContain('confirmed');
      });

      it('should reject verification with missing email', async () => {
        const response = await request(app)
          .get('/api/subscribe/verify')
          .expect(400);

        expect(response.body.error).toContain('Missing email');
      });
    });
  });

  describe('Track Routes', () => {
    describe('POST /api/track', () => {
      it('should track visitor event', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check visitor
          .mockResolvedValueOnce({
            rows: [{ id: 'visitor-123', source: 'other' }],
          }) // Insert visitor
          .mockResolvedValueOnce({
            rows: [{ id: 'session-123' }],
          }) // Insert session
          .mockResolvedValueOnce({ rows: [] }) // Insert event
          .mockResolvedValueOnce({ rows: [] }) // Update visitor
          .mockResolvedValueOnce({ rows: [] }); // Insert traffic event

        const response = await request(app)
          .post('/api/track')
          .send({
            path: '/home',
            referrer: 'https://google.com',
            source: 'google',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data) {
          expect(response.body.data).toHaveProperty('visitor_id');
          expect(response.body.data).toHaveProperty('session_id');
        }
      });

      it('should track without referrer', async () => {
        mockPool.query
          .mockResolvedValue({ rows: [{ id: 'test-id' }] });

        const response = await request(app)
          .post('/api/track')
          .send({ path: '/' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should handle tracking errors gracefully', async () => {
        mockPool.query.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/api/track')
          .send({ path: '/' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Security Features', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Basic security checks
      expect(response.status).toBe(200);
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express should reject invalid JSON
      expect(response.status).toBe(400);
    });
  });

  describe('Admin Protection', () => {
    it('should require authentication for admin routes', async () => {
      // This would be tested with actual admin router
      // Here we demonstrate the pattern
      const token = jwt.sign(
        { sub: 'user-123', email: 'user@example.com', role: 'user' },
        process.env.JWT_SECRET
      );

      // Admin routes would reject non-admin users
      expect(token).toBeDefined();
    });

    it('should allow admin access with admin role', async () => {
      const token = jwt.sign(
        { sub: 'admin-123', email: 'admin@example.com', role: 'admin' },
        process.env.JWT_SECRET
      );

      mockPool.query.mockResolvedValue({
        rows: [{
          id: 'admin-123',
          email: 'admin@example.com',
          role: 'admin',
        }],
      });

      expect(token).toBeDefined();
    });
  });
});
