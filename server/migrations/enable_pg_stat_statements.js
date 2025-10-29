/**
 * Migration: Enable pg_stat_statements extension
 * Enables query performance tracking for database optimization
 * Note: Requires PostgreSQL to have pg_stat_statements in shared_preload_libraries
 */

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

export async function up() {
  logger.info('Running migration: enable_pg_stat_statements (up)');
  
  try {
    // Enable the pg_stat_statements extension
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pg_stat_statements
    `);
    logger.info('Enabled pg_stat_statements extension');
    
    // Verify the extension is enabled
    const result = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'pg_stat_statements'
    `);
    
    if (result.rows.length > 0) {
      logger.info(`pg_stat_statements version ${result.rows[0].extversion} is now active`);
    } else {
      throw new Error('pg_stat_statements extension was not enabled successfully');
    }
    
    logger.info('Migration enable_pg_stat_statements completed successfully');
  } catch (error) {
    if (error.message.includes('shared_preload_libraries')) {
      logger.error('pg_stat_statements requires PostgreSQL configuration:');
      logger.error('1. Add to postgresql.conf: shared_preload_libraries = \'pg_stat_statements\'');
      logger.error('2. Restart PostgreSQL server');
      logger.error('3. Run this migration again');
    }
    logger.error('Migration enable_pg_stat_statements failed:', error);
    throw error;
  }
}

export async function down() {
  logger.info('Running migration: enable_pg_stat_statements (down)');
  
  try {
    // Drop the pg_stat_statements extension
    await pool.query(`
      DROP EXTENSION IF EXISTS pg_stat_statements CASCADE
    `);
    logger.info('Dropped pg_stat_statements extension');
    
    logger.info('Migration enable_pg_stat_statements rolled back successfully');
  } catch (error) {
    logger.error('Migration enable_pg_stat_statements rollback failed:', error);
    throw error;
  }
}
