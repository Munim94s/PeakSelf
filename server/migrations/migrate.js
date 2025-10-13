import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration: Remove current_source logic\n');

    // Step 1: Check if columns exist
    console.log('📋 Step 1: Checking current column names...');
    const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      ORDER BY column_name
    `);
    console.log('   Current visitors columns:', checkCols.rows.map(r => r.column_name).join(', '));
    
    const hasFirstSource = checkCols.rows.some(r => r.column_name === 'first_source');
    const hasSource = checkCols.rows.some(r => r.column_name === 'source');
    
    if (hasSource && !hasFirstSource) {
      console.log('   ✅ Columns already migrated!\n');
      process.exit(0);
    }

    if (!hasFirstSource) {
      console.log('   ❌ Error: first_source column not found. Database schema unexpected.\n');
      process.exit(1);
    }

    // Step 2: Rename first_source to source
    console.log('\n📋 Step 2: Renaming first_source → source...');
    await pool.query(`ALTER TABLE visitors RENAME COLUMN first_source TO source`);
    console.log('   ✅ Done');

    // Step 3: Rename first_referrer to referrer
    console.log('\n📋 Step 3: Renaming first_referrer → referrer...');
    await pool.query(`ALTER TABLE visitors RENAME COLUMN first_referrer TO referrer`);
    console.log('   ✅ Done');

    // Step 4: Rename first_landing_path to landing_path
    console.log('\n📋 Step 4: Renaming first_landing_path → landing_path...');
    await pool.query(`ALTER TABLE visitors RENAME COLUMN first_landing_path TO landing_path`);
    console.log('   ✅ Done');

    // Step 5: Drop current_source if exists
    console.log('\n📋 Step 5: Dropping current_source column...');
    await pool.query(`ALTER TABLE visitors DROP COLUMN IF EXISTS current_source`);
    console.log('   ✅ Done');

    // Step 6: Drop current_referrer if exists
    console.log('\n📋 Step 6: Dropping current_referrer column...');
    await pool.query(`ALTER TABLE visitors DROP COLUMN IF EXISTS current_referrer`);
    console.log('   ✅ Done');

    // Step 7: Add traffic_facebook to dashboard_overview_latest if exists
    console.log('\n📋 Step 7: Adding traffic_facebook column to dashboard_overview_latest...');
    const tableCheck = await pool.query(`
      SELECT table_type FROM information_schema.tables 
      WHERE table_name = 'dashboard_overview_latest'
    `);
    
    if (tableCheck.rows.length > 0) {
      const tableType = tableCheck.rows[0].table_type;
      if (tableType === 'VIEW') {
        console.log('   ℹ️  dashboard_overview_latest is a view (skipped - views will update automatically)');
      } else {
        const colExists = await pool.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'dashboard_overview_latest' 
          AND column_name = 'traffic_facebook'
        `);
        
        if (colExists.rows.length === 0) {
          await pool.query(`
            ALTER TABLE dashboard_overview_latest 
            ADD COLUMN traffic_facebook BIGINT DEFAULT 0
          `);
          console.log('   ✅ Added traffic_facebook column');
        } else {
          console.log('   ✅ traffic_facebook column already exists');
        }
      }
    } else {
      console.log('   ℹ️  dashboard_overview_latest does not exist (skipped)');
    }

    // Verify final state
    console.log('\n📋 Verification: Checking final column names...');
    const finalCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'visitors' 
      ORDER BY column_name
    `);
    console.log('   Final visitors columns:', finalCols.rows.map(r => r.column_name).join(', '));

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Restart your server');
    console.log('2. Clear browser cookies (or use incognito)');
    console.log('3. Test with: http://localhost:5173/?src=facebook\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigration();
