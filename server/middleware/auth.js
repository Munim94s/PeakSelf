import jwt from "jsonwebtoken";
import pool from "../utils/db.js";

/**
 * Verify JWT token from request (cookie or Authorization header)
 * @param {Request} req - Express request object
 * @returns {Object|null} - Decoded JWT payload or null if invalid
 */
export function verifyJwt(req) {
  try {
    const token = req.cookies?.access_token || 
                  (req.headers.authorization?.startsWith('Bearer ') 
                    ? req.headers.authorization.slice(7) 
                    : null);
    if (!token) return null;
    
    const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
    return jwt.verify(token, secret);
  } catch (_) {
    return null;
  }
}

/**
 * Get current user from JWT or session (passport)
 * Prefers JWT, falls back to session
 * @param {Request} req - Express request object
 * @returns {Object|null} - User object with id, email, role, and source, or null
 */
export function getCurrentUser(req) {
  const decoded = verifyJwt(req);
  if (decoded?.sub) {
    return { 
      id: decoded.sub, 
      email: decoded.email, 
      role: decoded.role, 
      source: 'jwt' 
    };
  }
  if (req.user?.id) {
    return { 
      id: req.user.id, 
      email: req.user.email, 
      role: req.user.role, 
      source: 'session' 
    };
  }
  return null;
}

/**
 * Middleware to require authentication (JWT or session)
 * Adds req.currentUser with user info
 */
export async function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.currentUser = user;
  next();
}

/**
 * Middleware to require admin role
 * Checks JWT or session, and verifies role from database if JWT is present
 * Adds req.currentUser with user info
 */
export async function requireAdmin(req, res, next) {
  // Must have a valid identity via JWT or session
  const decoded = verifyJwt(req);
  const hasSession = Boolean(req.user?.id);
  
  if (!decoded?.sub && !hasSession) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Start with whichever identity we have
  let currentUser = null;
  if (hasSession) {
    currentUser = { 
      id: req.user.id, 
      email: req.user.email, 
      role: req.user.role, 
      source: 'session' 
    };
  } else if (decoded?.sub) {
    currentUser = { 
      id: decoded.sub, 
      email: decoded.email, 
      role: decoded.role, 
      source: 'jwt' 
    };
  }

  // Determine role: prefer session role, then verify from DB if JWT present
  let role = currentUser?.role || null;
  let email = currentUser?.email || null;

  // Always verify role from database when JWT is present (to handle stale JWTs)
  if (decoded?.sub) {
    try {
      const { rows } = await pool.query(
        'SELECT email, role FROM users WHERE id = $1', 
        [decoded.sub]
      );
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

  req.currentUser = { 
    id: currentUser.id, 
    email, 
    role, 
    source: currentUser.source 
  };
  next();
}
