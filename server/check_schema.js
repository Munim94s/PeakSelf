import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check blog_post_analytics table structure
    const analyticsSchema = await client.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_post_analytics' 
      ORDER BY ordinal_position;
    `);

    console.log('=== blog_post_analytics columns ===');
    console.table(analyticsSchema.rows);

    // Check if table has any data
    const dataCheck = await client.query(`
      SELECT COUNT(*) as count FROM blog_post_analytics;
    `);
    console.log('\nRows in blog_post_analytics:', dataCheck.rows[0].count);

    // Check blog_post_sessions structure
    const sessionsSchema = await client.query(`
      SELECT column_name, column_default, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_post_sessions' 
      ORDER BY ordinal_position;
    `);

    console.log('\n=== blog_post_sessions columns ===');
    console.table(sessionsSchema.rows);

    await client.end();
  } catch (error) {
    console.error('Error:', error);
    await client.end();
  }
}

checkSchema();
