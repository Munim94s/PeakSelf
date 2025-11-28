import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add hero_sections JSONB column to niches table
    await client.query(`
      ALTER TABLE niches 
      ADD COLUMN IF NOT EXISTS hero_sections JSONB DEFAULT '{}'::jsonb;
    `);
    
    await client.query('COMMIT');
    logger.info('✓ Added hero_sections column to niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding hero_sections column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove hero_sections column
    await client.query('ALTER TABLE niches DROP COLUMN IF EXISTS hero_sections;');
    
    await client.query('COMMIT');
    logger.info('✓ Removed hero_sections column from niches table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing hero_sections column:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
