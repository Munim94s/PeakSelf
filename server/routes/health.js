import express from 'express';
import { pool } from '../utils/db.js';
import logger from '../utils/logger.js';
import os from 'os';

const router = express.Router();

/**
 * Check database connectivity
 * @returns {Promise<{healthy: boolean, latency?: number, error?: string}>}
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 as health_check');
    const latency = Date.now() - start;
    
    if (result.rows.length > 0 && result.rows[0].health_check === 1) {
      return { healthy: true, latency };
    }
    return { healthy: false, error: 'Unexpected query result' };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { healthy: false, error: error.message };
  }
}

/**
 * Check disk space availability
 * @returns {object} Disk space information
 */
function checkDiskSpace() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  return {
    total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    usagePercent: `${memUsagePercent}%`,
    healthy: parseFloat(memUsagePercent) < 90, // Consider unhealthy if >90% used
  };
}

/**
 * GET /api/health
 * Comprehensive health check with all system components
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  // Check database
  const dbHealth = await checkDatabase();
  
  // Check disk/memory
  const diskHealth = checkDiskSpace();
  
  // Overall health status
  const isHealthy = dbHealth.healthy && diskHealth.healthy;
  const statusCode = isHealthy ? 200 : 503;
  
  const responseTime = Date.now() - startTime;
  
  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    checks: {
      database: {
        status: dbHealth.healthy ? 'up' : 'down',
        latency: dbHealth.latency ? `${dbHealth.latency}ms` : undefined,
        error: dbHealth.error,
      },
      memory: {
        status: diskHealth.healthy ? 'ok' : 'critical',
        total: diskHealth.total,
        free: diskHealth.free,
        used: diskHealth.used,
        usagePercent: diskHealth.usagePercent,
      },
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /api/health/ready
 * Kubernetes readiness probe - checks if the service is ready to accept traffic
 * Returns 200 if database is accessible, 503 otherwise
 */
router.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabase();
  
  if (dbHealth.healthy) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: {
        status: 'up',
        latency: `${dbHealth.latency}ms`,
      },
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: {
        status: 'down',
        error: dbHealth.error,
      },
    });
  }
});

/**
 * GET /api/health/live
 * Kubernetes liveness probe - checks if the service is alive
 * Returns 200 if the process is running (always succeeds if reachable)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid,
  });
});

export default router;
