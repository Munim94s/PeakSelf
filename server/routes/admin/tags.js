import express from 'express';
import pool from '../../utils/db.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/admin/tags - Get all tags
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, COUNT(ct.content_id) as post_count
      FROM tags t
      LEFT JOIN content_tags ct ON t.id = ct.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `);
    res.json({ tags: result.rows });
  } catch (error) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/admin/tags/:id - Get single tag
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tags WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ tag: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// POST /api/admin/tags - Create new tag
router.post('/', async (req, res) => {
  try {
    const { name, color = '#3b82f6' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const slug = generateSlug(name);

    const result = await pool.query(
      `INSERT INTO tags (name, slug, color)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, slug, color]
    );

    res.status(201).json({ tag: result.rows[0] });
  } catch (error) {
    logger.error('Error creating tag:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'A tag with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create tag' });
    }
  }
});

// PUT /api/admin/tags/:id - Update tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const slug = generateSlug(name);

    const result = await pool.query(
      `UPDATE tags 
       SET name = $1, slug = $2, color = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, slug, color, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ tag: result.rows[0] });
  } catch (error) {
    logger.error('Error updating tag:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'A tag with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update tag' });
    }
  }
});

// DELETE /api/admin/tags/:id - Delete tag
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag is being used
    const usageResult = await pool.query(
      'SELECT COUNT(*) as count FROM content_tags WHERE tag_id = $1',
      [id]
    );

    const isUsed = parseInt(usageResult.rows[0].count) > 0;

    const result = await pool.query(
      'DELETE FROM tags WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ 
      message: 'Tag deleted successfully',
      tag: result.rows[0],
      wasUsed: isUsed
    });
  } catch (error) {
    logger.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
