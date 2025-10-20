import { Pool } from "pg";
import logger from "./logger.js";

// Validate DATABASE_URL environment variable
const dbUrl = process.env.DATABASE_URL;
if (typeof dbUrl !== 'string' || !dbUrl) {
  throw new Error('DATABASE_URL environment variable is not set or is not a string. Please ensure it is correctly configured.');
}

// Create single shared database pool instance
// This pool is shared across all routes to prevent connection exhaustion
const pool = new Pool({ 
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Track database availability status
let isDatabaseAvailable = false;

// Test database connection on startup
pool.connect(async (err, client, release) => {
  if (err) {
    logger.warn('Warning: Database connection failed:', err.message);
    logger.warn('Server will start but database features will not work.');
    logger.warn('For local development, consider setting up a local PostgreSQL database.');
    isDatabaseAvailable = false;
  } else {
    logger.info('Database connected successfully');
    isDatabaseAvailable = true;
    release();
  }
});

// Helper function to check if database operations should be attempted
function checkDatabaseAvailability(res) {
  if (!isDatabaseAvailable) {
    res.status(503).json({ 
      error: "Database unavailable", 
      message: "Database connection is not available. Please check your database configuration." 
    });
    return false;
  }
  return true;
}

// Export pool instance and utilities
export { pool, isDatabaseAvailable, checkDatabaseAvailability };
export default pool;
