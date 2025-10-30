import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { success, badRequest } from '../utils/response.js';

const router = express.Router();

/**
 * POST /api/errors/log
 * Log frontend errors for monitoring and debugging
 */
router.post('/log', (req, res) => {
  try {
    const {
      message,
      stack,
      componentStack,
      userAgent,
      url,
      timestamp,
    } = req.body;

    // Validate required fields
    if (!message) {
      return badRequest(res, 'Error message is required');
    }

    // Generate unique error ID
    const errorId = uuidv4();

    // Log error with all context
    logger.error('Frontend Error:', {
      errorId,
      message,
      stack,
      componentStack,
      userAgent,
      url,
      timestamp,
      ip: req.ip,
    });

    // Return error ID to frontend
    return success(res, { errorId }, 'Error logged successfully');
  } catch (err) {
    // Even error logging can fail - log it and continue
    logger.error('Failed to log frontend error:', err);
    return success(res, null, 'Error received but logging failed');
  }
});

export default router;
