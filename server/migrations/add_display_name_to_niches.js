import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add display_name column to niches table
    await client.query(`
      ALTER TABLE niches 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
    `);
    
    // Set display_name to name for existing records
    await client.query(`
      UPDATE niches 
      SET display_name = name 
      WHERE display_name IS NULL;
    `);
    
    await client.query('COMMIT');
    logger.info('✓ Added display_name column to niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding display_name column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove display_name column from niches table
    await client.query('ALTER TABLE niches DROP COLUMN IF EXISTS display_name;');
    
    await client.query('COMMIT');
    logger.info('✓ Removed display_name column from niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing display_name column:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
