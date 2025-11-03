import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create niches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS niches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        logo_url TEXT,
        logo_text VARCHAR(255) DEFAULT 'Peakself',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_niches_slug ON niches(slug);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_niches_active_order ON niches(is_active, display_order);
    `);

    // Add niche_id column to blog_posts
    await client.query(`
      ALTER TABLE blog_posts 
      ADD COLUMN IF NOT EXISTS niche_id INTEGER REFERENCES niches(id) ON DELETE SET NULL;
    `);

    // Create index for niche_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_niche ON blog_posts(niche_id);
    `);

    await client.query('COMMIT');
    logger.info('✓ Niches table created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating niches table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove niche_id from blog_posts
    await client.query('ALTER TABLE blog_posts DROP COLUMN IF EXISTS niche_id;');
    
    // Drop niches table
    await client.query('DROP TABLE IF EXISTS niches CASCADE;');
    
    await client.query('COMMIT');
    logger.info('✓ Niches table dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error dropping niches table:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
