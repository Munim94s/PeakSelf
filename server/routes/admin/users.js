import express from "express";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import pool from "../../utils/db.js";
import { EMAIL_VERIFICATION_EXPIRATION_MS } from "../../constants.js";
import { invalidate } from "../../utils/cache.js";

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

// List users with optional filter and search
router.get('/', async (req, res) => {
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
    // Add soft delete filter
    wheres.push('deleted_at IS NULL');
    const whereSql = 'WHERE ' + wheres.join(' AND ');
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
router.get('/.csv', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id::text AS id, email, role, verified, name
       FROM users
       WHERE deleted_at IS NULL
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
router.post('/:id/make-admin', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      "UPDATE users SET role = 'admin', updated_at = NOW() WHERE id::text = $1 AND deleted_at IS NULL RETURNING id::text AS id, email, role, verified, name",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    // Invalidate caches that include user stats
    invalidate.users();
    invalidate.dashboard();
    return res.json({ user: rows[0] });
  } catch (e) {
    console.error('Make admin error:', e);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Remove admin (demote to regular user); prevent removing own admin role
router.post('/:id/remove-admin', async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === String(req.currentUser.id)) {
      return res.status(400).json({ error: 'You cannot remove your own admin role' });
    }
    const { rows } = await pool.query(
      "UPDATE users SET role = 'user', updated_at = NOW() WHERE id::text = $1 AND role = 'admin' AND deleted_at IS NULL RETURNING id::text AS id, email, role, verified, name",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found or not an admin' });
    // Invalidate caches that include user stats
    invalidate.users();
    invalidate.dashboard();
    return res.json({ user: rows[0] });
  } catch (e) {
    console.error('Remove admin error:', e);
    res.status(500).json({ error: 'Failed to remove admin role' });
  }
});

// List deleted users
router.get('/deleted', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const wheres = ['deleted_at IS NOT NULL'];
    
    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      wheres.push('(LOWER(email) LIKE $' + (params.length - 1) + ' OR LOWER(COALESCE(name, ' + "''" + ')) LIKE $' + params.length + ')');
    }
    
    const whereSql = 'WHERE ' + wheres.join(' AND ');
    const { rows } = await pool.query(
      `SELECT id::text AS id, email, role, verified, name, avatar_url, deleted_at, created_at,
              EXTRACT(DAY FROM (NOW() - deleted_at))::INTEGER AS days_deleted
       FROM users
       ${whereSql}
       ORDER BY deleted_at DESC NULLS LAST
       LIMIT 500`,
      params
    );
    res.json({ users: rows });
  } catch (e) {
    console.error('List deleted users error:', e);
    res.status(500).json({ error: 'Failed to list deleted users' });
  }
});

// Bulk restore users
router.post('/bulk-restore', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    
    // Convert to string array and filter valid UUIDs
    const validIds = ids.map(id => String(id)).filter(id => id.length > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    const placeholders = validIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `UPDATE users 
       SET deleted_at = NULL, updated_at = NOW() 
       WHERE id::text IN (${placeholders}) AND deleted_at IS NOT NULL 
       RETURNING id::text AS id, email`,
      validIds
    );
    
    // Invalidate caches
    invalidate.users();
    invalidate.dashboard();
    
    return res.json({ 
      restored: rows.length,
      users: rows,
      message: `Successfully restored ${rows.length} user(s)` 
    });
  } catch (e) {
    console.error('Bulk restore error:', e);
    res.status(500).json({ error: 'Failed to restore users' });
  }
});

// Bulk permanent delete users
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    
    // Convert to string array and filter valid IDs
    const validIds = ids.map(id => String(id)).filter(id => id.length > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs provided' });
    }
    
    // Prevent deleting self
    if (validIds.includes(String(req.currentUser.id))) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    const placeholders = validIds.map((_, i) => `$${i + 1}`).join(',');
    const { rowCount } = await pool.query(
      `DELETE FROM users 
       WHERE id::text IN (${placeholders}) AND deleted_at IS NOT NULL`,
      validIds
    );
    
    // Invalidate caches
    invalidate.users();
    invalidate.dashboard();
    
    return res.json({ 
      deleted: rowCount,
      message: `Permanently deleted ${rowCount} user(s)` 
    });
  } catch (e) {
    console.error('Bulk delete error:', e);
    res.status(500).json({ error: 'Failed to delete users' });
  }
});

// Restore soft-deleted user
router.post('/:id/restore', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { rows } = await pool.query(
      "UPDATE users SET deleted_at = NULL, updated_at = NOW() WHERE id::text = $1 AND deleted_at IS NOT NULL RETURNING id::text AS id, email, role, verified, name",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found or not deleted' });
    // Invalidate caches that include user stats
    invalidate.users();
    invalidate.dashboard();
    return res.json({ user: rows[0], message: 'User restored successfully' });
  } catch (e) {
    console.error('Restore user error:', e);
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

// Soft delete user (prevent deleting self)
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === String(req.currentUser.id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const { rowCount } = await pool.query(
      "UPDATE users SET deleted_at = NOW() WHERE id::text = $1 AND deleted_at IS NULL",
      [id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'User not found or already deleted' });
    // Invalidate caches that include user stats
    invalidate.users();
    invalidate.dashboard();
    return res.json({ ok: true });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Invite user (creates user if not exists and sends verification link)
router.post('/invite', async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    // Check existing (only non-deleted users)
    const existing = await pool.query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
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
    const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION_MS);
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
