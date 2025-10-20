import express from "express";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import pool from "../utils/db.js";

const router = express.Router();

// Ensure minimal traffic table exists for admin views and basic analytics
async function ensureTrafficEventsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS traffic_events (
        id BIGSERIAL PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source TEXT NOT NULL,
        referrer TEXT,
        path TEXT,
        user_agent TEXT,
        ip TEXT
      )
    `);
  } catch (e) {
    logger.warn('Warning: failed to ensure traffic_events table:', e.message);
  }
}
ensureTrafficEventsTable();

// Cookie names and durations
const COOKIE_VISITOR_ID = 'ps_vid'; // 30 days
const COOKIE_SESSION_ID = 'ps_sid'; // 30 minutes (sliding)
const COOKIE_SRC = 'ps_src'; // 30 days, never overwritten once set
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
const THIRTY_MIN_MS = 1000 * 60 * 30;

function cookieOpts(days = false) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: days ? THIRTY_DAYS_MS : THIRTY_MIN_MS,
    path: '/',
  };
}

function categorize(sourceHint, referrer) {
  const s = (sourceHint || "").toLowerCase();
  const r = (referrer || "").toLowerCase();
  if (s.includes('instagram') || r.includes('instagram.com')) return 'instagram';
  if (s.includes('facebook') || s.includes('fb') || r.includes('facebook.com') || r.includes('fb.com')) return 'facebook';
  if (s.includes('youtube') || r.includes('youtube.com') || r.includes('youtu.be')) return 'youtube';
  if (s.includes('google') || r.includes('google.')) return 'google';
  return 'other';
}

function safeStr(v, max) {
  if (typeof v !== 'string') return null;
  return v.substring(0, max);
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

function currentUserId(req) {
  const decoded = verifyJwt(req);
  if (decoded?.sub) return decoded.sub;
  if (req.user?.id) return req.user.id;
  return null;
}

async function verifyUserId(userId) {
  if (!userId || !uuidValidate(userId)) return null;
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  return rows.length > 0 ? userId : null;
}

async function ensureVisitor(req, res, source, referrer, landingPath) {
  // Try to use existing visitor cookie if present and valid
  const vidCookie = req.cookies?.[COOKIE_VISITOR_ID];
  const sourceCookie = req.cookies?.[COOKIE_SRC];
  const userId = await verifyUserId(currentUserId(req));

  const visitorSource = sourceCookie || source || 'other';

  if (vidCookie && uuidValidate(vidCookie)) {
    // Look up the visitor in DB
    const { rows } = await pool.query('SELECT * FROM visitors WHERE id = $1', [vidCookie]);
    let visitor = rows[0] || null;
    if (!visitor) {
      // DB might have been reset; recreate with the same id to keep cookie continuity
      const q = `INSERT INTO visitors (id, user_id, source, referrer, landing_path)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`;
      const ins = await pool.query(q, [vidCookie, userId, visitorSource, safeStr(referrer, 2048), safeStr(landingPath, 512)]);
      visitor = ins.rows[0];
    } else {
      // Opportunistically link to user and bump last_seen
      const upd = await pool.query(
        `UPDATE visitors
           SET last_seen_at = NOW(),
               user_id = COALESCE(user_id, $2)
         WHERE id = $1 RETURNING *`,
        [visitor.id, userId]
      );
      visitor = upd.rows[0];
    }
    // Ensure cookies are set if missing/expired
    if (!sourceCookie) res.cookie(COOKIE_SRC, visitor.source, cookieOpts(true));
    // Refresh visitor cookie TTL
    res.cookie(COOKIE_VISITOR_ID, visitor.id, cookieOpts(true));
    return visitor;
  }

  // No visitor cookie: create a new visitor and set cookies
  const q = `INSERT INTO visitors (user_id, source, referrer, landing_path)
             VALUES ($1, $2, $3, $4)
             RETURNING *`;
  const ins = await pool.query(q, [userId, visitorSource, safeStr(referrer, 2048), safeStr(landingPath, 512)]);
  const visitor = ins.rows[0];
  res.cookie(COOKIE_VISITOR_ID, visitor.id, cookieOpts(true));
  res.cookie(COOKIE_SRC, visitor.source, cookieOpts(true));
  return visitor;
}

async function getActiveSession(sessionId) {
  if (!sessionId || !uuidValidate(sessionId)) return null;
  const { rows } = await pool.query('SELECT *, NOW() AS now FROM user_sessions WHERE id = $1', [sessionId]);
  const s = rows[0];
  if (!s) return null;
  if (s.ended_at) return null;
  const now = new Date(s.now);
  const last = new Date(s.last_seen_at);
  const diff = now.getTime() - last.getTime();
  if (diff > THIRTY_MIN_MS) return null;
  return s;
}

async function endStaleSessionIfAny(sessionId) {
  try {
    if (!sessionId || !uuidValidate(sessionId)) return;
    await pool.query(
      `UPDATE user_sessions
         SET ended_at = COALESCE(ended_at, last_seen_at)
       WHERE id = $1
         AND ended_at IS NULL
         AND last_seen_at < NOW() - INTERVAL '30 minutes'`,
      [sessionId]
    );
  } catch (_) {
    // Non-fatal; if table or columns differ, ignore
  }
}

async function ensureSession(req, res, visitor, source, landingPath, userAgent, ip, referrer) {
  const sidCookie = req.cookies?.[COOKIE_SESSION_ID];
  const existing = await getActiveSession(sidCookie);
  const userId = await verifyUserId(currentUserId(req));

  // If we can identify the user, set their first_* fields once (immutable)
  if (userId) {
    try {
      await pool.query(
        `UPDATE users
           SET source = COALESCE(source, $1),
               referrer = COALESCE(referrer, $2),
               landing_path = COALESCE(landing_path, $3)
         WHERE id = $4`,
        [
          visitor?.source || source || 'other',
          visitor?.referrer || referrer || null,
          visitor?.landing_path || landingPath || null,
          userId
        ]
      );
    } catch (_) {
      // Non-fatal if users table lacks columns in older DBs; ensureSchema should add them
    }
  }

  if (existing) {
    // Attach user if needed, refresh cookie TTL
    if (userId && (existing.user_id !== userId)) {
      await pool.query('UPDATE user_sessions SET user_id = $2 WHERE id = $1', [existing.id, userId]);
    }
    res.cookie(COOKIE_SESSION_ID, existing.id, cookieOpts(false));
    return existing.id;
  }

  // If cookie refers to a stale session, mark it ended before creating a new one
  if (sidCookie) {
    await endStaleSessionIfAny(sidCookie);
  }

  // Start a new session with source and landing path; session source is immutable per session
  const insert = await pool.query(
    `INSERT INTO user_sessions (visitor_id, user_id, source, landing_path, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [visitor.id, userId, source || visitor.source || 'other', safeStr(landingPath, 512), safeStr(userAgent, 512), safeStr(ip, 128)]
  );
  const sid = insert.rows[0].id;
  res.cookie(COOKIE_SESSION_ID, sid, cookieOpts(false));
  return sid;
}

router.post('/', async (req, res) => {
  // Extract request info first so we can still record minimal analytics if advanced steps fail
  // Prefer explicit referrer provided by client; only fall back to HTTP Referer when the field is absent
  const hasBodyRef = (req.body && Object.prototype.hasOwnProperty.call(req.body, 'referrer'));
  const referrer = hasBodyRef
    ? safeStr(req.body?.referrer, 2048)
    : safeStr(req.get('referer') || null, 2048);

  const path = safeStr(typeof req.body?.path === 'string' ? req.body.path : req.body?.pathname || req.path || '/', 512);
  const sourceHint = safeStr(typeof req.body?.source === 'string' ? req.body.source : null, 64);
  const userAgent = safeStr(req.get('user-agent') || '', 512);
  const ip = safeStr((req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '').toString(), 128);
  const source = categorize(sourceHint, referrer);

  try {
    // Advanced sessionization path
    const visitor = await ensureVisitor(req, res, source, referrer, path);
    const sessionId = await ensureSession(req, res, visitor, source, path, userAgent, ip, referrer);

    // Record ordered navigation event
    await pool.query(
      `INSERT INTO session_events (session_id, path, referrer) VALUES ($1, $2, $3)`,
      [sessionId, path || '/', referrer]
    );

    // Opportunistically sync visitor last_seen_at on any event
    await pool.query('UPDATE visitors SET last_seen_at = NOW() WHERE id = $1', [visitor.id]);

    // Also record a simple traffic event for admin/overview
    try {
      await pool.query(
        `INSERT INTO traffic_events (occurred_at, source, referrer, path, user_agent, ip) VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [source, referrer, path || '/', userAgent, ip]
      );
    } catch (e2) {
      logger.warn('Warning: failed to insert traffic_events (continuing):', e2.message);
    }

    res.json({ ok: true, visitor_id: visitor.id, session_id: sessionId });
  } catch (e) {
    logger.error('Track error (falling back to simple traffic log):', e);
    // Fallback: record minimal traffic so admin stats are not empty
    try {
      await pool.query(
        `INSERT INTO traffic_events (occurred_at, source, referrer, path, user_agent, ip) VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [source, referrer, path || '/', userAgent, ip]
      );
    } catch (e3) {
      logger.warn('Warning: failed fallback traffic_events insert:', e3.message);
    }
    // Do not reveal details to client
    res.status(200).json({ ok: true });
  }
});

export default router;
