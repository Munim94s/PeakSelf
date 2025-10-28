import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import pool, { isDatabaseAvailable, checkDatabaseAvailability } from "../utils/db.js";
import { authPasswordLimiter, authOAuthLimiter, authGeneralLimiter } from "../middleware/rateLimiter.js";
import { verifyJwt as verifyJwtHelper } from "../middleware/auth.js";
import { invalidate } from "../utils/cache.js";
import { 
  COOKIE_JWT_MAX_AGE, 
  JWT_EXPIRATION, 
  EMAIL_VERIFICATION_EXPIRATION_MS,
  DEFAULT_JWT_SECRET 
} from "../constants.js";

const router = express.Router();

// Ensure schema columns exist (runs after db connection is established)
async function ensureSchema() {
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS name TEXT,
        ADD COLUMN IF NOT EXISTS avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS source TEXT,
        ADD COLUMN IF NOT EXISTS referrer TEXT,
        ADD COLUMN IF NOT EXISTS landing_path TEXT
    `);
  } catch (e) {
    logger.warn('Warning: Failed to ensure users table optional columns (name, avatar_url, source, referrer, landing_path):', e.message);
  }
}

// Run schema check after a short delay to ensure DB is connected
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    if (isDatabaseAvailable) {
      ensureSchema();
    }
  }, 1000).unref();

  // Cleanup expired pending registrations periodically (every hour)
  setInterval(async () => {
    if (isDatabaseAvailable) {
      try {
        const result = await pool.query(
          "DELETE FROM pending_registrations WHERE expires_at < NOW()"
        );
        // Cleanup completed silently
      } catch (e) {
        logger.warn('Failed to cleanup expired pending registrations:', e.message);
      }
    }
  }, 1000 * 60 * 60).unref(); // Run every hour
}

// Email transporter (use environment variables)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// Email configuration is validated in validateEnv.js

async function sendVerificationEmail(email, token) {
  const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  
  // If SMTP not configured, log link to console for development
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.info('\n' + '='.repeat(80));
    logger.info('📧 [DEV MODE] Email verification link:');
    logger.info('   Email: ' + email);
    logger.info('   Link:  ' + url);
    logger.info('='.repeat(80) + '\n');
    return;
  }
  
  // Try to send email via SMTP
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "no-reply@peakself.local",
      to: email,
      subject: "Verify your PeakSelf account",
      html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`
    });
    // Email sent successfully
  } catch (e) {
    // Log link to console if email fails (development fallback)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('\n' + '='.repeat(80));
      logger.info('📧 [FALLBACK] Verification link:');
      logger.info('   Email: ' + email);
      logger.info('   Link:  ' + url);
      logger.info('='.repeat(80) + '\n');
    }
  }
}

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, { id: user.id });
});

passport.deserializeUser(async (obj, done) => {
  try {
    const { rows } = await pool.query("SELECT id, email, provider, verified, name, avatar_url, role FROM users WHERE id = $1", [obj.id]);
    if (!rows[0]) return done(null, false);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

// Check Google OAuth configuration at runtime
function isGoogleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Setup Google OAuth strategy at startup if enabled
if (isGoogleEnabled()) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const googleId = profile.id;
      const displayName = profile.displayName || null;
      const avatarUrl = profile.photos?.[0]?.value || null;
      if (!email) return done(null, false);

      // Try find by google_id first
      let { rows } = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
      if (rows[0]) {
        // Update avatar/name opportunistically
        const updated = await pool.query(
          "UPDATE users SET name = COALESCE(name, $1), avatar_url = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
          [displayName, avatarUrl, rows[0].id]
        );
        return done(null, updated.rows[0]);
      }

      // Then by email
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      const existing = result.rows[0];
      if (existing) {
        // If existing is local, link google_id, keep provider as local to allow local login
        if (existing.provider === 'local') {
          const updated = await pool.query(
            "UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url), name = COALESCE(name, $3), updated_at = NOW() WHERE id = $4 RETURNING *",
            [googleId, avatarUrl, displayName, existing.id]
          );
          return done(null, updated.rows[0]);
        }
        // If existing provider is google, ensure google_id set and update profile info
        if (!existing.google_id || existing.avatar_url !== avatarUrl) {
          const updated = await pool.query(
            "UPDATE users SET google_id = $1, avatar_url = $2, name = COALESCE(name, $3), updated_at = NOW() WHERE id = $4 RETURNING *",
            [googleId, avatarUrl, displayName, existing.id]
          );
          return done(null, updated.rows[0]);
        }
        return done(null, existing);
      }

      // Create new google user - Google users are automatically verified
      const insert = await pool.query(
        "INSERT INTO users (email, password_hash, provider, google_id, verified, name, avatar_url) VALUES ($1, NULL, 'google', $2, TRUE, $3, $4) RETURNING *",
        [email, googleId, displayName, avatarUrl]
      );
      const user = insert.rows[0];
      // Invalidate user and dashboard caches
      invalidate.users();
      invalidate.dashboard();
      return done(null, user);
    } catch (e) {
      return done(e);
    }
  }));
  // Google OAuth strategy initialized
} else {
  // Google OAuth not configured
}

// Helpers
function ensureLocalAllowed(user) {
  if (!user) return "Invalid user";
  if (user.provider !== 'local') return "Local login disabled for this account";
  if (!user.verified) return "Please verify your email before logging in";
  return null;
}

function signJwt(user) {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const payload = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: JWT_EXPIRATION });
  return token;
}

async function getUserById(id) {
  const { rows } = await pool.query("SELECT id, email, provider, verified, name, avatar_url, role FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

function setJwtCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_JWT_MAX_AGE,
  });
}

// Use centralized verifyJwt from middleware
const verifyJwtFromRequest = verifyJwtHelper;

// Local register (NEW FLOW: stores in pending_registrations until email verified)
router.post("/register", authPasswordLimiter, async (req, res) => {
  // Skip DB availability check in test environment
  if (process.env.NODE_ENV !== 'test' && !checkDatabaseAvailability(res)) return;
  
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const lower = String(email).toLowerCase();
    const safeName = typeof name === 'string' && name.trim() ? name.trim() : null;
    
    // Check if user already exists in users table
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [lower]);
    const existing = rows[0];
    
    if (existing) {
      // If user exists with local provider (already has password), reject registration
      if (existing.provider === 'local') {
        return res.status(400).json({ error: "An account with this email already exists. Please login instead." });
      }
      
      // If user exists with Google OAuth, allow them to add password via email verification
      // This is secure because they need to verify email ownership
      // We'll handle the merge after email verification
    }
    
    // Check if there's already a pending registration for this email
    const pendingCheck = await pool.query("SELECT * FROM pending_registrations WHERE LOWER(email) = $1", [lower]);
    if (pendingCheck.rows[0]) {
      // Delete old pending registration and create a new one with fresh token
      await pool.query("DELETE FROM pending_registrations WHERE LOWER(email) = $1", [lower]);
    }
    
    // Hash password and create pending registration
    const hash = await bcrypt.hash(password, 10);
    const token = uuidv4();
    const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION_MS);
    
    await pool.query(
      "INSERT INTO pending_registrations (email, password_hash, name, token, expires_at) VALUES ($1, $2, $3, $4, $5)",
      [lower, hash, safeName, token, expires]
    );
    
    // Send verification email
    await sendVerificationEmail(lower, token);
    
    // Return success without logging in or creating user yet
    return res.status(201).json({ 
      message: "Registration initiated. Please check your email to verify your account before logging in.",
      email: lower
    });
  } catch (e) {
    const msg = process.env.NODE_ENV === 'production' ? 'Registration failed' : `Registration failed: ${e.message}`;
    res.status(500).json({ error: msg });
  }
});

// Local login
router.post("/login", authPasswordLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const lower = String(email).toLowerCase();
    
    // First check if there's a pending registration for this email
    const pendingCheck = await pool.query(
      "SELECT * FROM pending_registrations WHERE LOWER(email) = $1 AND expires_at > NOW()",
      [lower]
    );
    if (pendingCheck.rows[0]) {
      return res.status(400).json({ error: "Please verify your email first. Check your inbox for the verification link." });
    }
    
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [lower]);
    const user = rows[0];
    const blockReason = ensureLocalAllowed(user);
    if (blockReason) return res.status(400).json({ error: blockReason });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = signJwt(user);
    setJwtCookie(res, token);
    req.login({ id: user.id }, (err) => {
      if (err) return res.status(500).json({ error: "Login failed" });
      return req.session.save(() => res.json({ message: "Logged in", user: { id: user.id, email: user.email, provider: user.provider, verified: user.verified, name: user.name, avatar_url: user.avatar_url, role: user.role } }));
    });
  } catch (e) {
    const msg = process.env.NODE_ENV === 'production' ? 'Login failed' : `Login failed: ${e.message}`;
    res.status(500).json({ error: msg });
  }
});

// Start Google auth
router.get("/google", authOAuthLimiter, (req, res, next) => {
  if (!isGoogleEnabled()) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }
  
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Google callback
router.get("/google/callback", authOAuthLimiter, (req, res, next) => {
  if (!isGoogleEnabled()) return res.status(503).json({ error: "Google OAuth not configured" });
  
  return passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed` 
  })(req, res, next);
}, async (req, res) => {
  try {
    if (req.user) {
      const user = await getUserById(req.user.id);
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=user_not_found`);
      }
      const token = signJwt(user);
      setJwtCookie(res, token);
      
      req.session.save((err) => {
        return res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
      });
      return;
    }
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
  } catch (e) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
  }
});

router.get("/google/failure", authGeneralLimiter, (req, res) => {
  res.status(401).json({ error: "Google authentication failed" });
});

// Verify email (handles both pending registrations and existing user verification)
router.get("/verify-email", authGeneralLimiter, async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ error: "Missing token" });
    
    // First, check if this is a pending registration (NEW FLOW)
    const pendingResult = await pool.query(
      "SELECT * FROM pending_registrations WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    
    if (pendingResult.rows[0]) {
      const pending = pendingResult.rows[0];
      
      // Check if user with this email already exists
      const existingUser = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [pending.email.toLowerCase()]);
      const existing = existingUser.rows[0];
      
      let user;
      
      if (existing) {
        // If user exists with Google OAuth, merge accounts by adding password
        if (existing.provider === 'google') {
          // Update existing Google user: add password, switch to local provider, keep google_id
          const updated = await pool.query(
            "UPDATE users SET password_hash = $1, provider = 'local', verified = TRUE, name = COALESCE($2, name), updated_at = NOW() WHERE id = $3 RETURNING id, email, provider, verified, name, avatar_url, role",
            [pending.password_hash, pending.name, existing.id]
          );
          user = updated.rows[0];
        } else {
          // User exists with local provider - this shouldn't happen but handle it
          await pool.query("DELETE FROM pending_registrations WHERE id = $1", [pending.id]);
          return res.status(400).json({ error: "User already exists. Please login instead." });
        }
      } else {
        // Create new user with verified = TRUE
        const newUser = await pool.query(
          "INSERT INTO users (email, password_hash, provider, verified, name) VALUES ($1, $2, 'local', TRUE, $3) RETURNING id, email, provider, verified, name, avatar_url, role",
          [pending.email.toLowerCase(), pending.password_hash, pending.name]
        );
        user = newUser.rows[0];
        // Invalidate user and dashboard caches
        invalidate.users();
        invalidate.dashboard();
      }
      
      // Delete the pending registration
      await pool.query("DELETE FROM pending_registrations WHERE id = $1", [pending.id]);
      
      // Auto-login: create JWT and set cookie
      const token = signJwt(user);
      setJwtCookie(res, token);
      
      // Redirect to homepage instead of login page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      return res.redirect(`${clientUrl}?verified=true`);
    }
    
    // Otherwise, check old flow (existing users verifying email)
    const { rows } = await pool.query(
      "SELECT * FROM email_verification_tokens WHERE token = $1 AND consumed_at IS NULL AND expires_at > NOW()",
      [token]
    );
    const rec = rows[0];
    
    if (!rec) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    
    // Update existing user verification status (OLD FLOW)
    await pool.query("UPDATE users SET verified = TRUE, updated_at = NOW() WHERE id::text = $1", [rec.user_id]);
    await pool.query("UPDATE email_verification_tokens SET consumed_at = NOW() WHERE id = $1", [rec.id]);
    
    // Fetch the user to auto-login
    const userResult = await pool.query(
      "SELECT id, email, provider, verified, name, avatar_url, role FROM users WHERE id::text = $1",
      [rec.user_id]
    );
    const user = userResult.rows[0];
    
    if (user) {
      // Auto-login: create JWT and set cookie
      const token = signJwt(user);
      setJwtCookie(res, token);
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}?verified=true`);
  } catch (e) {
    const msg = process.env.NODE_ENV === 'production' ? 'Verification failed' : `Verification failed: ${e.message}`;
    res.status(500).json({ error: msg });
  }
});

// Logout
router.post("/logout", authGeneralLimiter, (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    if (!req.session) {
      return res.json({ message: "Logged out successfully" });
    }
    
    req.session.destroy((err) => {
      if (err) {
        return res.json({ message: "Logged out successfully" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Current user via JWT (fallback to session)
// No rate limiter - this needs to be called frequently by frontend
router.get("/me", async (req, res) => {
  try {
    const decoded = verifyJwtFromRequest(req);
    if (decoded?.sub) {
      const user = await getUserById(decoded.sub);
      return res.json({ user });
    }
    if (req.user) return res.json({ user: req.user });
    return res.status(200).json({ user: null });
  } catch (e) {
    return res.status(200).json({ user: null });
  }
});

// Development-only: session debug
if (process.env.NODE_ENV !== 'production') {
  router.get("/debug/session", (req, res) => {
    res.json({
      authenticated: Boolean(req.user),
      sessionId: req.sessionID,
      user: req.user || null
    });
  });
}

export default router;



