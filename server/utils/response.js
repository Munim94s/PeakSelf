/**
 * Standardized API response helpers
 * Provides consistent response formats across all API endpoints
 */

/**
 * Send a successful response
 * @param {object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function success(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true,
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {string|Error} error - Error message or Error object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {object} details - Additional error details
 */
export function error(res, error, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: typeof error === 'string' ? error : error.message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 * @param {object} res - Express response object
 * @param {Array} data - Array of items
 * @param {object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total number of items
 * @param {string} message - Optional success message
 */
export function paginated(res, data, pagination, message = null) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  const response = {
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  if (message) {
    response.message = message;
  }

  return res.status(200).json(response);
}

/**
 * Send a 204 No Content response
 * @param {object} res - Express response object
 */
export function noContent(res) {
  return res.status(204).send();
}

/**
 * Send a created response (201)
 * @param {object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} message - Optional success message
 */
export function created(res, data = null, message = 'Resource created successfully') {
  return success(res, data, message, 201);
}

/**
 * Send an unauthorized response (401)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

/**
 * Send a forbidden response (403)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

/**
 * Send a not found response (404)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

/**
 * Send a bad request response (400)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {object} details - Validation error details
 */
export function badRequest(res, message = 'Bad request', details = null) {
  return error(res, message, 400, details);
}

/**
 * Send a conflict response (409)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function conflict(res, message = 'Resource conflict') {
  return error(res, message, 409);
}

/**
 * Send a service unavailable response (503)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function serviceUnavailable(res, message = 'Service temporarily unavailable') {
  return error(res, message, 503);
}
