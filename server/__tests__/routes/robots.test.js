import request from 'supertest';
import express from 'express';
import robotsRouter from '../../routes/robots.js';

// Create a test app
const app = express();
app.use('/', robotsRouter);

describe('Robots.txt Routes', () => {
    beforeEach(() => {
        // Set test environment variable
        process.env.APP_BASE_URL = 'http://localhost:5000';
    });

    afterEach(() => {
        // Clean up
        delete process.env.APP_BASE_URL;
    });

    describe('GET /robots.txt', () => {
        it('should return robots.txt with correct content type', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
        });

        it('should allow all user agents', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('User-agent: *');
            expect(response.text).toContain('Allow: /');
        });

        it('should disallow admin routes', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Disallow: /admin/');
        });

        it('should disallow authentication pages', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Disallow: /login');
            expect(response.text).toContain('Disallow: /register');
            expect(response.text).toContain('Disallow: /check-email');
        });

        it('should disallow utility pages', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Disallow: /rate-limit');
            expect(response.text).toContain('Disallow: /not-accessible');
        });

        it('should include sitemap URL', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Sitemap: http://localhost:5000/sitemap.xml');
        });

        it('should use APP_BASE_URL from environment', async () => {
            process.env.APP_BASE_URL = 'https://example.com';

            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Sitemap: https://example.com/sitemap.xml');
        });

        it('should use default URL when APP_BASE_URL is not set', async () => {
            delete process.env.APP_BASE_URL;

            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('Sitemap: http://localhost:5000/sitemap.xml');
        });

        it('should have proper line breaks', async () => {
            const response = await request(app).get('/robots.txt');

            // Check that content has multiple lines
            const lines = response.text.split('\n');
            expect(lines.length).toBeGreaterThan(5);
        });

        it('should have clear structure with comments', async () => {
            const response = await request(app).get('/robots.txt');

            expect(response.text).toContain('# Disallow admin and authentication pages');
            expect(response.text).toContain('# Sitemap');
        });
    });
});
