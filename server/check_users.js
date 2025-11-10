import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkUsers() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE verified = TRUE) as verified_true,
        COUNT(*) FILTER (WHERE provider != 'local') as oauth_users,
        COUNT(*) FILTER (WHERE verified = TRUE OR provider != 'local') as should_be_verified,
        array_agg(json_build_object('email', email, 'provider', provider, 'verified', verified)) as users
      FROM users 
      WHERE deleted_at IS NULL
    `);
    
    console.log('\n=== User Stats ===');
    console.log('Total Users:', result.rows[0].total_users);
    console.log('Verified (TRUE):', result.rows[0].verified_true);
    console.log('OAuth Users:', result.rows[0].oauth_users);
    console.log('Should be Verified:', result.rows[0].should_be_verified);
    console.log('\n=== User Details ===');
    console.log(JSON.stringify(result.rows[0].users, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
