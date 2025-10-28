/**
 * Cleanup Script: Permanently delete old soft-deleted records
 * 
 * This script permanently removes records that have been soft-deleted
 * for more than 90 days (configurable via SOFT_DELETE_RETENTION_DAYS env var).
 * 
 * Usage:
 *   node server/scripts/cleanup-soft-deleted.js [--dry-run] [--days=90]
 * 
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --days=N     Override retention period (default: 90 days)
 * 
 * Example:
 *   node server/scripts/cleanup-soft-deleted.js --dry-run
 *   node server/scripts/cleanup-soft-deleted.js --days=30
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');
dotenv.config({ path: join(serverDir, '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const daysArg = args.find(arg => arg.startsWith('--days='));
const retentionDays = daysArg 
  ? parseInt(daysArg.split('=')[1]) 
  : parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '90');

if (isNaN(retentionDays) || retentionDays < 1) {
  logger.error('Invalid retention days. Must be a positive integer.');
  process.exit(1);
}

/**
 * Count soft-deleted records older than retention period
 */
async function countOldSoftDeletedRecords(table, retentionDays) {
  const query = `
    SELECT COUNT(*) as count 
    FROM ${table} 
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '${retentionDays} days'
  `;
  
  const { rows } = await pool.query(query);
  return parseInt(rows[0].count);
}

/**
 * Permanently delete old soft-deleted records from a table
 */
async function cleanupTable(table, retentionDays, dryRun = false) {
  try {
    // Count records to be deleted
    const count = await countOldSoftDeletedRecords(table, retentionDays);
    
    if (count === 0) {
      logger.info(`No old soft-deleted records found in ${table}`);
      return 0;
    }
    
    if (dryRun) {
      logger.info(`[DRY RUN] Would delete ${count} records from ${table} (deleted > ${retentionDays} days ago)`);
      return count;
    }
    
    // Perform the deletion
    const query = `
      DELETE FROM ${table} 
      WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '${retentionDays} days'
    `;
    
    const result = await pool.query(query);
    logger.info(`Permanently deleted ${result.rowCount} records from ${table} (deleted > ${retentionDays} days ago)`);
    return result.rowCount;
  } catch (error) {
    logger.error(`Error cleaning up ${table}:`, error);
    throw error;
  }
}

/**
 * Main cleanup function
 */
async function cleanup() {
  logger.info('='.repeat(80));
  logger.info('Soft Delete Cleanup Script');
  logger.info('='.repeat(80));
  logger.info(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  logger.info(`Retention Period: ${retentionDays} days`);
  logger.info(`Cutoff Date: ${new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()}`);
  logger.info('='.repeat(80));
  
  try {
    let totalDeleted = 0;
    
    // Clean up users table
    logger.info('\\nProcessing users table...');
    const usersDeleted = await cleanupTable('users', retentionDays, isDryRun);
    totalDeleted += usersDeleted;
    
    // Clean up visitors table
    logger.info('\\nProcessing visitors table...');
    const visitorsDeleted = await cleanupTable('visitors', retentionDays, isDryRun);
    totalDeleted += visitorsDeleted;
    
    // Clean up newsletter_subscriptions table
    logger.info('\\nProcessing newsletter_subscriptions table...');
    const newsletterDeleted = await cleanupTable('newsletter_subscriptions', retentionDays, isDryRun);
    totalDeleted += newsletterDeleted;
    
    // Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('Cleanup Summary');
    logger.info('='.repeat(80));
    logger.info(`Users: ${usersDeleted} ${isDryRun ? 'would be' : ''} deleted`);
    logger.info(`Visitors: ${visitorsDeleted} ${isDryRun ? 'would be' : ''} deleted`);
    logger.info(`Newsletter Subscriptions: ${newsletterDeleted} ${isDryRun ? 'would be' : ''} deleted`);
    logger.info(`Total: ${totalDeleted} records ${isDryRun ? 'would be' : ''} deleted`);
    logger.info('='.repeat(80));
    
    if (isDryRun) {
      logger.info('\\n⚠️  This was a DRY RUN. No records were actually deleted.');
      logger.info('Run without --dry-run to perform the actual deletion.');
    } else {
      logger.info('\\n✓ Cleanup completed successfully');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('\\n✗ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanup();
