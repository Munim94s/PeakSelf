import request from 'supertest';
import express from 'express';
import pool from '../../utils/db.js';
import sitemapRouter from '../../routes/sitemap.js';
import cache from '../../utils/cache.js';

// Create a test app
const app = express();
app.use('/', sitemapRouter);

jest.mock('../../utils/db.js');
jest.mock('../../utils/cache.js');

describe('Sitemap Routes', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Reset cache
        cache.get.mockReturnValue(null);
        cache.set.mockReturnValue(true);

        // Set test environment variable
        process.env.APP_BASE_URL = 'http://localhost:5000';
    });

    afterEach(() => {
        // Clean up
        delete process.env.APP_BASE_URL;
    });

    describe('GET /sitemap.xml', () => {
        it('should return valid XML sitemap', async () => {
            // Mock database responses
            pool.query
                .mockResolvedValueOnce({ rows: [] }) // blog posts
                .mockResolvedValueOnce({ rows: [] }) // tags
                .mockResolvedValueOnce({ rows: [] }); // niches

            const response = await request(app).get('/sitemap.xml');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/xml');
            expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(response.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
            expect(response.text).toContain('</urlset>');
        });

        it('should include static pages with proper priorities', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            // Check homepage
            expect(response.text).toContain('<loc>http://localhost:5000/</loc>');
            expect(response.text).toContain('<priority>1.0</priority>');

            // Check about page
            expect(response.text).toContain('<loc>http://localhost:5000/about</loc>');
            expect(response.text).toContain('<priority>0.8</priority>');

            // Check contact page
            expect(response.text).toContain('<loc>http://localhost:5000/contact</loc>');

            // Check blog listing
            expect(response.text).toContain('<loc>http://localhost:5000/blog</loc>');
            expect(response.text).toContain('<priority>0.9</priority>');
        });

        it('should include published blog posts', async () => {
            const mockPosts = [
                {
                    slug: 'test-post-1',
                    updated_at: new Date('2024-01-15'),
                    published_at: new Date('2024-01-10'),
                    created_at: new Date('2024-01-05'),
                },
                {
                    slug: 'test-post-2',
                    updated_at: null,
                    published_at: new Date('2024-01-12'),
                    created_at: new Date('2024-01-08'),
                },
            ];

            pool.query
                .mockResolvedValueOnce({ rows: mockPosts })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            expect(response.text).toContain('<loc>http://localhost:5000/blog/test-post-1</loc>');
            expect(response.text).toContain('<loc>http://localhost:5000/blog/test-post-2</loc>');
            expect(response.text).toContain('<priority>0.7</priority>');
            expect(response.text).toContain('<changefreq>weekly</changefreq>');
        });

        it('should include tag pages', async () => {
            const mockTags = [
                { slug: 'javascript' },
                { slug: 'react' },
            ];

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: mockTags })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            expect(response.text).toContain('<loc>http://localhost:5000/blog/tags/javascript</loc>');
            expect(response.text).toContain('<loc>http://localhost:5000/blog/tags/react</loc>');
            expect(response.text).toContain('<priority>0.6</priority>');
        });

        it('should include niche pages', async () => {
            const mockNiches = [
                { slug: 'tech' },
                { slug: 'business' },
            ];

            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: mockNiches });

            const response = await request(app).get('/sitemap.xml');

            // Niche landing pages
            expect(response.text).toContain('<loc>http://localhost:5000/tech</loc>');
            expect(response.text).toContain('<loc>http://localhost:5000/business</loc>');

            // Niche blog pages
            expect(response.text).toContain('<loc>http://localhost:5000/tech/blog</loc>');
            expect(response.text).toContain('<loc>http://localhost:5000/business/blog</loc>');
        });

        it('should escape XML special characters in URLs', async () => {
            const mockPosts = [
                {
                    slug: 'test&special<characters>',
                    updated_at: new Date(),
                    published_at: new Date(),
                    created_at: new Date(),
                },
            ];

            pool.query
                .mockResolvedValueOnce({ rows: mockPosts })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            expect(response.text).toContain('&amp;');
            expect(response.text).toContain('&lt;');
            expect(response.text).toContain('&gt;');
            expect(response.text).not.toContain('test&special<characters>');
        });

        it('should use cache when available', async () => {
            const cachedSitemap = '<?xml version="1.0"?><urlset>cached</urlset>';
            cache.get.mockReturnValue(cachedSitemap);

            const response = await request(app).get('/sitemap.xml');

            expect(response.status).toBe(200);
            expect(response.text).toBe(cachedSitemap);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('should cache the generated sitemap', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await request(app).get('/sitemap.xml');

            expect(cache.set).toHaveBeenCalledWith(
                'sitemap:main',
                expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>'),
                3600
            );
        });

        it('should handle database errors gracefully', async () => {
            pool.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/sitemap.xml');

            expect(response.status).toBe(500);
            expect(response.text).toContain('Error generating sitemap');
        });

        it('should include lastmod dates for all URLs', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            // Count occurrences of lastmod tags
            const lastmodCount = (response.text.match(/<lastmod>/g) || []).length;

            // Should have at least the 4 static pages
            expect(lastmodCount).toBeGreaterThanOrEqual(4);
        });

        it('should format dates correctly (YYYY-MM-DD)', async () => {
            const mockPosts = [
                {
                    slug: 'test-post',
                    updated_at: new Date('2024-03-15T10:30:00Z'),
                    published_at: new Date('2024-03-10T08:00:00Z'),
                    created_at: new Date('2024-03-01T12:00:00Z'),
                },
            ];

            pool.query
                .mockResolvedValueOnce({ rows: mockPosts })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/sitemap.xml');

            // Should contain date in YYYY-MM-DD format
            expect(response.text).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
        });
    });
});
