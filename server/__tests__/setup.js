import { jest } from '@jest/globals';

// Set test environment variables before any modules are loaded
process.env.NODE_ENV = 'test';
process.env.PORT = '5555';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.SESSION_SECRET = 'test_session_secret_for_testing';
process.env.CSRF_SECRET = 'test_csrf_secret_for_testing';
process.env.ENABLE_RATE_LIMIT = 'false'; // Disable rate limiting for tests by default
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/peakself_test';
process.env.APP_BASE_URL = 'http://localhost:5555';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET = 'test_google_client_secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5555/api/auth/google/callback';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock nodemailer
export const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

// Helper function to create mock database pool
export function createMockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
}

// Helper function to create mock request
export function createMockRequest(overrides = {}) {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    cookies: {},
    user: null,
    session: {},
    get: jest.fn((key) => overrides.headers?.[key.toLowerCase()]),
    ip: '127.0.0.1',
    path: '/',
    method: 'GET',
    ...overrides,
  };
}

// Helper function to create mock response
export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
}

// Helper function to create mock next function
export function createMockNext() {
  return jest.fn();
}

// Helper to reset all mocks between tests
export function resetAllMocks() {
  jest.clearAllMocks();
  mockSendMail.mockClear();
}

// Clean up after all tests
afterEach(() => {
  resetAllMocks();
});
