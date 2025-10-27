import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Supabase Utils Tests', () => {
  let originalEnv;
  let mockSupabaseClient;
  let mockStorageFrom;
  let mockUpload;
  let mockGetPublicUrl;
  let mockRemove;
  let mockLogger;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Mock logger
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
    };
    
    // Mock the logger module
    jest.unstable_mockModule('../../utils/logger.js', () => ({
      default: mockLogger,
    }));

    // Setup mock storage operations
    mockUpload = jest.fn();
    mockGetPublicUrl = jest.fn();
    mockRemove = jest.fn();

    mockStorageFrom = jest.fn(() => ({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
    }));

    mockSupabaseClient = {
      storage: {
        from: mockStorageFrom,
      },
    };

    // Mock @supabase/supabase-js
    jest.unstable_mockModule('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => mockSupabaseClient),
    }));

    // Reset modules to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    jest.clearAllMocks();
  });

  describe('Supabase Client Initialization', () => {
    it('should create client when credentials are provided', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const { supabase } = await import('../../utils/supabase.js');
      const { createClient } = await import('@supabase/supabase-js');

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
      expect(supabase).toBeDefined();
      expect(supabase).not.toBeNull();
    });

    it('should set client to null when SUPABASE_URL is missing', async () => {
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const { supabase } = await import('../../utils/supabase.js');

      expect(supabase).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Supabase credentials not configured')
      );
    });

    it('should set client to null when SUPABASE_SERVICE_KEY is missing', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.SUPABASE_SERVICE_KEY;

      const { supabase } = await import('../../utils/supabase.js');

      expect(supabase).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Storage features will not work')
      );
    });

    it('should set client to null when both credentials are missing', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;

      const { supabase } = await import('../../utils/supabase.js');

      expect(supabase).toBeNull();
    });

    it('should export supabase client', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const supabaseModule = await import('../../utils/supabase.js');

      expect(supabaseModule.supabase).toBeDefined();
    });
  });

  describe('uploadImage', () => {
    beforeEach(() => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    });

    it('should upload image successfully', async () => {
      const mockBuffer = Buffer.from('test image data');
      const mockFileName = 'test-image.jpg';
      const mockContentType = 'image/jpeg';
      const mockPublicUrl = 'https://test.supabase.co/storage/v1/object/public/blog-images/123-test-image.jpg';

      mockUpload.mockResolvedValue({
        data: { path: '123-test-image.jpg' },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const result = await uploadImage(mockBuffer, mockFileName, mockContentType);

      expect(mockStorageFrom).toHaveBeenCalledWith('blog-images');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('test-image.jpg'),
        mockBuffer,
        {
          contentType: mockContentType,
          cacheControl: '3600',
          upsert: false,
        }
      );
      expect(result).toEqual({
        url: mockPublicUrl,
        path: expect.stringContaining('test-image.jpg'),
      });
    });

    it('should generate unique file paths with timestamps', async () => {
      const mockBuffer = Buffer.from('test image data');
      const mockFileName = 'image.png';
      const mockContentType = 'image/png';

      mockUpload.mockResolvedValue({
        data: { path: 'some-path' },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.url' },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      await uploadImage(mockBuffer, mockFileName, mockContentType);

      // Check that upload was called with a path containing a timestamp
      const uploadCall = mockUpload.mock.calls[0];
      const filePath = uploadCall[0];
      expect(filePath).toMatch(/^\d+-image\.png$/);
    });

    it('should throw error when Supabase is not configured', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;

      const { uploadImage } = await import('../../utils/supabase.js');
      const mockBuffer = Buffer.from('test data');

      await expect(uploadImage(mockBuffer, 'test.jpg', 'image/jpeg'))
        .rejects.toThrow('Supabase is not configured');
    });

    it('should throw error when upload fails', async () => {
      const mockError = new Error('Upload failed');
      mockUpload.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const mockBuffer = Buffer.from('test data');

      await expect(uploadImage(mockBuffer, 'test.jpg', 'image/jpeg'))
        .rejects.toThrow(mockError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error uploading image to Supabase:',
        mockError
      );
    });

    it('should use correct bucket name', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.url' },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const mockBuffer = Buffer.from('test data');
      await uploadImage(mockBuffer, 'test.jpg', 'image/jpeg');

      expect(mockStorageFrom).toHaveBeenCalledWith('blog-images');
    });

    it('should set correct upload options', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.url' },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const mockBuffer = Buffer.from('test data');
      await uploadImage(mockBuffer, 'test.jpg', 'image/jpeg');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(String),
        mockBuffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        })
      );
    });

    it('should return both URL and path', async () => {
      const mockPath = '123456-test.jpg';
      const mockUrl = 'https://example.com/image.jpg';

      mockUpload.mockResolvedValue({
        data: { path: mockPath },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: mockUrl },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const result = await uploadImage(Buffer.from('test'), 'test.jpg', 'image/jpeg');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('path');
      expect(result.url).toBe(mockUrl);
      expect(result.path).toContain('test.jpg');
    });

    it('should handle different content types', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.url' },
      });

      const { uploadImage } = await import('../../utils/supabase.js');
      const mockBuffer = Buffer.from('test data');

      const contentTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

      for (const contentType of contentTypes) {
        await uploadImage(mockBuffer, `test.${contentType.split('/')[1]}`, contentType);
        expect(mockUpload).toHaveBeenCalledWith(
          expect.any(String),
          mockBuffer,
          expect.objectContaining({ contentType })
        );
        jest.clearAllMocks();
      }
    });
  });

  describe('deleteImage', () => {
    beforeEach(() => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    });

    it('should delete image successfully', async () => {
      const mockFilePath = '123456-test-image.jpg';
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const { deleteImage } = await import('../../utils/supabase.js');
      await deleteImage(mockFilePath);

      expect(mockStorageFrom).toHaveBeenCalledWith('blog-images');
      expect(mockRemove).toHaveBeenCalledWith([mockFilePath]);
    });

    it('should throw error when Supabase is not configured', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_KEY;

      const { deleteImage } = await import('../../utils/supabase.js');

      await expect(deleteImage('test-path.jpg'))
        .rejects.toThrow('Supabase is not configured');
    });

    it('should throw error when deletion fails', async () => {
      const mockError = new Error('Deletion failed');
      mockRemove.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { deleteImage } = await import('../../utils/supabase.js');

      await expect(deleteImage('test-path.jpg'))
        .rejects.toThrow(mockError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting image from Supabase:',
        mockError
      );
    });

    it('should use correct bucket name', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const { deleteImage } = await import('../../utils/supabase.js');
      await deleteImage('test-path.jpg');

      expect(mockStorageFrom).toHaveBeenCalledWith('blog-images');
    });

    it('should pass file path as array', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const filePath = 'folder/test-image.jpg';
      const { deleteImage } = await import('../../utils/supabase.js');
      await deleteImage(filePath);

      expect(mockRemove).toHaveBeenCalledWith([filePath]);
    });

    it('should handle paths with subdirectories', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const { deleteImage } = await import('../../utils/supabase.js');
      await deleteImage('subfolder/nested/image.jpg');

      expect(mockRemove).toHaveBeenCalledWith(['subfolder/nested/image.jpg']);
    });

    it('should not throw on successful deletion with no data', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      const { deleteImage } = await import('../../utils/supabase.js');

      await expect(deleteImage('test.jpg')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    });

    it('should log errors to console for upload failures', async () => {
      const mockError = { message: 'Network error', statusCode: 500 };
      mockUpload.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { uploadImage } = await import('../../utils/supabase.js');

      try {
        await uploadImage(Buffer.from('test'), 'test.jpg', 'image/jpeg');
      } catch (e) {
        // Expected to throw
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error uploading image to Supabase:',
        mockError
      );
    });

    it('should log errors to console for delete failures', async () => {
      const mockError = { message: 'Not found', statusCode: 404 };
      mockRemove.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { deleteImage } = await import('../../utils/supabase.js');

      try {
        await deleteImage('test.jpg');
      } catch (e) {
        // Expected to throw
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting image from Supabase:',
        mockError
      );
    });

    it('should throw the original error for upload', async () => {
      const mockError = new Error('Custom upload error');
      mockUpload.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { uploadImage } = await import('../../utils/supabase.js');

      await expect(uploadImage(Buffer.from('test'), 'test.jpg', 'image/jpeg'))
        .rejects.toBe(mockError);
    });

    it('should throw the original error for delete', async () => {
      const mockError = new Error('Custom delete error');
      mockRemove.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { deleteImage } = await import('../../utils/supabase.js');

      await expect(deleteImage('test.jpg'))
        .rejects.toBe(mockError);
    });
  });

  describe('Module Exports', () => {
    it('should export uploadImage function', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const supabaseModule = await import('../../utils/supabase.js');

      expect(supabaseModule.uploadImage).toBeDefined();
      expect(typeof supabaseModule.uploadImage).toBe('function');
    });

    it('should export deleteImage function', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const supabaseModule = await import('../../utils/supabase.js');

      expect(supabaseModule.deleteImage).toBeDefined();
      expect(typeof supabaseModule.deleteImage).toBe('function');
    });

    it('should export supabase client', async () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

      const supabaseModule = await import('../../utils/supabase.js');

      expect(supabaseModule.supabase).toBeDefined();
    });
  });
});
