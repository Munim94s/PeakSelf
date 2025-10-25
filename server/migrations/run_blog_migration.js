import dotenv from 'dotenv';
dotenv.config();

import { up } from './create_blog_posts.js';
import pool from '../utils/db.js';

async function runMigration() {
  try {
    console.log('Running blog posts migration...');
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
