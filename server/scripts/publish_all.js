import dotenv from 'dotenv';
dotenv.config();

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function publishAll() {
  const client = await pool.connect();
  
  try {
    logger.info('Publishing all draft and null-status posts...');
    
    const result = await client.query(`
      UPDATE blog_posts 
      SET status = 'published', 
          published_at = COALESCE(published_at, NOW())
      WHERE status IS NULL OR status = 'draft'
      RETURNING id, title, status
    `);
    
    if (result.rows.length > 0) {
      console.log(`\n✓ Published ${result.rows.length} post(s):\n`);
      result.rows.forEach(post => {
        console.log(`  - ${post.title} (ID: ${post.id})`);
      });
    } else {
      console.log('\nNo draft posts found.');
    }
    
  } catch (error) {
    logger.error('Error publishing posts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

publishAll();
