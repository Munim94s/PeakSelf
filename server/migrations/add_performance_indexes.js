/**
 * Migration: Add performance indexes
 * Adds composite and partial indexes to optimize common query patterns
 * Based on analysis from pg_stat_statements
 */

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

export async function up() {
  logger.info('Running migration: add_performance_indexes (up)');
  
  try {
    await pool.query('BEGIN');
    
    // 1. Index for traffic analytics queries (source-based filtering with time ordering)
    // Optimizes: SELECT ... FROM traffic_events WHERE source = 'instagram' ORDER BY occurred_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_traffic_events_source_time 
      ON traffic_events(source, occurred_at DESC)
    `);
    logger.info('Created index: idx_traffic_events_source_time');
    
    // 2. Index for admin user management (role + verification status filtering)
    // Optimizes: SELECT ... FROM users WHERE role = 'user' AND verified = TRUE
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role_verified 
      ON users(role, verified)
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index: idx_users_role_verified');
    
    // 3. Partial index for verified users only (common query pattern)
    // Optimizes: SELECT COUNT(*) FROM users WHERE verified = TRUE
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_verified 
      ON users(id)
      WHERE verified = TRUE AND deleted_at IS NULL
    `);
    logger.info('Created index: idx_users_verified');
    
    // 4. Index for user sessions by visitor (visitor-based queries with time ordering)
    // Optimizes: SELECT ... FROM user_sessions WHERE visitor_id = ? ORDER BY started_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_visitor_time 
      ON user_sessions(visitor_id, started_at DESC)
    `);
    logger.info('Created index: idx_user_sessions_visitor_time');
    
    // 5. Index for user sessions by user_id (user activity tracking)
    // Optimizes: SELECT ... FROM user_sessions WHERE user_id = ? ORDER BY started_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_time 
      ON user_sessions(user_id, started_at DESC)
      WHERE user_id IS NOT NULL
    `);
    logger.info('Created index: idx_user_sessions_user_time');
    
    // 6. Index for session_events lookups (session event queries with time ordering)
    // Optimizes: SELECT ... FROM session_events WHERE session_id = ? ORDER BY occurred_at DESC
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_session_events_session_time 
      ON session_events(session_id, occurred_at DESC)
    `);
    logger.info('Created index: idx_session_events_session_time');
    
    // 7. Index for traffic events time-based queries (dashboard metrics)
    // Optimizes: SELECT ... FROM traffic_events WHERE occurred_at >= ? AND occurred_at <= ?
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_traffic_events_time 
      ON traffic_events(occurred_at DESC)
    `);
    logger.info('Created index: idx_traffic_events_time');
    
    // 8. Index for newsletter subscriptions email lookup (uniqueness check)
    // Optimizes: SELECT ... FROM newsletter_subscriptions WHERE email = ?
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_email 
      ON newsletter_subscriptions(email)
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index: idx_newsletter_email');
    
    // 9. Index for blog posts status filtering (listing posts by status)
    // Optimizes: SELECT ... FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC
    // Note: blog_posts doesn't have soft deletes, so no deleted_at filter needed
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status_time 
      ON blog_posts(status, created_at DESC)
    `);
    logger.info('Created index: idx_blog_posts_status_time');
    
    await pool.query('COMMIT');
    logger.info('Migration add_performance_indexes completed successfully');
    
    // Analyze tables to update statistics
    logger.info('Analyzing tables to update query planner statistics...');
    await pool.query('ANALYZE traffic_events');
    await pool.query('ANALYZE users');
    await pool.query('ANALYZE user_sessions');
    await pool.query('ANALYZE newsletter_subscriptions');
    await pool.query('ANALYZE blog_posts');
    logger.info('Table analysis complete');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Migration add_performance_indexes failed:', error);
    throw error;
  }
}

export async function down() {
  logger.info('Running migration: add_performance_indexes (down)');
  
  try {
    await pool.query('BEGIN');
    
    // Drop all indexes in reverse order
    await pool.query('DROP INDEX IF EXISTS idx_blog_posts_status_time');
    await pool.query('DROP INDEX IF EXISTS idx_newsletter_email');
    await pool.query('DROP INDEX IF EXISTS idx_traffic_events_time');
    await pool.query('DROP INDEX IF EXISTS idx_session_events_session_time');
    await pool.query('DROP INDEX IF EXISTS idx_user_sessions_user_time');
    await pool.query('DROP INDEX IF EXISTS idx_user_sessions_visitor_time');
    await pool.query('DROP INDEX IF EXISTS idx_users_verified');
    await pool.query('DROP INDEX IF EXISTS idx_users_role_verified');
    await pool.query('DROP INDEX IF EXISTS idx_traffic_events_source_time');
    logger.info('Dropped all performance indexes');
    
    await pool.query('COMMIT');
    logger.info('Migration add_performance_indexes rolled back successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Migration add_performance_indexes rollback failed:', error);
    throw error;
  }
}
