import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#3b82f6',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create blog_post_tags junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_post_tags (
        id SERIAL PRIMARY KEY,
        blog_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(blog_post_id, tag_id)
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON blog_post_tags(blog_post_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON blog_post_tags(tag_id);
    `);

    await client.query('COMMIT');
    logger.info('✓ Tags and blog_post_tags tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating tags tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS blog_post_tags CASCADE;');
    await client.query('DROP TABLE IF EXISTS tags CASCADE;');
    await client.query('COMMIT');
    logger.info('✓ Tags tables dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error dropping tags tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
