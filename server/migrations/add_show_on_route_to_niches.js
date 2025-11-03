import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add show_on_route column to niches table
    await client.query(`
      ALTER TABLE niches 
      ADD COLUMN IF NOT EXISTS show_on_route BOOLEAN DEFAULT true;
    `);
    
    await client.query('COMMIT');
    logger.info('✓ Added show_on_route column to niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding show_on_route column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove show_on_route column from niches table
    await client.query('ALTER TABLE niches DROP COLUMN IF EXISTS show_on_route;');
    
    await client.query('COMMIT');
    logger.info('✓ Removed show_on_route column from niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing show_on_route column:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
