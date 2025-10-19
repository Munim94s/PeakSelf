import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createDashboardView() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating dashboard_overview_latest view...\n');

    // Drop the view if it exists
    await client.query(`DROP VIEW IF EXISTS dashboard_overview_latest CASCADE`);

    // Create the view with all required columns including traffic_facebook
    await client.query(`
      CREATE VIEW dashboard_overview_latest AS
      WITH
        u AS (
          SELECT
            (SELECT COUNT(*) FROM users)::BIGINT AS total_users,
            (SELECT COUNT(*) FROM users WHERE verified)::BIGINT AS verified_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS signups_24h
        ),
        n AS (
          SELECT
            (SELECT COUNT(*) FROM newsletter_subscriptions)::BIGINT AS newsletter_total,
            (SELECT COUNT(*) FROM newsletter_subscriptions WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS newsletter_signups_24h
        ),
        sess AS (
          SELECT
            COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_instagram,
            COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_facebook,
            COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_youtube,
            COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_google,
            COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS sessions_others
          FROM user_sessions
          WHERE started_at >= NOW() - INTERVAL '7 days'
        ),
        otr AS (
          SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS sessions_others_refs
          FROM (
            SELECT COALESCE(NULLIF(v.referrer,''),'(direct)') AS ref, COUNT(*) AS cnt
            FROM user_sessions s
            JOIN visitors v ON v.id = s.visitor_id
            WHERE s.started_at >= NOW() - INTERVAL '7 days' AND s.source = 'other'
            GROUP BY COALESCE(NULLIF(v.referrer,''),'(direct)')
            ORDER BY cnt DESC
            LIMIT 5
          ) t
        )
      SELECT 
        NOW() AS snapshot_at,
        u.total_users, u.verified_users, u.signups_24h,
        n.newsletter_total, n.newsletter_signups_24h,
        sess.sessions_instagram, sess.sessions_facebook, sess.sessions_youtube, sess.sessions_google, sess.sessions_others,
        otr.sessions_others_refs
      FROM u, n, sess, otr
    `);
    
    console.log('   ✅ View created successfully!');
    console.log('   ℹ️  The dashboard will now use the optimized view\n');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createDashboardView().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
