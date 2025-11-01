import express from 'express';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/blog - Get all published blog posts
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, tag } = req.query;
    
    let query = `
      SELECT bp.id, bp.title, bp.excerpt, bp.slug, bp.content, bp.image,
        bp.created_at, bp.updated_at, bp.published_at,
        u.name as author,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
      LEFT JOIN tags t ON bpt.tag_id = t.id
      WHERE bp.status = 'published'
    `;
    
    const params = [];
    
    // Filter by tag if specified
    if (tag) {
      query += ` AND bp.id IN (
        SELECT bpt2.blog_post_id 
        FROM blog_post_tags bpt2 
        JOIN tags t2 ON bpt2.tag_id = t2.id 
        WHERE t2.slug = $${params.length + 1}
      )`;
      params.push(tag);
    }
    
    query += `
      GROUP BY bp.id, u.name
      ORDER BY bp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    res.json({ posts: result.rows });
  } catch (error) {
    logger.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/blog/:slug - Get single published blog post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(`
      SELECT bp.*,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM blog_posts bp
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.blog_post_id
      LEFT JOIN tags t ON bpt.tag_id = t.id
      WHERE bp.slug = $1 AND bp.status = 'published'
      GROUP BY bp.id
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ post: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

export default router;
