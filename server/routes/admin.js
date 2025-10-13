import express from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import pool from "../utils/db.js";

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// Parse a time range into a safe SQL interval literal and a human label
function normalizeRange(range, fallbackDays = 7) {
  const r = String(range || '').trim().toLowerCase();
  switch (r) {
    case '1h':
    case 'hour':
    case 'last_hour':
      return { interval: "1 hour", label: "last hour" };
    case '24h':
    case '1d':
    case 'day':
    case 'last_day':
      return { interval: "24 hours", label: "last 24 hours" };
    case '7d':
    case 'week':
    case 'last_week':
      return { interval: "7 days", label: "last 7 days" };
    case '30d':
    case 'month':
    case 'last_month':
      return { interval: "30 days", label: "last 30 days" };
    case '90d':
    case 'quarter':
      return { interval: "90 days", label: "last 90 days" };
    case '365d':
    case 'year':
    case 'last_year':
      return { interval: "365 days", label: "last year" };
    default: {
      const days = Math.max(1, Math.min(365, parseInt(r || String(fallbackDays), 10) || fallbackDays));
      return { interval: `${days} days`, label: `last ${days} days` };
    }
  }
}

function verifyJwt(req) {
  try {
    const token = req.cookies?.access_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return null;
    const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
    return jwt.verify(token, secret);
  } catch (_) {
    return null;
  }
}

// Unified current-user extractor: prefer JWT, fall back to session (passport)
function getCurrentUser(req) {
  const decoded = verifyJwt(req);
  if (decoded?.sub) {
    return { id: decoded.sub, email: decoded.email, role: decoded.role, source: 'jwt' };
  }
  if (req.user?.id) {
    return { id: req.user.id, email: req.user.email, role: req.user.role, source: 'session' };
  }
  return null;
}

async function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user?.id) return res.status(401).json({ error: 'Unauthorized' });
  req.currentUser = user;
  next();
}

async function requireAdmin(req, res, next) {
  // Must have a valid identity via JWT or session
  const decoded = verifyJwt(req);
  const hasSession = Boolean(req.user?.id);
  if (!decoded?.sub && !hasSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Start with whichever identity we have
  let currentUser = null;
  if (hasSession) {
    currentUser = { id: req.user.id, email: req.user.email, role: req.user.role, source: 'session' };
  } else if (decoded?.sub) {
    currentUser = { id: decoded.sub, email: decoded.email, role: decoded.role, source: 'jwt' };
  }

  // Determine role: prefer session role, then JWT claim, then DB (to handle stale JWTs)
  let role = currentUser?.role || null;
  let email = currentUser?.email || null;

  if (role !== 'admin' && decoded?.sub) {
    try {
      const { rows } = await pool.query('SELECT email, role FROM users WHERE id = $1', [decoded.sub]);
      if (rows[0]) {
        role = rows[0].role;
        email = rows[0].email || email;
      }
    } catch (_) {
      // If DB not available, we fall back to token/session role
    }
  }

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.currentUser = { id: currentUser.id, email, role, source: currentUser.source };
  next();
}

router.get('/', requireAdmin, async (req, res) => {
  // Example: you can fetch some admin-only stats here in future
  res.json({
    message: 'Welcome, admin',
    user: { id: req.currentUser.id, email: req.currentUser.email, role: req.currentUser.role, authSource: req.currentUser.source },
    sections: [
      { key: 'overview', label: 'Overview' },
      { key: 'users', label: 'Users' },
      { key: 'content', label: 'Content' },
      { key: 'settings', label: 'Settings' }
    ]
  });
});

// Traffic summary (aggregates) - uses snapshot if present, else live
router.get('/traffic/summary', requireAdmin, async (req, res) => {
  try {
    const snap = await pool.query(
      `SELECT snapshot_at,
              total_users, verified_users, signups_24h,
              newsletter_total, newsletter_signups_24h,
              traffic_instagram, traffic_facebook, traffic_youtube, traffic_google, traffic_others, traffic_others_refs
       FROM dashboard_overview_latest`
    );
    if (snap.rows[0]) return res.json({ source: 'snapshot', ...snap.rows[0] });

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
    console.error('Traffic summary error:', e);
    return res.status(500).json({ error: 'Failed to fetch traffic summary' });
  }
});

// Temporary test endpoint without auth for development
router.get('/traffic/summary/test', async (req, res) => {
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
router.get('/traffic/events', requireAdmin, async (req, res) => {
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

// Sessions list (filterable & paginated) for admin UI
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);
    const source = String(req.query.source || '').trim().toLowerCase();
    const userId = String(req.query.user_id || '').trim();
    const visitorId = String(req.query.visitor_id || '').trim();

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

    res.json({ sessions: rows });
  } catch (e) {
    console.error('Sessions list error:', e);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Session details (with visitor context)
router.get('/sessions/:id', requireAdmin, async (req, res) => {
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
router.get('/sessions/:id/events', requireAdmin, async (req, res) => {
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

// Dashboard: latest snapshot (with live fallback if table empty)
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // Try the materialized snapshot first
    const snap = await pool.query(
      `SELECT snapshot_at,
              total_users, verified_users, signups_24h,
              newsletter_total, newsletter_signups_24h,
              traffic_instagram, traffic_facebook, traffic_youtube, traffic_google, traffic_others, traffic_others_refs
       FROM dashboard_overview_latest`
    );
    if (snap.rows[0]) {
      return res.json({ source: 'snapshot', ...snap.rows[0] });
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
        tr AS (
          SELECT
            COALESCE(SUM(CASE WHEN source = 'instagram' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_instagram,
            COALESCE(SUM(CASE WHEN source = 'facebook' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_facebook,
            COALESCE(SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_youtube,
            COALESCE(SUM(CASE WHEN source = 'google' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_google,
            COALESCE(SUM(CASE WHEN source = 'other' THEN 1 ELSE 0 END),0)::BIGINT AS traffic_others
          FROM traffic_events
          WHERE occurred_at >= NOW() - INTERVAL '7 days'
        ),
        otr AS (
          SELECT COALESCE(jsonb_agg(ref ORDER BY cnt DESC), '[]'::jsonb) AS traffic_others_refs
          FROM (
            SELECT COALESCE(NULLIF(referrer,''),'(direct)') AS ref, COUNT(*) AS cnt
            FROM traffic_events
            WHERE occurred_at >= NOW() - INTERVAL '7 days' AND source = 'other'
            GROUP BY COALESCE(NULLIF(referrer,''),'(direct)')
            ORDER BY cnt DESC
            LIMIT 5
          ) t
        )
      SELECT u.total_users, u.verified_users, u.signups_24h,
             n.newsletter_total, n.newsletter_signups_24h,
             tr.traffic_instagram, tr.traffic_facebook, tr.traffic_youtube, tr.traffic_google, tr.traffic_others,
             otr.traffic_others_refs`);

    return res.json({ source: 'live', snapshot_at: new Date().toISOString(), ...live.rows[0] });
  } catch (e) {
    console.error('Dashboard fetch error:', e);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// List users with optional filter and search
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const filter = String(req.query.filter || 'all');
    const params = [];
    const wheres = [];
    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      wheres.push('(LOWER(email) LIKE $' + (params.length - 1) + ' OR LOWER(COALESCE(name, ' + "''" + ')) LIKE $' + params.length + ')');
    }
    if (filter === 'admins') {
      params.push('admin');
      wheres.push('role = $' + params.length);
    }
    if (filter === 'unverified') {
      params.push(false);
      wheres.push('verified = $' + params.length);
    }
    const whereSql = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT id::text AS id, email, role, verified, name, avatar_url, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC NULLS LAST
       LIMIT 500`,
      params
    );
    res.json({ users: rows });
  } catch (e) {
    console.error('List users error:', e);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Export users to CSV
router.get('/users.csv', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id::text AS id, email, role, verified, name
       FROM users
       ORDER BY created_at DESC NULLS LAST
       LIMIT 1000`
    );
    const header = 'id,email,role,verified,name\n';
    const body = rows.map(r => [r.id, r.email, r.role, r.verified, (r.name||'')].map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(header + body + '\n');
  } catch (e) {
    console.error('CSV export error:', e);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Promote to admin
router.post('/users/:id/make-admin', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      "UPDATE users SET role = 'admin', updated_at = NOW() WHERE id::text = $1 RETURNING id::text AS id, email, role, verified, name",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (e) {
    console.error('Make admin error:', e);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Remove admin (demote to regular user); prevent removing own admin role
router.post('/users/:id/remove-admin', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === String(req.currentUser.id)) {
      return res.status(400).json({ error: 'You cannot remove your own admin role' });
    }
    const { rows } = await pool.query(
      "UPDATE users SET role = 'user', updated_at = NOW() WHERE id::text = $1 AND role = 'admin' RETURNING id::text AS id, email, role, verified, name",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found or not an admin' });
    return res.json({ user: rows[0] });
  } catch (e) {
    console.error('Remove admin error:', e);
    res.status(500).json({ error: 'Failed to remove admin role' });
  }
});

// Delete user (prevent deleting self)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === String(req.currentUser.id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const { rowCount } = await pool.query("DELETE FROM users WHERE id::text = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Invite user (creates user if not exists and sends verification link)
router.post('/users/invite', requireAdmin, async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // Check existing
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = existing.rows[0];
    if (!user) {
      const created = await pool.query(
        "INSERT INTO users (email, password_hash, provider, verified, name) VALUES ($1, NULL, 'local', FALSE, $2) RETURNING *",
        [email, name]
      );
      user = created.rows[0];
    }
    // Generate verification token
    const token = uuidv4();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await pool.query(
      "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expires]
    );
    const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    if (!process.env.SMTP_HOST) {
      console.log(`[DEV] Invite link for ${email}: ${url}`);
    } else {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "no-reply@peakself.local",
          to: email,
          subject: "You're invited to PeakSelf",
          html: `<p>You've been invited to PeakSelf.</p><p>Click to verify your email and complete setup: <a href="${url}">${url}</a></p>`
        });
      } catch (e) {
        console.warn('Invite email failed (continuing):', e.message);
      }
    }
    return res.json({ message: 'Invitation sent (or logged in server in dev)' });
  } catch (e) {
    console.error('Invite user error:', e);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

export default router;
