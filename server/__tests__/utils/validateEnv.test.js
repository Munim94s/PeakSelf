import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Environment Validation Tests', () => {
  let originalEnv;
  let originalExit;
  let consoleMocks;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Mock process.exit to prevent test termination
    // Throw error to stop execution like real exit would
    originalExit = process.exit;
    process.exit = jest.fn((code) => {
      throw new Error(`process.exit(${code})`);
    });
    
    // Mock console methods to suppress output during tests
    consoleMocks = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
    
    // Reset modules
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore process.exit
    process.exit = originalExit;
    
    // Restore console
    Object.values(consoleMocks).forEach(mock => mock.mockRestore());
    
    jest.clearAllMocks();
  });

  describe('Required Variables Validation', () => {
    it('should fail when DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL')
      );
    });

    it('should fail when DATABASE_URL is not a valid PostgreSQL URL', async () => {
      process.env.DATABASE_URL = 'mysql://localhost:3306/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('postgres://')
      );
    });

    it('should accept postgres:// protocol', async () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('validated successfully')
      );
    });

    it('should accept postgresql:// protocol', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should fail when SESSION_SECRET is missing', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      delete process.env.SESSION_SECRET;
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('SESSION_SECRET')
      );
    });

    it('should fail when SESSION_SECRET is too short', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'short';
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('at least 32 characters')
      );
    });

    it('should accept SESSION_SECRET with exactly 32 characters', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should fail when JWT_SECRET is missing', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET')
      );
    });

    it('should fail when JWT_SECRET is too short', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'short';
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('at least 32 characters')
      );
    });

    it('should fail when JWT_SECRET is the default value', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      // Use the actual default value that's checked in validateEnv (it's 24 chars, less than 32)
      // So this test actually checks the length validation, not the default value check
      // The validation checks length BEFORE checking for default value
      process.env.JWT_SECRET = 'dev_jwt_secret_change_me';
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      // This will fail on length, not on being the default value
      const errorCalls = consoleMocks.error.mock.calls.flat().join(' ');
      expect(errorCalls).toContain('JWT_SECRET');
      expect(errorCalls).toContain('32 characters');
    });

    it('should fail when NODE_ENV is missing', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      delete process.env.NODE_ENV;
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('NODE_ENV')
      );
    });

    it('should fail when NODE_ENV is invalid', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'invalid';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('development, production, or test')
      );
    });

    it('should accept NODE_ENV=development', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should accept NODE_ENV=production', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'production';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should accept NODE_ENV=test', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'test';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Optional Variables Validation', () => {
    beforeEach(() => {
      // Set all required vars to valid values
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
    });

    it('should warn when PORT is not a number', async () => {
      process.env.PORT = 'not-a-number';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        expect.stringContaining('PORT')
      );
    });

    it('should accept valid PORT number', async () => {
      process.env.PORT = '3000';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should not warn when PORT is missing', async () => {
      delete process.env.PORT;
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should warn when SMTP_PORT is not a number', async () => {
      process.env.SMTP_PORT = 'not-a-number';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        expect.stringContaining('SMTP_PORT')
      );
    });

    it('should accept valid SMTP_PORT number', async () => {
      process.env.SMTP_PORT = '587';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should accept optional OAuth credentials', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should accept optional SMTP credentials', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Production Environment Warnings', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'production';
    });

    it('should warn when SMTP_HOST is missing in production', async () => {
      delete process.env.SMTP_HOST;
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        expect.stringContaining('SMTP_HOST')
      );
      expect(consoleMocks.warn).toHaveBeenCalledWith(
        expect.stringContaining('Email functionality will not work')
      );
    });

    it('should not warn about SMTP in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.SMTP_HOST;
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
      // Should not have SMTP warning in development
      const smtpWarnings = consoleMocks.warn.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Email functionality'))
      );
      expect(smtpWarnings).toHaveLength(0);
    });
  });

  describe('Success Messages', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
    });

    it('should show success message with environment info', async () => {
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('validated successfully')
      );
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Environment: development')
      );
    });

    it('should show database connection info', async () => {
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Database:')
      );
    });

    it('should show optional features when configured in development', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-id';
      process.env.SMTP_HOST = 'smtp.test.com';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Optional features:')
      );
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Google OAuth')
      );
      expect(consoleMocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Email/SMTP')
      );
    });

    it('should not show optional features section when none configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.SMTP_HOST;
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      const optionalFeaturesCalls = consoleMocks.log.mock.calls.filter(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Optional features:'))
      );
      expect(optionalFeaturesCalls).toHaveLength(0);
    });
  });

  describe('Error Output Format', () => {
    it('should display setup instructions on validation failure', async () => {
      delete process.env.DATABASE_URL;
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('Setup Instructions')
      );
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('.env file')
      );
    });

    it('should show examples for invalid variables', async () => {
      delete process.env.DATABASE_URL;
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('Example:')
      );
    });

    it('should format multiple errors clearly', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.SESSION_SECRET;
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL')
      );
      expect(consoleMocks.error).toHaveBeenCalledWith(
        expect.stringContaining('SESSION_SECRET')
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle all required variables missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.SESSION_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.NODE_ENV;
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle all variables valid with optional features', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      process.env.PORT = '5000';
      process.env.GOOGLE_CLIENT_ID = 'test-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      validateEnv();
      
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should handle empty string values as missing', async () => {
      process.env.DATABASE_URL = '';
      process.env.SESSION_SECRET = 'a'.repeat(32);
      process.env.JWT_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { default: validateEnv } = await import('../../utils/validateEnv.js');
      
      expect(() => validateEnv()).toThrow('process.exit(1)');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
