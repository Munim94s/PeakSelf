import dotenv from 'dotenv';
dotenv.config();

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function checkPosts() {
  const client = await pool.connect();
  
  try {
    // Check all posts
    const result = await client.query(`
      SELECT id, title, status, author_id, created_at 
      FROM blog_posts 
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== All Blog Posts ===\n');
    result.rows.forEach(post => {
      console.log(`ID: ${post.id}`);
      console.log(`Title: ${post.title}`);
      console.log(`Status: ${post.status}`);
      console.log(`Author ID: ${post.author_id || 'NULL'}`);
      console.log(`Created: ${post.created_at}`);
      console.log('---');
    });
    
    // Check for draft posts
    const draftResult = await client.query(`
      SELECT id, title FROM blog_posts WHERE status = 'draft'
    `);
    
    if (draftResult.rows.length > 0) {
      console.log(`\n${draftResult.rows.length} draft post(s) found. Would you like to publish them?`);
      console.log('Run: node scripts/publish_drafts.js');
    }
    
  } catch (error) {
    logger.error('Error checking posts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPosts();
