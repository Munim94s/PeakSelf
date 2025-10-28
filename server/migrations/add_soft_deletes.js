/**
 * Migration: Add soft delete support
 * Adds deleted_at column to users, visitors, and newsletter_subscriptions tables
 * Also adds indexes to optimize queries that exclude soft-deleted records
 */

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

export async function up() {
  logger.info('Running migration: add_soft_deletes (up)');
  
  try {
    await pool.query('BEGIN');
    
    // Add deleted_at column to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
    `);
    logger.info('Added deleted_at column to users table');
    
    // Add deleted_at column to visitors table
    await pool.query(`
      ALTER TABLE visitors 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
    `);
    logger.info('Added deleted_at column to visitors table');
    
    // Add deleted_at column to newsletter_subscriptions table
    await pool.query(`
      ALTER TABLE newsletter_subscriptions 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL
    `);
    logger.info('Added deleted_at column to newsletter_subscriptions table');
    
    // Create partial indexes for active (non-deleted) records
    // These indexes optimize queries that filter WHERE deleted_at IS NULL
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_active 
      ON users(id) 
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index idx_users_active');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_active 
      ON users(email) 
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index idx_users_email_active');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_active 
      ON visitors(id) 
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index idx_visitors_active');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_newsletter_active 
      ON newsletter_subscriptions(email) 
      WHERE deleted_at IS NULL
    `);
    logger.info('Created index idx_newsletter_active');
    
    // Create index to find soft-deleted records (for cleanup script)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_deleted_at 
      ON users(deleted_at) 
      WHERE deleted_at IS NOT NULL
    `);
    logger.info('Created index idx_users_deleted_at');
    
    await pool.query('COMMIT');
    logger.info('Migration add_soft_deletes completed successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Migration add_soft_deletes failed:', error);
    throw error;
  }
}

export async function down() {
  logger.info('Running migration: add_soft_deletes (down)');
  
  try {
    await pool.query('BEGIN');
    
    // Drop indexes
    await pool.query('DROP INDEX IF EXISTS idx_users_deleted_at');
    await pool.query('DROP INDEX IF EXISTS idx_newsletter_active');
    await pool.query('DROP INDEX IF EXISTS idx_visitors_active');
    await pool.query('DROP INDEX IF EXISTS idx_users_email_active');
    await pool.query('DROP INDEX IF EXISTS idx_users_active');
    logger.info('Dropped soft delete indexes');
    
    // Remove deleted_at columns
    await pool.query('ALTER TABLE newsletter_subscriptions DROP COLUMN IF EXISTS deleted_at');
    await pool.query('ALTER TABLE visitors DROP COLUMN IF EXISTS deleted_at');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS deleted_at');
    logger.info('Removed deleted_at columns');
    
    await pool.query('COMMIT');
    logger.info('Migration add_soft_deletes rolled back successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    logger.error('Migration add_soft_deletes rollback failed:', error);
    throw error;
  }
}
