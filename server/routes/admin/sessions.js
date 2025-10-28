import express from "express";
import pool from "../../utils/db.js";
import cache, { CACHE_KEYS, CACHE_CONFIG } from "../../utils/cache.js";

const router = express.Router();

// Sessions list (filterable & paginated) for admin UI
router.get('/', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);
    const source = String(req.query.source || '').trim().toLowerCase();
    const userId = String(req.query.user_id || '').trim();
    const visitorId = String(req.query.visitor_id || '').trim();

    // Only cache the first page of unfiltered recent sessions
    const shouldCache = !source && !userId && !visitorId && offset === 0 && limit === 50;
    const cacheKey = CACHE_KEYS.RECENT_SESSIONS;
    
    if (shouldCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

    const wheres = [];
    const params = [];
    if (source) { params.push(source); wheres.push(`LOWER(s.source) = $${params.length}`); }
    if (userId) { params.push(userId); wheres.push(`s.user_id::text = $${params.length}`); }
    if (visitorId) { params.push(visitorId); wheres.push(`s.visitor_id::text = $${params.length}`); }
    const whereSql = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    params.push(limit); params.push(offset);

    // Include user profile data (name, email, avatar) for display
    const { rows } = await pool.query(
      `SELECT 
         s.id::text AS session_id,
         s.visitor_id::text AS visitor_id,
         s.user_id::text AS user_id,
         s.source,
         s.landing_path,
         s.started_at,
         s.last_seen_at,
         s.ended_at,
         s.page_count,
         v.source AS visitor_source,
         u.name AS user_name,
         u.email AS user_email,
         u.avatar_url AS user_avatar
       FROM user_sessions s
       JOIN visitors v ON v.id = s.visitor_id
       LEFT JOIN users u ON u.id = s.user_id
       ${whereSql}
       ORDER BY s.started_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const result = { sessions: rows };
    if (shouldCache) {
      cache.set(cacheKey, result, CACHE_CONFIG.SESSION_STATS);
    }
    res.json(result);
  } catch (e) {
    console.error('Sessions list error:', e);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Session details (with visitor context)
router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      `SELECT s.id::text AS id, s.visitor_id::text AS visitor_id, s.user_id::text AS user_id,
              s.source, s.landing_path, s.user_agent, s.ip,
              s.started_at, s.last_seen_at, s.ended_at, s.page_count,
              v.source AS visitor_source, v.referrer, v.landing_path AS visitor_landing_path,
              u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar,
              (SELECT COUNT(*) FROM session_events e WHERE e.session_id = s.id) AS events_count
         FROM user_sessions s
         JOIN visitors v ON v.id = s.visitor_id
         LEFT JOIN users u ON u.id = s.user_id
        WHERE s.id::text = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json({ session: rows[0] });
  } catch (e) {
    console.error('Session details error:', e);
    return res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// Session events (ordered navigation)
router.get('/:id/events', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      `SELECT occurred_at, path, referrer FROM v_session_events WHERE session_id::text = $1`,
      [id]
    );
    res.json({ events: rows });
  } catch (e) {
    console.error('Session events error:', e);
    return res.status(500).json({ error: 'Failed to fetch session events' });
  }
});

export default router;
