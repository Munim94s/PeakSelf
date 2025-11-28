import express from 'express';

const router = express.Router();

// Get base URL from environment or default to localhost
function getBaseUrl() {
    return process.env.APP_BASE_URL || 'http://localhost:5000';
}

// GET /robots.txt - Robots.txt file
router.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl();

    const robotsTxt = `User-agent: *
Allow: /

# Disallow admin and authentication pages
Disallow: /admin/
Disallow: /login
Disallow: /register
Disallow: /check-email
Disallow: /rate-limit
Disallow: /not-accessible

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
});

export default router;
