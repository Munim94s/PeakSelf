import express from "express";
import pool from "../../utils/db.js";
import { normalizeRange } from "../../utils/dateUtils.js";

const router = express.Router();

// Main route for admin dashboard welcome
router.get('/', async (req, res) => {
  res.json({
    message: 'Welcome, admin',
    user: { 
      id: req.currentUser.id, 
      email: req.currentUser.email, 
      role: req.currentUser.role, 
      authSource: req.currentUser.source 
    },
    sections: [
      { key: 'overview', label: 'Overview' },
      { key: 'users', label: 'Users' },
      { key: 'content', label: 'Content' },
      { key: 'settings', label: 'Settings' }
    ]
  });
});

// Dashboard: latest snapshot (with live fallback if table empty)
router.get('/overview', async (req, res) => {
  try {
    // Try the materialized snapshot first
    try {
      const snap = await pool.query(
        `SELECT snapshot_at,
                total_users, verified_users, signups_24h,
                newsletter_total, newsletter_signups_24h,
                sessions_instagram, sessions_facebook, sessions_youtube, sessions_google, sessions_others, sessions_others_refs
         FROM dashboard_overview_latest`
      );
      if (snap.rows[0]) {
        return res.json({ source: 'snapshot', ...snap.rows[0] });
      }
    } catch (snapError) {
      // View doesn't exist or has missing columns - fall back to live query
    }

    // Fallback: compute live metrics if no snapshot exists
    const live = await pool.query(
      `WITH
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
      SELECT u.total_users, u.verified_users, u.signups_24h,
             n.newsletter_total, n.newsletter_signups_24h,
             sess.sessions_instagram, sess.sessions_facebook, sess.sessions_youtube, sess.sessions_google, sess.sessions_others,
             otr.sessions_others_refs
        FROM u, n, sess, otr`);

    return res.json({ source: 'live', snapshot_at: new Date().toISOString(), ...live.rows[0] });
  } catch (e) {
    console.error('Dashboard fetch error:', e);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
