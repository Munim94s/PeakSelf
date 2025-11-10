import express from "express";
import pool from "../../utils/db.js";
import { normalizeRange } from "../../utils/dateUtils.js";
import cache, { CACHE_KEYS, CACHE_CONFIG } from "../../utils/cache.js";

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
    // Check cache first (skip if nocache param is present)
    if (!req.query.nocache) {
      const cached = cache.get(CACHE_KEYS.DASHBOARD_METRICS);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

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
        const result = { source: 'snapshot', ...snap.rows[0] };
        cache.set(CACHE_KEYS.DASHBOARD_METRICS, result, CACHE_CONFIG.DASHBOARD_METRICS);
        return res.json(result);
      }
    } catch (snapError) {
      // View doesn't exist or has missing columns - fall back to live query
    }

    // Fallback: compute live metrics if no snapshot exists
    const live = await pool.query(
      `WITH
        u AS (
          SELECT
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)::BIGINT AS total_users,
            (SELECT COUNT(*) FROM users WHERE (verified = TRUE OR provider != 'local') AND deleted_at IS NULL)::BIGINT AS verified_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours' AND deleted_at IS NULL)::BIGINT AS signups_24h
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

    const result = { source: 'live', snapshot_at: new Date().toISOString(), ...live.rows[0] };
    cache.set(CACHE_KEYS.DASHBOARD_METRICS, result, CACHE_CONFIG.DASHBOARD_METRICS);
    return res.json(result);
  } catch (e) {
    console.error('Dashboard fetch error:', e);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Clear cache endpoint (for debugging/testing)
router.post('/clear-cache', async (req, res) => {
  try {
    cache.invalidate.dashboard();
    return res.json({ success: true, message: 'Dashboard cache cleared' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Sessions time-series data (last 7 days)
router.get('/sessions-timeline', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const maxDays = Math.min(days, 30); // Cap at 30 days

    const result = await pool.query(
      `WITH date_series AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - INTERVAL '${maxDays} days'),
          DATE_TRUNC('day', NOW()),
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        ds.date,
        COALESCE(SUM(CASE WHEN s.source = 'instagram' THEN 1 ELSE 0 END), 0)::INTEGER AS instagram,
        COALESCE(SUM(CASE WHEN s.source = 'facebook' THEN 1 ELSE 0 END), 0)::INTEGER AS facebook,
        COALESCE(SUM(CASE WHEN s.source = 'youtube' THEN 1 ELSE 0 END), 0)::INTEGER AS youtube,
        COALESCE(SUM(CASE WHEN s.source = 'google' THEN 1 ELSE 0 END), 0)::INTEGER AS google,
        COALESCE(SUM(CASE WHEN s.source = 'other' THEN 1 ELSE 0 END), 0)::INTEGER AS others,
        COALESCE(COUNT(s.id), 0)::INTEGER AS total
      FROM date_series ds
      LEFT JOIN user_sessions s ON DATE_TRUNC('day', s.started_at) = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC`
    );

    return res.json({ timeline: result.rows });
  } catch (e) {
    console.error('Sessions timeline error:', e);
    return res.status(500).json({ error: 'Failed to fetch sessions timeline' });
  }
});

export default router;
