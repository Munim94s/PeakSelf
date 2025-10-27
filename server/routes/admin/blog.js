import express from 'express';
import pool, { checkDatabaseAvailability } from '../../utils/db.js';
import { requireAdmin } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';
import multer from 'multer';
import { uploadImage, deleteImage } from '../../utils/supabase.js';
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
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the blog post to extract image paths from content
    const postResult = await pool.query(
      'SELECT content FROM blog_posts WHERE id = $1',
      [id]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    const content = postResult.rows[0].content;

    // Delete the blog post from database
    await pool.query(
      'DELETE FROM blog_posts WHERE id = $1',
      [id]
    );

    // Extract and delete images from Supabase
    // Look for Supabase image URLs in the content (format: https://...supabase.co/storage/v1/object/public/blog-images/...)
    const imageUrlPattern = /https:\/\/[^\s]+\.supabase\.co\/storage\/v1\/object\/public\/blog-images\/([^\s"')]+)/g;
    const matches = content.matchAll(imageUrlPattern);
    
    const deletePromises = [];
    for (const match of matches) {
      const imagePath = match[1]; // Extract the file path from the URL
      try {
        deletePromises.push(deleteImage(imagePath));
        logger.info(`Deleting image: ${imagePath}`);
      } catch (error) {
        // Log but don't fail the entire deletion if image deletion fails
        logger.warn(`Failed to delete image ${imagePath}:`, error.message);
      }
    }

    // Wait for all image deletions (but don't block the response)
    Promise.all(deletePromises).catch(err => {
      logger.error('Some images failed to delete:', err);
    });

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// POST /api/admin/blog/upload-image - Upload image to Supabase
router.post('/upload-image', upload.single('image'), async (req, res) => {
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
