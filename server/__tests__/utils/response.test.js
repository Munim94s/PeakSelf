import { jest } from '@jest/globals';
import {
  success,
  error,
  paginated,
  noContent,
  created,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
  serviceUnavailable
} from '../../utils/response.js';

describe('API Response Helpers', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('success()', () => {
    it('should send a successful response with data', () => {
      const data = { id: 1, name: 'Test' };
      success(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data
      });
    });

    it('should send a successful response with message', () => {
      const message = 'Operation successful';
      success(mockRes, null, message);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message
      });
    });

    it('should send a successful response with data and message', () => {
      const data = { id: 1 };
      const message = 'User created';
      success(mockRes, data, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    it('should accept custom status code', () => {
      success(mockRes, { id: 1 }, null, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should send only success: true when no data or message', () => {
      success(mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true
      });
    });
  });

  describe('error()', () => {
    it('should send an error response with string message', () => {
      error(mockRes, 'Something went wrong', 500);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong'
      });
    });

    it('should send an error response with Error object', () => {
      const err = new Error('Database error');
      error(mockRes, err, 500);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });

    it('should include error details when provided', () => {
      const details = { field: 'email', issue: 'invalid format' };
      error(mockRes, 'Validation failed', 400, details);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details
      });
    });

    it('should default to 500 status code', () => {
      error(mockRes, 'Error');

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('paginated()', () => {
    it('should send paginated response with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = { page: 1, limit: 10, total: 25 };

      paginated(mockRes, data, pagination);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      });
    });

    it('should calculate hasNext and hasPrev correctly', () => {
      const data = [];
      const pagination = { page: 2, limit: 10, total: 25 };

      paginated(mockRes, data, pagination);

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.hasNext).toBe(true); // page 2 of 3
      expect(call.pagination.hasPrev).toBe(true); // page 2 > 1
    });

    it('should handle last page correctly', () => {
      const data = [];
      const pagination = { page: 3, limit: 10, total: 25 };

      paginated(mockRes, data, pagination);

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.hasNext).toBe(false); // last page
      expect(call.pagination.hasPrev).toBe(true);
    });

    it('should include optional message', () => {
      const data = [];
      const pagination = { page: 1, limit: 10, total: 0 };
      const message = 'No results found';

      paginated(mockRes, data, pagination, message);

      expect(mockRes.json.mock.calls[0][0].message).toBe(message);
    });

    it('should handle string page/limit/total values', () => {
      const data = [];
      const pagination = { page: '2', limit: '5', total: '12' };

      paginated(mockRes, data, pagination);

      const call = mockRes.json.mock.calls[0][0];
      expect(call.pagination.page).toBe(2);
      expect(call.pagination.limit).toBe(5);
      expect(call.pagination.total).toBe(12);
      expect(call.pagination.totalPages).toBe(3);
    });
  });

  describe('noContent()', () => {
    it('should send 204 No Content response', () => {
      noContent(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('created()', () => {
    it('should send 201 Created with data', () => {
      const data = { id: 1, name: 'New Resource' };
      created(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created successfully',
        data
      });
    });

    it('should allow custom message', () => {
      const message = 'User registered successfully';
      created(mockRes, { id: 1 }, message);

      expect(mockRes.json.mock.calls[0][0].message).toBe(message);
    });
  });

  describe('unauthorized()', () => {
    it('should send 401 Unauthorized', () => {
      unauthorized(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should allow custom message', () => {
      unauthorized(mockRes, 'Invalid token');

      expect(mockRes.json.mock.calls[0][0].error).toBe('Invalid token');
    });
  });

  describe('forbidden()', () => {
    it('should send 403 Forbidden', () => {
      forbidden(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden'
      });
    });

    it('should allow custom message', () => {
      forbidden(mockRes, 'Admin access required');

      expect(mockRes.json.mock.calls[0][0].error).toBe('Admin access required');
    });
  });

  describe('notFound()', () => {
    it('should send 404 Not Found', () => {
      notFound(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });

    it('should allow custom message', () => {
      notFound(mockRes, 'User not found');

      expect(mockRes.json.mock.calls[0][0].error).toBe('User not found');
    });
  });

  describe('badRequest()', () => {
    it('should send 400 Bad Request', () => {
      badRequest(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Bad request'
      });
    });

    it('should allow custom message and details', () => {
      const details = { email: 'Invalid email format' };
      badRequest(mockRes, 'Validation failed', details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details
      });
    });
  });

  describe('conflict()', () => {
    it('should send 409 Conflict', () => {
      conflict(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource conflict'
      });
    });

    it('should allow custom message', () => {
      conflict(mockRes, 'Email already exists');

      expect(mockRes.json.mock.calls[0][0].error).toBe('Email already exists');
    });
  });

  describe('serviceUnavailable()', () => {
    it('should send 503 Service Unavailable', () => {
      serviceUnavailable(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service temporarily unavailable'
      });
    });

    it('should allow custom message', () => {
      serviceUnavailable(mockRes, 'Database is down');

      expect(mockRes.json.mock.calls[0][0].error).toBe('Database is down');
    });
  });
});
