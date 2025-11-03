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

// GET /api/admin/niches - Get all niches
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, COUNT(bp.id) as post_count
      FROM niches n
      LEFT JOIN blog_posts bp ON n.id = bp.niche_id
      GROUP BY n.id
      ORDER BY n.display_order ASC, n.name ASC
    `);
    res.json({ niches: result.rows });
  } catch (error) {
    logger.error('Error fetching niches:', error);
    res.status(500).json({ error: 'Failed to fetch niches' });
  }
});

// GET /api/admin/niches/:id - Get single niche
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM niches WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niche not found' });
    }

    res.json({ niche: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching niche:', error);
    res.status(500).json({ error: 'Failed to fetch niche' });
  }
});

// POST /api/admin/niches - Create new niche
router.post('/', async (req, res) => {
  try {
    const { name, display_name, logo_url, logo_text = 'Peakself', is_active = true, display_order, show_on_route = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Niche name is required' });
    }

    const slug = generateSlug(name);

    // Use provided display_order or get the max display_order to add new niche at the end
    let displayOrderValue;
    if (display_order !== undefined && display_order !== null) {
      displayOrderValue = display_order;
    } else {
      const maxOrderResult = await pool.query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM niches'
      );
      displayOrderValue = maxOrderResult.rows[0].next_order;
    }

    const result = await pool.query(
      `INSERT INTO niches (name, slug, display_name, logo_url, logo_text, is_active, display_order, show_on_route)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, slug, display_name || null, logo_url || null, logo_text, is_active, displayOrderValue, show_on_route]
    );

    res.status(201).json({ niche: result.rows[0] });
  } catch (error) {
    logger.error('Error creating niche:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'A niche with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create niche' });
    }
  }
});

// PUT /api/admin/niches/:id - Update niche
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, logo_url, logo_text, is_active, display_order, show_on_route } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Niche name is required' });
    }

    const slug = generateSlug(name);

    // Build dynamic query based on which fields are provided
    const updates = [];
    const params = [name, slug, display_name || null, logo_url || null, logo_text, is_active];
    let paramIndex = 7;
    
    if (display_order !== undefined && display_order !== null) {
      updates.push(`display_order = $${paramIndex}`);
      params.push(display_order);
      paramIndex++;
    }
    
    if (show_on_route !== undefined && show_on_route !== null) {
      updates.push(`show_on_route = $${paramIndex}`);
      params.push(show_on_route);
      paramIndex++;
    }
    
    const updateClause = updates.length > 0 ? ', ' + updates.join(', ') : '';
    params.push(id);
    
    const query = `UPDATE niches 
       SET name = $1, slug = $2, display_name = $3, logo_url = $4, logo_text = $5, is_active = $6${updateClause}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niche not found' });
    }

    res.json({ niche: result.rows[0] });
  } catch (error) {
    logger.error('Error updating niche:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'A niche with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update niche' });
    }
  }
});

// PATCH /api/admin/niches/reorder - Reorder niches
router.patch('/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nicheIds } = req.body; // Array of niche IDs in desired order

    if (!Array.isArray(nicheIds)) {
      return res.status(400).json({ error: 'nicheIds must be an array' });
    }

    await client.query('BEGIN');

    // Update display_order for each niche
    for (let i = 0; i < nicheIds.length; i++) {
      await client.query(
        'UPDATE niches SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [i, nicheIds[i]]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Niches reordered successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error reordering niches:', error);
    res.status(500).json({ error: 'Failed to reorder niches' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/niches/:id - Delete niche
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if niche is being used
    const usageResult = await pool.query(
      'SELECT COUNT(*) as count FROM blog_posts WHERE niche_id = $1',
      [id]
    );

    const isUsed = parseInt(usageResult.rows[0].count) > 0;

    const result = await pool.query(
      'DELETE FROM niches WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niche not found' });
    }

    res.json({ 
      message: 'Niche deleted successfully',
      niche: result.rows[0],
      wasUsed: isUsed
    });
  } catch (error) {
    logger.error('Error deleting niche:', error);
    res.status(500).json({ error: 'Failed to delete niche' });
  }
});

export default router;
