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
    // Get migration name from command line argument
    const migrationName = process.argv[2] || 'create_niches';
    const migrationFile = `./${migrationName}.js`;
    
    console.log('🔄 Connecting to database...');
    client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Import and run the specified migration
    console.log(`🔄 Running ${migrationName} migration...`);
    
    const { up } = await import(migrationFile);
    await up();
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify niches table
    const checkNichesTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'niches'
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
    }
    
    console.log('\n🎉 Migration complete!');
    
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
