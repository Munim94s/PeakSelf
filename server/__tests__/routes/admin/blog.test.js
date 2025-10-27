import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../../setup.js';

const mockPool = createMockPool();
const mockUploadImage = jest.fn();
const mockValidateCsrfToken = jest.fn(() => true);

jest.unstable_mockModule('../../../utils/db.js', () => ({
  default: mockPool,
  checkDatabaseAvailability: jest.fn(() => true),
}));

jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: {
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../utils/supabase.js', () => ({
  uploadImage: mockUploadImage,
}));

jest.unstable_mockModule('../../../middleware/csrf.js', () => ({
  validateCsrfToken: mockValidateCsrfToken,
  csrfProtection: (req, res, next) => next(),
  generateCsrfToken: jest.fn(() => 'test-csrf-token'),
}));

jest.unstable_mockModule('../../../middleware/auth.js', () => ({
  requireAdmin: (req, res, next) => {
    req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin' };
    next();
  },
}));

describe('Admin Blog Routes Tests', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.use((req, res, next) => {
      req.currentUser = { id: 'admin-123', email: 'admin@test.com', role: 'admin' };
      next();
    });

    const blogRouter = (await import('../../../routes/admin/blog.js')).default;
    app.use('/api/admin/blog', blogRouter);

    adminToken = jwt.sign({ sub: 'admin-123', email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCsrfToken.mockReturnValue(true);
  });

  describe('GET /api/admin/blog', () => {
    it('should list all blog posts', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: '1', title: 'Post 1', content: 'Content 1', status: 'published' },
          { id: '2', title: 'Post 2', content: 'Content 2', status: 'draft' },
        ],
      });

      const response = await request(app)
        .get('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.posts).toHaveLength(2);
      expect(response.body.posts[0].title).toBe('Post 1');
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .get('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch blog posts');
    });
  });

  describe('GET /api/admin/blog/:id', () => {
    it('should return a single blog post', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'Post 1', content: 'Content 1', status: 'published' }],
      });

      const response = await request(app)
        .get('/api/admin/blog/1')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.post.id).toBe('1');
      expect(response.body.post.title).toBe('Post 1');
    });

    it('should return 404 for non-existent post', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/blog/nonexistent')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('Blog post not found');
    });
  });

  describe('POST /api/admin/blog', () => {
    it('should create a new blog post', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '1',
          title: 'New Post',
          content: 'New Content',
          excerpt: 'Excerpt',
          slug: 'new-post',
          status: 'draft',
          author_id: 'admin-123',
        }],
      });

      const response = await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'New Post',
          content: 'New Content',
          excerpt: 'Excerpt',
        })
        .expect(201);

      expect(response.body.post.title).toBe('New Post');
      expect(response.body.post.slug).toBe('new-post');
    });

    it('should require title and content', async () => {
      const response = await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Title and content are required');
    });

    it('should handle duplicate slug (unique constraint)', async () => {
      mockPool.query.mockRejectedValueOnce({ code: '23505' });

      const response = await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Duplicate Post',
          content: 'Content',
        })
        .expect(409);

      expect(response.body.error).toBe('A post with this title already exists');
    });

    it('should set status to draft by default', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'Post', content: 'Content', status: 'draft' }],
      });

      await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Post',
          content: 'Content',
        })
        .expect(201);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['draft'])
      );
    });

    it('should allow custom status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'Post', content: 'Content', status: 'published' }],
      });

      await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Post',
          content: 'Content',
          status: 'published',
        })
        .expect(201);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['published'])
      );
    });
  });

  describe('PUT /api/admin/blog/:id', () => {
    it('should update a blog post', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '1',
          title: 'Updated Post',
          content: 'Updated Content',
          status: 'published',
        }],
      });

      const response = await request(app)
        .put('/api/admin/blog/1')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Updated Post',
          content: 'Updated Content',
          status: 'published',
        })
        .expect(200);

      expect(response.body.post.title).toBe('Updated Post');
      expect(response.body.post.status).toBe('published');
    });

    it('should require title and content', async () => {
      const response = await request(app)
        .put('/api/admin/blog/1')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ title: 'Only Title' })
        .expect(400);

      expect(response.body.error).toBe('Title and content are required');
    });

    it('should return 404 for non-existent post', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/admin/blog/nonexistent')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Updated',
          content: 'Content',
        })
        .expect(404);

      expect(response.body.error).toBe('Blog post not found');
    });

    it('should handle duplicate slug on update', async () => {
      mockPool.query.mockRejectedValueOnce({ code: '23505' });

      const response = await request(app)
        .put('/api/admin/blog/1')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Duplicate Title',
          content: 'Content',
        })
        .expect(409);

      expect(response.body.error).toBe('A post with this title already exists');
    });
  });

  describe('DELETE /api/admin/blog/:id', () => {
    it('should delete a blog post', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'Deleted Post' }],
      });

      const response = await request(app)
        .delete('/api/admin/blog/1')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body.message).toBe('Blog post deleted successfully');
    });

    it('should return 404 for non-existent post', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/admin/blog/nonexistent')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404);

      expect(response.body.error).toBe('Blog post not found');
    });
  });

  describe('POST /api/admin/blog/upload-image', () => {
    it('should upload an image', async () => {
      mockUploadImage.mockResolvedValueOnce({
        url: 'https://storage.example.com/image.jpg',
        path: 'blog/image.jpg',
      });

      const response = await request(app)
        .post('/api/admin/blog/upload-image')
        .set('Cookie', [`access_token=${adminToken}`])
        .attach('image', Buffer.from('fake image'), 'test.jpg')
        .expect(200);

      expect(response.body.url).toBe('https://storage.example.com/image.jpg');
      expect(response.body.path).toBe('blog/image.jpg');
    });

    it('should require CSRF token', async () => {
      mockValidateCsrfToken.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/admin/blog/upload-image')
        .set('Cookie', [`access_token=${adminToken}`])
        .attach('image', Buffer.from('fake image'), 'test.jpg')
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should require an image file', async () => {
      const response = await request(app)
        .post('/api/admin/blog/upload-image')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(400);

      expect(response.body.error).toBe('No image file provided');
    });

    it('should handle upload errors', async () => {
      mockUploadImage.mockRejectedValueOnce(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/admin/blog/upload-image')
        .set('Cookie', [`access_token=${adminToken}`])
        .attach('image', Buffer.from('fake image'), 'test.jpg')
        .expect(500);

      expect(response.body.error).toBe('Failed to upload image');
    });
  });

  describe('Slug generation', () => {
    it('should generate slug from title', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'My New Blog Post', slug: 'my-new-blog-post' }],
      });

      await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'My New Blog Post',
          content: 'Content',
        })
        .expect(201);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['my-new-blog-post'])
      );
    });

    it('should handle special characters in slug', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1', title: 'Test!@# Post', slug: 'test-post' }],
      });

      await request(app)
        .post('/api/admin/blog')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          title: 'Test!@# Post',
          content: 'Content',
        })
        .expect(201);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test-post'])
      );
    });
  });
});
