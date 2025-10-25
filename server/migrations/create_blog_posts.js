import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        slug VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'draft',
        author_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        published_at TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
    `);

    await client.query('COMMIT');
    logger.info('✓ Blog posts table created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating blog posts table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS blog_posts CASCADE;');
    await client.query('COMMIT');
    logger.info('✓ Blog posts table dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error dropping blog posts table:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
