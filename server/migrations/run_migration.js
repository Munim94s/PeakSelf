import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

// Create pool using same config as main app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  let client;
  
  try {
    console.log('🔄 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Import and run the niches migration
    console.log('🔄 Running niches migration...');
    console.log('   Creating niches table and adding niche_id to blog_posts...');
    
    const { up } = await import('./create_niches.js');
    await up();
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created/updated
    const checkNichesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'niches'
      );
    `);
    
    const checkNicheColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'blog_posts'
        AND column_name = 'niche_id'
      );
    `);
    
    if (checkNichesTable.rows[0].exists) {
      console.log('✅ Verified: niches table exists');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'niches'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Niches table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.error('❌ Error: Niches table was not created');
      process.exit(1);
    }
    
    if (checkNicheColumn.rows[0].exists) {
      console.log('\n✅ Verified: niche_id column added to blog_posts');
    } else {
      console.error('❌ Error: niche_id column was not added to blog_posts');
      process.exit(1);
    }
    
    console.log('\n🎉 All done! Niches feature is now available.');
    console.log('   You can now create niches in the admin panel.\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();
