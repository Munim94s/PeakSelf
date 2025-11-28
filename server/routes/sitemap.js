import express from 'express';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';
import cache from '../utils/cache.js';

const router = express.Router();

// Sitemap cache configuration
const SITEMAP_CACHE_KEY = 'sitemap:main';
const SITEMAP_CACHE_TTL = 3600; // 1 hour in seconds

// Helper function to escape XML special characters
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to format date for sitemap (YYYY-MM-DD)
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Get base URL from environment or default to localhost
function getBaseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:5000';
}

// Generate sitemap XML
async function generateSitemap() {
  try {
    const baseUrl = getBaseUrl();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/about', priority: '0.8', changefreq: 'monthly' },
      { loc: '/contact', priority: '0.8', changefreq: 'monthly' },
      { loc: '/blog', priority: '0.9', changefreq: 'daily' },
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(baseUrl + page.loc)}</loc>\n`;
      xml += `    <lastmod>${formatDate()}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Get all published blog posts
    const postsResult = await pool.query(`
      SELECT slug, updated_at, published_at, created_at
      FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
    `);

    postsResult.rows.forEach(post => {
      const lastmod = post.updated_at || post.published_at || post.created_at;
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(baseUrl + '/blog/' + post.slug)}</loc>\n`;
      xml += `    <lastmod>${formatDate(lastmod)}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += '  </url>\n';
    });

    // Get all tags (if they have posts)
    const tagsResult = await pool.query(`
      SELECT DISTINCT t.slug
      FROM tags t
      INNER JOIN content_tags ct ON t.id = ct.tag_id
      INNER JOIN blog_posts bp ON ct.content_id = bp.id
      WHERE bp.status = 'published'
      ORDER BY t.slug
    `);

    tagsResult.rows.forEach(tag => {
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(baseUrl + '/blog/tags/' + tag.slug)}</loc>\n`;
      xml += `    <lastmod>${formatDate()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += '  </url>\n';
    });

    // Get all active niches
    const nichesResult = await pool.query(`
      SELECT slug
      FROM niches
      WHERE is_active = TRUE
      ORDER BY display_order, slug
    `);

    nichesResult.rows.forEach(niche => {
      // Niche page
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(baseUrl + '/' + niche.slug)}</loc>\n`;
      xml += `    <lastmod>${formatDate()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';

      // Niche blog page
      xml += '  <url>\n';
      xml += `    <loc>${escapeXml(baseUrl + '/' + niche.slug + '/blog')}</loc>\n`;
      xml += `    <lastmod>${formatDate()}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    logger.info(`Generated sitemap with ${postsResult.rows.length} blog posts, ${tagsResult.rows.length} tags, ${nichesResult.rows.length} niches`);
    return xml;
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    throw error;
  }
}

// GET /sitemap.xml - Main sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Try to get from cache first
    let sitemap = cache.get(SITEMAP_CACHE_KEY);

    if (!sitemap) {
      // Generate new sitemap
      sitemap = await generateSitemap();
      
      // Cache for 1 hour
      cache.set(SITEMAP_CACHE_KEY, sitemap, SITEMAP_CACHE_TTL);
    }

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Error serving sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
