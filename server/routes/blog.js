import express from 'express';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/blog/niches - Get all active niches with their recent posts
router.get('/niches', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit || '3', 10)));

    // Single query to fetch niches with their top N posts (avoids N+1 queries)
    const { rows } = await pool.query(`
      WITH niche_list AS (
        SELECT id, name, slug, display_name, logo_url, logo_text, display_order
        FROM niches
        WHERE is_active = TRUE AND show_on_route = TRUE
      ),
      posts_with_tags AS (
        SELECT 
          bp.id, bp.title, bp.excerpt, bp.slug, bp.image,
          bp.created_at, bp.published_at, bp.niche_id,
          u.name AS author,
          COALESCE(
            json_agg(
              json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS tags
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.id
        LEFT JOIN content_tags ct ON bp.id = ct.content_id
        LEFT JOIN tags t ON ct.tag_id = t.id
        WHERE bp.status = 'published' AND bp.niche_id IN (SELECT id FROM niche_list)
        GROUP BY bp.id, u.name
      ),
      ranked_posts AS (
        SELECT p.*, 
          ROW_NUMBER() OVER (PARTITION BY p.niche_id ORDER BY p.published_at DESC) AS rn
        FROM posts_with_tags p
      )
      SELECT 
        n.id, n.name, n.slug, n.display_name, n.logo_url, n.logo_text,
        COALESCE(
          json_agg(
            json_build_object(
              'id', rp.id,
              'title', rp.title,
              'excerpt', rp.excerpt,
              'slug', rp.slug,
              'image', rp.image,
              'created_at', rp.created_at,
              'published_at', rp.published_at,
              'author', rp.author,
              'tags', rp.tags
            )
            ORDER BY rp.published_at DESC
          ) FILTER (WHERE rp.id IS NOT NULL),
          '[]'
        ) AS posts
      FROM niche_list n
      LEFT JOIN ranked_posts rp ON rp.niche_id = n.id AND rp.rn <= $1
      GROUP BY n.id, n.name, n.slug, n.display_name, n.logo_url, n.logo_text, n.display_order
      ORDER BY n.display_order ASC
    `, [limit]);

    res.json({ niches: rows });
  } catch (error) {
    logger.error('Error fetching niches with posts:', error);
    res.status(500).json({ error: 'Failed to fetch niches' });
  }
});

// GET /api/blog/niches/:slug - Get niche by slug with posts
router.get('/niches/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const rawLimit = parseInt(limit, 10);
    const rawOffset = parseInt(offset, 10);
    const safeLimit = Math.max(1, Math.min(50, Number.isNaN(rawLimit) ? 10 : rawLimit));
    const safeOffset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);
    
    // Get niche details
    const nicheResult = await pool.query(
      'SELECT * FROM niches WHERE slug = $1 AND is_active = true',
      [slug]
    );
    
    if (nicheResult.rows.length === 0) {
      return res.status(404).json({ error: 'Niche not found' });
    }
    
    const niche = nicheResult.rows[0];
    
    // Get posts for this niche
    const postsResult = await pool.query(`
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
      LEFT JOIN content_tags ct ON bp.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE bp.status = 'published' AND bp.niche_id = $1
      GROUP BY bp.id, u.name
      ORDER BY bp.published_at DESC
      LIMIT $2 OFFSET $3
    `, [niche.id, safeLimit, safeOffset]);
    
    res.json({ 
      niche,
      posts: postsResult.rows 
    });
  } catch (error) {
    logger.error('Error fetching niche posts:', error);
    res.status(500).json({ error: 'Failed to fetch niche posts' });
  }
});

// GET /api/blog - Get all published blog posts
router.get('/', async (req, res) => {
  try {
    const { limit = 10, offset = 0, tag, search } = req.query;
    
    const rawLimit = parseInt(limit, 10);
    const rawOffset = parseInt(offset, 10);
    const safeLimit = Math.max(1, Math.min(50, Number.isNaN(rawLimit) ? 10 : rawLimit));
    const safeOffset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);
    
    let query = `
      SELECT bp.id, bp.title, bp.excerpt, bp.slug, bp.content, bp.image,
        bp.created_at, bp.updated_at, bp.published_at, bp.niche_id,
        u.name as author,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        n.name as niche_name,
        n.slug as niche_slug
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN content_tags ct ON bp.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      LEFT JOIN niches n ON bp.niche_id = n.id
      WHERE bp.status = 'published'
    `;
    
    const params = [];
    
    // Filter by tag if specified
    if (tag) {
      query += ` AND bp.id IN (
        SELECT ct2.content_id 
        FROM content_tags ct2 
        JOIN tags t2 ON ct2.tag_id = t2.id 
        WHERE t2.slug = $${params.length + 1}
      )`;
      params.push(tag);
    }

    // Full-text style search across title, excerpt, and tag names
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = `%${search.toLowerCase()}%`;
      params.push(term);
      const idx = params.length;
      query += ` AND (
        LOWER(bp.title) LIKE $${idx}
        OR LOWER(bp.excerpt) LIKE $${idx}
        OR EXISTS (
          SELECT 1
          FROM content_tags ct3
          JOIN tags t3 ON ct3.tag_id = t3.id
          WHERE ct3.content_id = bp.id
            AND LOWER(t3.name) LIKE $${idx}
        )
      )`;
    }
    
    query += `
      GROUP BY bp.id, u.name, n.name, n.slug
      ORDER BY bp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    params.push(safeLimit, safeOffset);
    
    const result = await pool.query(query, params);
    res.json({ posts: result.rows });
  } catch (error) {
    logger.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/blog/similar/:postId - Get similar posts based on tags
router.get('/similar/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 6 } = req.query;

    const rawLimit = parseInt(limit, 10);
    const safeLimit = Math.max(1, Math.min(20, Number.isNaN(rawLimit) ? 6 : rawLimit));
    
    // Get tags for the current post
    const tagsResult = await pool.query(
      'SELECT tag_id FROM content_tags WHERE content_id = $1',
      [postId]
    );
    
    if (tagsResult.rows.length === 0) {
      return res.json({ posts: [] });
    }
    
    const tagIds = tagsResult.rows.map(row => row.tag_id);
    
    // Find posts with similar tags, ordered by number of matching tags
    const result = await pool.query(`
      SELECT bp.id, bp.title, bp.excerpt, bp.slug, bp.image,
        bp.created_at, bp.published_at,
        u.name as author,
        COALESCE(
          json_agg(
            DISTINCT json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        COUNT(DISTINCT ct.tag_id) as matching_tags
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN content_tags ct ON bp.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
      WHERE bp.status = 'published' 
        AND bp.id != $1
        AND bp.id IN (
          SELECT DISTINCT content_id 
          FROM content_tags 
          WHERE tag_id = ANY($2)
        )
      GROUP BY bp.id, u.name
      ORDER BY matching_tags DESC, bp.published_at DESC
      LIMIT $3
    `, [postId, tagIds, safeLimit]);
    
    res.json({ posts: result.rows });
  } catch (error) {
    logger.error('Error fetching similar posts:', error);
    res.status(500).json({ error: 'Failed to fetch similar posts' });
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
      LEFT JOIN content_tags ct ON bp.id = ct.content_id
      LEFT JOIN tags t ON ct.tag_id = t.id
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
