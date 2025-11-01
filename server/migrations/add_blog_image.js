import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add image column to blog_posts
    await client.query(`
      ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS image TEXT;
    `);
    
    await client.query('COMMIT');
    logger.info('✓ Added image column to blog_posts table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding image column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE blog_posts DROP COLUMN IF EXISTS image;');
    await client.query('COMMIT');
    logger.info('✓ Removed image column from blog_posts table');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing image column:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
