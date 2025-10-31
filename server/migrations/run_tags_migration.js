import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: join(__dirname, '../.env') });

// Create pool after env is loaded
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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

async function runMigration() {
  try {
    console.log('Running tags migration...');
    await up();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
