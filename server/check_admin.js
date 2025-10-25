import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables first
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAdmins() {
  try {
    const { rows } = await pool.query('SELECT id, email, role FROM users WHERE role = $1', ['admin']);
    console.log('Admin users:', rows);
    
    if (rows.length === 0) {
      console.log('\nNo admin users found. Creating a test admin user...');
      
      // Create a test admin user
      const adminEmail = 'admin@test.com';
      const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
      
      if (existing.length === 0) {
        // Insert new admin user
        const { rows: newAdmin } = await pool.query(
          `INSERT INTO users (email, password_hash, provider, verified, role, name) 
           VALUES ($1, NULL, 'local', TRUE, 'admin', 'Test Admin') 
           RETURNING id, email, role`,
          [adminEmail]
        );
        console.log('Created admin user:', newAdmin[0]);
      } else {
        // Update existing user to admin
        const { rows: updated } = await pool.query(
          'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role',
          ['admin', adminEmail]
        );
        console.log('Updated user to admin:', updated[0]);
      }
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

checkAdmins();