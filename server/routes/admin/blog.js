import express from 'express';
import pool, { checkDatabaseAvailability } from '../../utils/db.js';
import { requireAdmin } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import multer from 'multer';
import { uploadImage } from '../../utils/supabase.js';
import { validateCsrfToken } from '../../middleware/csrf.js';

const router = express.Router();

// Configure multer for image uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/admin/blog - Get all blog posts
router.get('/', requireAdmin, async (req, res) => {
  if (!checkDatabaseAvailability(res)) return;

  try {
    const result = await pool.query(
      'SELECT * FROM blog_posts ORDER BY created_at DESC'
    );
    res.json({ posts: result.rows });
  } catch (error) {
    logger.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/admin/blog/:id - Get single blog post
router.get('/:id', requireAdmin, async (req, res) => {
  if (!checkDatabaseAvailability(res)) return;

  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blog_posts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// POST /api/admin/blog - Create new blog post
router.post('/', requireAdmin, async (req, res) => {
  if (!checkDatabaseAvailability(res)) return;

  try {
    const { title, content, excerpt, status = 'draft' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const slug = generateSlug(title);
    const authorId = req.currentUser.id;

    const result = await pool.query(
      `INSERT INTO blog_posts (title, content, excerpt, slug, status, author_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, content, excerpt, slug, status, authorId]
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (error) {
    logger.error('Error creating blog post:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'A post with this title already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create blog post' });
    }
  }
});

// PUT /api/admin/blog/:id - Update blog post
router.put('/:id', requireAdmin, async (req, res) => {
  if (!checkDatabaseAvailability(res)) return;

  try {
    const { id } = req.params;
    const { title, content, excerpt, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const slug = generateSlug(title);

    const result = await pool.query(
      `UPDATE blog_posts 
       SET title = $1, content = $2, excerpt = $3, slug = $4, status = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, content, excerpt, slug, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (error) {
    logger.error('Error updating blog post:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'A post with this title already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  }
});

// DELETE /api/admin/blog/:id - Delete blog post
router.delete('/:id', requireAdmin, async (req, res) => {
  if (!checkDatabaseAvailability(res)) return;

  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM blog_posts WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// POST /api/admin/blog/upload-image - Upload image to Supabase
router.post('/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    // Manually validate CSRF token (multipart/form-data bypasses global CSRF middleware)
    const isValid = validateCsrfToken(req);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ url: result.url, path: result.path });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
