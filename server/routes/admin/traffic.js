import express from "express";
import pool from "../../utils/db.js";
import { normalizeRange } from "../../utils/dateUtils.js";
import cache, { CACHE_KEYS, CACHE_CONFIG } from "../../utils/cache.js";

const router = express.Router();

// Traffic summary (aggregates) - uses snapshot if present, else live
router.get('/summary', async (req, res) => {
  try {
    const norm = normalizeRange(req.query.range, 7);
    const cacheKey = CACHE_KEYS.TRAFFIC_SUMMARY(norm.label);
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const snap = await pool.query(
      `SELECT snapshot_at,
              total_users, verified_users, signups_24h,
              newsletter_total, newsletter_signups_24h,
              traffic_instagram, traffic_facebook, traffic_youtube, traffic_google, traffic_others, traffic_others_refs
       FROM dashboard_overview_latest`
    );
    if (snap.rows[0]) {
      const result = { source: 'snapshot', ...snap.rows[0] };
      cache.set(cacheKey, result, CACHE_CONFIG.TRAFFIC_SUMMARY);
      return res.json(result);
    }

    const live = await pool.query(
      `WITH
        u AS (
          SELECT
            (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)::BIGINT AS total_users,
            (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours' AND deleted_at IS NULL)::BIGINT AS signups_24h
        ),
        n AS (
          SELECT
            (SELECT COUNT(*) FROM newsletter_subscriptions)::BIGINT AS newsletter_total,
            (SELECT COUNT(*) FROM newsletter_subscriptions WHERE created_at >= NOW() - INTERVAL '24 hours')::BIGINT AS newsletter_signups_24h
        ),
        tr AS (
          SELECT
            COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_instagram,
            COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_facebook,
            COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_youtube,
            COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_google,
            COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_others
          FROM traffic_events
          WHERE occurred_at >= NOW() - ($1 || ' days')::interval
        ),
        otr AS (
          SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS traffic_others_refs
          FROM (
            SELECT COALESCE(NULLIF(referrer,''),'No referrer') AS ref, COUNT(*) AS cnt
            FROM traffic_events
            WHERE occurred_at >= NOW() - ($2 || ' days')::interval AND source = 'other'
            GROUP BY COALESCE(NULLIF(referrer,''),'No referrer')
            ORDER BY cnt DESC
            LIMIT 5
          ) t
        )
      SELECT u.total_users, u.verified_users, u.signups_24h,
             n.newsletter_total, n.newsletter_signups_24h,
             tr.traffic_instagram, tr.traffic_facebook, tr.traffic_youtube, tr.traffic_google, tr.traffic_others,
             otr.traffic_others_refs`,
      [norm.interval.split(' ')[0], norm.interval.split(' ')[0]]);

    const data = live.rows[0] || {};
    const result = { source: 'live', range: norm.label, snapshot_at: new Date().toISOString(), ...data };
    cache.set(cacheKey, result, CACHE_CONFIG.TRAFFIC_SUMMARY);
    return res.json(result);
  } catch (e) {
    console.error('Traffic summary error:', e);
    return res.status(500).json({ error: 'Failed to fetch traffic summary' });
  }
});

// Temporary test endpoint without auth for development
router.get('/summary/test', async (req, res) => {
  try {
    const norm = normalizeRange(req.query.range, 7);
    const rangeClause = `NOW() - INTERVAL '${norm.interval}'`;

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
        tr AS (
          SELECT
            COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_instagram,
            COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_facebook,
            COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_youtube,
            COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_google,
            COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_others
          FROM traffic_events
          WHERE occurred_at >= ${rangeClause}
        ),
        otr AS (
          SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS traffic_others_refs
          FROM (
            SELECT COALESCE(NULLIF(referrer,''),'No referrer') AS ref, COUNT(*) AS cnt
            FROM traffic_events
            WHERE occurred_at >= ${rangeClause} AND source = 'other'
            GROUP BY COALESCE(NULLIF(referrer,''),'No referrer')
            ORDER BY cnt DESC
            LIMIT 5
          ) t
        )
      SELECT u.total_users, u.verified_users, u.signups_24h,
             n.newsletter_total, n.newsletter_signups_24h,
             tr.traffic_instagram, tr.traffic_facebook, tr.traffic_youtube, tr.traffic_google, tr.traffic_others,
             otr.traffic_others_refs`);

    return res.json({ source: 'live', range: norm.label, snapshot_at: new Date().toISOString(), ...live.rows[0] });
  } catch (e) {
    console.error('Traffic summary test error:', e);
    return res.status(500).json({ error: 'Failed to fetch traffic summary' });
  }
});

// Traffic events list (filterable & paginated)
router.get('/events', async (req, res) => {
  try {
    const source = String(req.query.source || '').toLowerCase();
    const ref = String(req.query.ref || '').trim();
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);

    const params = [];
    const wheres = [];

    const rangeParam = normalizeRange(req.query.range, parseInt(req.query.days || '7', 10) || 7);
    if (req.query.range) {
      wheres.push(`occurred_at >= NOW() - INTERVAL '${rangeParam.interval}'`);
    } else {
      const days = Math.max(1, Math.min(365, parseInt(req.query.days || '7', 10) || 7));
      params.push(days);
      wheres.push("occurred_at >= NOW() - ($1 || ' days')::interval");
    }

    const allowed = new Set(['instagram','facebook','youtube','google','other']);
    if (allowed.has(source)) {
      params.push(source);
      wheres.push(`source = $${params.length}`);
    }
    if (ref) {
      params.push(`%${ref.toLowerCase()}%`);
      wheres.push(`LOWER(COALESCE(referrer,'')) LIKE $${params.length}`);
    }

    // Get total counts for the time range (without source/ref filters for cards)
    const countWheres = [];
    if (req.query.range) {
      countWheres.push(`occurred_at >= NOW() - INTERVAL '${rangeParam.interval}'`);
    } else {
      const days = Math.max(1, Math.min(365, parseInt(req.query.days || '7', 10) || 7));
      countWheres.push(`occurred_at >= NOW() - INTERVAL '${days} days'`);
    }
    
    const countsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END), 0) AS traffic_instagram,
        COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END), 0) AS traffic_facebook,
        COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END), 0) AS traffic_youtube,
        COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END), 0) AS traffic_google,
        COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END), 0) AS traffic_others
      FROM traffic_events 
      WHERE ${countWheres.join(' AND ')}`;
    
    const { rows: countRows } = await pool.query(countsQuery);
    const counts = countRows[0];

    params.push(limit);
    params.push(offset);

    const { rows } = await pool.query(
      `SELECT id::text AS id, occurred_at, source, referrer, path, user_agent, ip
       FROM traffic_events
       WHERE ${wheres.join(' AND ')}
       ORDER BY occurred_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ 
      events: rows,
      summary: {
        traffic_instagram: parseInt(counts.traffic_instagram),
        traffic_facebook: parseInt(counts.traffic_facebook),
        traffic_youtube: parseInt(counts.traffic_youtube), 
        traffic_google: parseInt(counts.traffic_google),
        traffic_others: parseInt(counts.traffic_others)
      }
    });
  } catch (e) {
    console.error('Traffic events error:', e);
    return res.status(500).json({ error: 'Failed to fetch traffic events' });
  }
});

export default router;
