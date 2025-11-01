import dotenv from 'dotenv';
dotenv.config();

import { up } from './add_blog_image.js';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function runMigration() {
  try {
    logger.info('Running blog image migration...');
    await up();
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
