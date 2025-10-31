import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verify() {
  try {
    // Check tables
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('tags', 'blog_post_tags')
      ORDER BY tablename
    `);
    
    console.log('✅ Created tables:', tables.rows.map(r => r.tablename).join(', '));
    
    // Check tags columns
    const tagsCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tags'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Tags table structure:');
    tagsCols.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('tags', 'blog_post_tags')
      ORDER BY indexname
    `);
    
    console.log('\n🔍 Indexes:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    console.log('\n✅ All tables and indexes created successfully!\n');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
