import express from 'express';
import pool from '../../utils/db.js';
import logger from '../../utils/logger.js';
import cache from '../../utils/cache.js';
import { paginated, success, error, serviceUnavailable } from '../../utils/response.js';

const router = express.Router();

/**
 * GET /api/admin/performance/queries
 * Get slow query statistics from pg_stat_statements
 */
router.get('/queries', async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      order_by = 'total_exec_time', // total_exec_time, mean_exec_time, calls, max_exec_time
      min_calls = 10, // Ignore queries with few calls (likely one-offs)
      filter = 'application' // all, application, system, extension
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Cache for 5 minutes
    const cacheKey = `performance:queries:${limit}:${page}:${order_by}:${min_calls}:${filter}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Check if pg_stat_statements extension is enabled
    const extensionCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as enabled
    `);

    if (!extensionCheck.rows[0].enabled) {
      return serviceUnavailable(res, 'pg_stat_statements extension is not enabled. Run the enable_pg_stat_statements migration to enable query tracking');
    }

    // Valid order_by options to prevent SQL injection
    const validOrderBy = ['total_exec_time', 'mean_exec_time', 'calls', 'max_exec_time'];
    const orderByColumn = validOrderBy.includes(order_by) ? order_by : 'total_exec_time';

    // Build filter conditions
    let filterConditions = ['calls >= $1', "query NOT LIKE '%pg_stat_statements%'"];
    
    if (filter === 'application') {
      // Exclude system catalog queries, CTEs with pg_ tables, and common GUI tool patterns
      filterConditions.push(
        "query NOT LIKE '%pg_%'",
        "query NOT LIKE '%information_schema%'",
        "query NOT LIKE 'SELECT name FROM pg_timezone_names%'",
        "query NOT LIKE 'with f as%'",
        "query NOT LIKE 'WITH%pg_%'",
        "query NOT LIKE 'do $$%'"
      );
    } else if (filter === 'system') {
      // Only system/catalog queries
      filterConditions.push(
        "(query LIKE '%pg_%' OR query LIKE '%information_schema%')"
      );
    } else if (filter === 'extension') {
      // Queries related to extensions and schemas
      filterConditions.push(
        "(query LIKE '%pg_extension%' OR query LIKE '%pg_namespace%' OR query LIKE 'with f as%')"
      );
    }
    // 'all' filter = no additional conditions

    const whereClause = filterConditions.join(' AND ');

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM pg_stat_statements
      WHERE ${whereClause}
    `, [parseInt(min_calls)]);

    const totalQueries = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalQueries / parseInt(limit));

    // Get slow query statistics with pagination
    const result = await pool.query(`
      SELECT 
        query,
        calls,
        ROUND(total_exec_time::numeric, 2) as total_exec_time_ms,
        ROUND(mean_exec_time::numeric, 2) as mean_exec_time_ms,
        ROUND(min_exec_time::numeric, 2) as min_exec_time_ms,
        ROUND(max_exec_time::numeric, 2) as max_exec_time_ms,
        ROUND(stddev_exec_time::numeric, 2) as stddev_exec_time_ms,
        rows as rows_returned,
        shared_blks_hit,
        shared_blks_read,
        CASE 
          WHEN (shared_blks_hit + shared_blks_read) > 0 
          THEN ROUND(100.0 * shared_blks_hit / (shared_blks_hit + shared_blks_read), 2)
          ELSE 0
        END as cache_hit_ratio
      FROM pg_stat_statements
      WHERE ${whereClause}
      ORDER BY ${orderByColumn} DESC
      LIMIT $2 OFFSET $3
    `, [parseInt(min_calls), parseInt(limit), offset]);

    const data = {
      queries: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_queries: totalQueries,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1
      },
      filters: {
        order_by: orderByColumn,
        min_calls: parseInt(min_calls),
        filter: filter
      }
    };

    const responseData = {
      queries: result.rows,
      filters: {
        order_by: orderByColumn,
        min_calls: parseInt(min_calls),
        filter: filter
      }
    };

    cache.set(cacheKey, responseData, 300); // Cache for 5 minutes
    return paginated(res, result.rows, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalQueries
    });

  } catch (err) {
    logger.error('Error fetching query statistics:', err);
    return error(res, 'Failed to fetch query statistics', 500, { details: err.message });
  }
});

/**
 * GET /api/admin/performance/summary
 * Get overall database performance summary
 */
router.get('/summary', async (req, res) => {
  try {
    // Cache for 2 minutes
    const cacheKey = 'performance:summary';
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Check if pg_stat_statements extension is enabled
    const extensionCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as enabled
    `);

    if (!extensionCheck.rows[0].enabled) {
      return serviceUnavailable(res, 'pg_stat_statements extension is not enabled. Run the enable_pg_stat_statements migration to enable query tracking');
    }

    // Get overall performance metrics
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_queries,
        SUM(calls) as total_executions,
        ROUND(SUM(total_exec_time)::numeric, 2) as total_time_ms,
        ROUND(AVG(mean_exec_time)::numeric, 2) as avg_query_time_ms,
        ROUND(MAX(max_exec_time)::numeric, 2) as slowest_query_ms,
        SUM(shared_blks_hit) as cache_hits,
        SUM(shared_blks_read) as disk_reads,
        CASE 
          WHEN (SUM(shared_blks_hit) + SUM(shared_blks_read)) > 0 
          THEN ROUND(100.0 * SUM(shared_blks_hit) / (SUM(shared_blks_hit) + SUM(shared_blks_read)), 2)
          ELSE 0
        END as overall_cache_hit_ratio
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
    `);

    // Get query counts by type
    const appQueriesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%pg_%'
        AND query NOT LIKE '%information_schema%'
        AND query NOT LIKE 'SELECT name FROM pg_timezone_names%'
        AND query NOT LIKE 'with f as%'
        AND query NOT LIKE 'WITH%pg_%'
        AND query NOT LIKE 'do $$%'
    `);

    const systemQueriesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND (query LIKE '%pg_%' OR query LIKE '%information_schema%')
    `);

    const extensionQueriesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND (query LIKE '%pg_extension%' OR query LIKE '%pg_namespace%' OR query LIKE 'with f as%')
    `);

    // Get database size
    const dbSizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `);

    // Get active connections
    const connectionsResult = await pool.query(`
      SELECT 
        COUNT(*) as active_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_queries,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const data = {
      query_stats: result.rows[0],
      query_breakdown: {
        application: parseInt(appQueriesResult.rows[0].count),
        system: parseInt(systemQueriesResult.rows[0].count),
        extension: parseInt(extensionQueriesResult.rows[0].count)
      },
      database_size: dbSizeResult.rows[0].database_size,
      connections: connectionsResult.rows[0]
    };

    cache.set(cacheKey, data, 120); // Cache for 2 minutes
    return success(res, data);

  } catch (error) {
    logger.error('Error fetching performance summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch performance summary',
      details: error.message 
    });
  }
});

/**
 * POST /api/admin/performance/reset
 * Reset pg_stat_statements statistics (clears all tracked query data)
 */
router.post('/reset', async (req, res) => {
  try {
    // Check if pg_stat_statements extension is enabled
    const extensionCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
      ) as enabled
    `);

    if (!extensionCheck.rows[0].enabled) {
      return res.status(503).json({
        error: 'pg_stat_statements extension is not enabled'
      });
    }

    // Reset statistics
    await pool.query('SELECT pg_stat_statements_reset()');

    // Clear related caches
    cache.invalidate('performance:');

    logger.info('pg_stat_statements statistics reset by admin');
    res.json({ 
      message: 'Query statistics reset successfully'
    });

  } catch (error) {
    logger.error('Error resetting query statistics:', error);
    res.status(500).json({ 
      error: 'Failed to reset query statistics',
      details: error.message 
    });
  }
});

export default router;
