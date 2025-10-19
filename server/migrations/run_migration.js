import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

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
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      join(__dirname, 'add_pending_registrations.sql'),
      'utf8'
    );
    
    console.log('🔄 Running migration...');
    console.log('   Creating pending_registrations table...');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify table was created
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pending_registrations'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ Verified: pending_registrations table exists');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'pending_registrations'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check indexes
      const indexes = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'pending_registrations';
      `);
      
      console.log('\n🔍 Indexes:');
      indexes.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
      
    } else {
      console.error('❌ Error: Table was not created');
      process.exit(1);
    }
    
    console.log('\n🎉 All done! You can now restart your server.');
    console.log('   The new email verification flow is ready to use.\n');
    
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
