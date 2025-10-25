import logger from '../utils/logger.js';

// Custom error classes
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

// Centralized error handler middleware
export function errorHandler(err, req, res, next) {
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  
  // Log error details
  const logData = {
    error: err.name || 'Error',
    message: err.message,
    path: req.path,
    method: req.method,
    statusCode
  };

  if (statusCode >= 500) {
    logger.error('Server error:', logData);
    if (err.originalError) {
      logger.error('Original error:', err.originalError);
    }
    if (err.stack && process.env.NODE_ENV !== 'production') {
      logger.error('Stack trace:', err.stack);
    }
  } else if (statusCode >= 400) {
    logger.warn('Client error:', logData);
  }

  // Prepare response
  const response = {
    error: err.message || 'An error occurred',
  };

  // Include additional details in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    response.type = err.name;
    if (err.details) {
      response.details = err.details;
    }
    if (err.stack) {
      response.stack = err.stack;
    }
  }

  // Send response
  res.status(statusCode).json(response);
}

// Async error wrapper - wraps async route handlers to catch errors
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler for unmatched routes
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}
