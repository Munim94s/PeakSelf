# PeakSelf Test Suite

Comprehensive automated testing for all PeakSelf security features, authentication, authorization, rate limiting, CSRF protection, and API endpoints.

## Overview

This test suite provides comprehensive coverage for:

- **Security Middleware**: Helmet, CSRF protection, rate limiting, compression
- **Authentication**: JWT tokens, session-based auth, OAuth flows
- **Authorization**: User and admin role verification
- **API Routes**: All auth, subscribe, and tracking endpoints
- **Error Handling**: Custom error classes and middleware
- **Integration Tests**: Full user flows from registration to login

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (during development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

```
__tests__/
├── setup.js                      # Test environment setup and mocks
├── README.md                     # This file
├── middleware/
│   ├── security.test.js         # Security middleware tests
│   └── auth.test.js             # Authentication middleware tests
└── routes/
    └── api.test.js              # API route integration tests
```

## Test Coverage

### Security Middleware (`middleware/security.test.js`)

#### Rate Limiting
- ✅ Allows requests when rate limiting is disabled
- ✅ Has correct rate limiters configured for all endpoints
- ✅ Skips rate limiting when `ENABLE_RATE_LIMIT=false`
- ✅ Applies different limits to different endpoint types:
  - Password auth: 15 requests per 30 minutes
  - OAuth auth: 15 requests per 15 minutes
  - General auth: 25 requests per 30 minutes
  - Subscribe: 3 requests per 15 minutes
  - Admin: 60 requests per 15 minutes
  - Tracking: 500 requests per 15 minutes
  - Global: 200 requests per 15 minutes

#### CSRF Protection
- ✅ Generates CSRF tokens
- ✅ Sets CSRF cookie with proper security options
- ✅ Skips validation for GET requests
- ✅ Skips validation for HEAD requests
- ✅ Skips validation for OPTIONS requests
- ✅ Validates CSRF token from request headers

#### Error Handler
- ✅ Handles validation errors (400)
- ✅ Handles authentication errors (401)
- ✅ Handles authorization errors (403)
- ✅ Handles not found errors (404)
- ✅ Handles database errors (500)
- ✅ Handles conflict errors (409)
- ✅ Handles unknown errors (500)
- ✅ Wraps async handlers and catches errors
- ✅ Handles 404 for unmatched routes

#### Helmet & Compression
- ✅ Helmet security headers configured
- ✅ Compression middleware configured

### Authentication Middleware (`middleware/auth.test.js`)

#### JWT Verification
- ✅ Verifies valid JWT from cookie
- ✅ Verifies valid JWT from Authorization header
- ✅ Returns null for invalid JWT
- ✅ Returns null when no token provided
- ✅ Returns null for expired JWT

#### Get Current User
- ✅ Gets user from JWT with source 'jwt'
- ✅ Gets user from session with source 'session'
- ✅ Prefers JWT over session
- ✅ Returns null when no authentication present

#### Require Auth Middleware
- ✅ Allows authenticated user via JWT
- ✅ Allows authenticated user via session
- ✅ Rejects unauthenticated user
- ✅ Rejects user with invalid JWT

#### Require Admin Middleware
- ✅ Allows admin user with session
- ✅ Allows admin user with JWT
- ✅ Rejects non-admin user
- ✅ Rejects unauthenticated user
- ✅ Verifies admin role from database when JWT present
- ✅ Rejects when user role changed to non-admin in database
- ✅ Handles database errors gracefully

### API Routes (`routes/api.test.js`)

#### Health Check
- ✅ GET /api/health returns ok status

#### Auth Routes
**POST /api/auth/register**
- ✅ Registers a new user
- ✅ Rejects registration with missing email
- ✅ Rejects registration with missing password
- ✅ Rejects registration for existing local user

**POST /api/auth/login**
- ✅ Logs in with valid credentials
- ✅ Rejects login with invalid password
- ✅ Rejects login for unverified user
- ✅ Rejects login with missing credentials

**POST /api/auth/logout**
- ✅ Logs out successfully
- ✅ Clears access_token cookie

**GET /api/auth/me**
- ✅ Returns current user with valid JWT
- ✅ Returns null user when not authenticated
- ✅ Returns null user with invalid JWT

**GET /api/auth/verify-email**
- ✅ Verifies email with valid token
- ✅ Rejects verification with missing token
- ✅ Rejects verification with invalid token

#### Subscribe Routes
**POST /api/subscribe**
- ✅ Subscribes new email
- ✅ Rejects subscription with missing email
- ✅ Handles already subscribed email

**GET /api/subscribe/verify**
- ✅ Verifies subscription
- ✅ Rejects verification with missing email

#### Track Routes
**POST /api/track**
- ✅ Tracks visitor event
- ✅ Tracks without referrer
- ✅ Handles tracking errors gracefully

#### Security Features
- ✅ Includes security headers
- ✅ Handles invalid JSON gracefully

#### Admin Protection
- ✅ Requires authentication for admin routes
- ✅ Allows admin access with admin role

## Test Environment

The test suite uses the following environment variables (configured in `setup.js`):

```bash
NODE_ENV=test
PORT=5555
CLIENT_URL=http://localhost:3000
JWT_SECRET=test_jwt_secret_for_testing_only
SESSION_SECRET=test_session_secret_for_testing
CSRF_SECRET=test_csrf_secret_for_testing
ENABLE_RATE_LIMIT=false  # Disabled for tests
DATABASE_URL=postgresql://test:test@localhost:5432/peakself_test
APP_BASE_URL=http://localhost:5555
GOOGLE_CLIENT_ID=test_google_client_id
GOOGLE_CLIENT_SECRET=test_google_client_secret
```

## Mocking Strategy

### Database
- Uses mock database pool with jest mocks
- All database queries are mocked at the test level
- No actual database connection required for tests

### Email
- Nodemailer is mocked to prevent sending actual emails
- Email sending is verified through mock function calls

### Console
- Console methods (log, info, warn, error) are mocked to reduce test noise

## Test Utilities

The `setup.js` file provides helper functions:

- `createMockPool()` - Creates a mock database pool
- `createMockRequest()` - Creates a mock Express request object
- `createMockResponse()` - Creates a mock Express response object
- `createMockNext()` - Creates a mock Express next function
- `resetAllMocks()` - Resets all mocks between tests

## Writing New Tests

### Example Test

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockRequest, createMockResponse, createMockNext } from '../setup.js';

describe('My Feature', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it('should do something', async () => {
    // Arrange
    const myMiddleware = await import('../../middleware/myMiddleware.js');
    
    // Act
    await myMiddleware.default(req, res, next);
    
    // Assert
    expect(next).toHaveBeenCalled();
  });
});
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Run tests
  run: npm test

- name: Generate coverage report
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    directory: ./server/coverage
```

## Coverage Goals

Target coverage metrics:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Debugging Tests

### Run a single test file
```bash
npm test -- __tests__/middleware/auth.test.js
```

### Run tests matching a pattern
```bash
npm test -- -t "should verify valid JWT"
```

### Debug with verbose output
```bash
npm test -- --verbose
```

## Known Limitations

1. **OAuth Flow**: Google OAuth callback testing requires additional mocking of passport strategies
2. **Database Transactions**: Tests don't use actual database transactions
3. **Session Storage**: Session store is mocked, not using actual PostgreSQL session table
4. **File Uploads**: Multipart form data and file uploads not fully tested

## Future Improvements

- [ ] Add end-to-end tests with actual database
- [ ] Add performance/load testing for rate limiters
- [ ] Add tests for admin routes
- [ ] Add tests for blog post routes
- [ ] Add security penetration testing
- [ ] Add snapshot testing for API responses
- [ ] Add contract testing for API schemas

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass before committing
3. Maintain or improve code coverage
4. Update this README if adding new test categories

## Support

For questions or issues with tests, check:
- Jest documentation: https://jestjs.io/
- Supertest documentation: https://github.com/ladjs/supertest
- Project issues: [GitHub Issues](https://github.com/yourrepo/issues)
