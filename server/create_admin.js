import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables first
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
  try {
    // First check if we have any admin users
    const { rows: admins } = await pool.query('SELECT id, email, role FROM users WHERE role = $1', ['admin']);
    console.log('Existing admin users:', admins);
    
    if (admins.length === 0) {
      console.log('No admin users found. Creating test admin...');
      
      // Create admin user
      const adminEmail = 'admin@test.com';
      
      // Check if user exists
      const { rows: existing } = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [adminEmail]);
      
      if (existing.length > 0) {
        // Update existing user to admin
        const { rows: updated } = await pool.query(
          'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role, verified',
          ['admin', adminEmail]
        );
        console.log('Updated existing user to admin:', updated[0]);
      } else {
        // Create new admin user (no password needed for testing)
        const { rows: created } = await pool.query(
          `INSERT INTO users (email, password_hash, provider, verified, role, name) 
           VALUES ($1, NULL, 'local', TRUE, 'admin', 'Test Admin') 
           RETURNING id, email, role, verified, name`,
          [adminEmail]
        );
        console.log('Created new admin user:', created[0]);
      }
      
      console.log('\nYou can now test the admin endpoints with this user.');
      console.log('For frontend testing, you\'ll need to implement login or temporarily bypass auth.');
    } else {
      console.log('Admin users already exist, no action needed.');
    }
    
  } catch (e) {
    console.error('Error creating admin:', e);
  } finally {
    await pool.end();
  }
}

createAdmin();