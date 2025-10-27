import { jest, describe, it, expect } from '@jest/globals';
import { normalizeRange } from '../../utils/dateUtils.js';

describe('Date Utils Tests', () => {
  describe('normalizeRange', () => {
    it('should parse 1h range', () => {
      expect(normalizeRange('1h')).toEqual({ interval: '1 hour', label: 'last hour' });
      expect(normalizeRange('hour')).toEqual({ interval: '1 hour', label: 'last hour' });
      expect(normalizeRange('last_hour')).toEqual({ interval: '1 hour', label: 'last hour' });
    });

    it('should parse 24h range', () => {
      expect(normalizeRange('24h')).toEqual({ interval: '24 hours', label: 'last 24 hours' });
      expect(normalizeRange('1d')).toEqual({ interval: '24 hours', label: 'last 24 hours' });
      expect(normalizeRange('day')).toEqual({ interval: '24 hours', label: 'last 24 hours' });
      expect(normalizeRange('last_day')).toEqual({ interval: '24 hours', label: 'last 24 hours' });
    });

    it('should parse 7d range', () => {
      expect(normalizeRange('7d')).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange('week')).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange('last_week')).toEqual({ interval: '7 days', label: 'last 7 days' });
    });

    it('should parse 30d range', () => {
      expect(normalizeRange('30d')).toEqual({ interval: '30 days', label: 'last 30 days' });
      expect(normalizeRange('month')).toEqual({ interval: '30 days', label: 'last 30 days' });
      expect(normalizeRange('last_month')).toEqual({ interval: '30 days', label: 'last 30 days' });
    });

    it('should parse 90d range', () => {
      expect(normalizeRange('90d')).toEqual({ interval: '90 days', label: 'last 90 days' });
      expect(normalizeRange('quarter')).toEqual({ interval: '90 days', label: 'last 90 days' });
    });

    it('should parse 365d range', () => {
      expect(normalizeRange('365d')).toEqual({ interval: '365 days', label: 'last year' });
      expect(normalizeRange('year')).toEqual({ interval: '365 days', label: 'last year' });
      expect(normalizeRange('last_year')).toEqual({ interval: '365 days', label: 'last year' });
    });

    it('should handle custom day ranges', () => {
      expect(normalizeRange('14')).toEqual({ interval: '14 days', label: 'last 14 days' });
      expect(normalizeRange('45')).toEqual({ interval: '45 days', label: 'last 45 days' });
    });

    it('should use fallback for invalid ranges', () => {
      expect(normalizeRange('')).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange('invalid')).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange(null)).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange(undefined)).toEqual({ interval: '7 days', label: 'last 7 days' });
    });

    it('should use custom fallback days', () => {
      expect(normalizeRange('', 30)).toEqual({ interval: '30 days', label: 'last 30 days' });
      expect(normalizeRange('invalid', 14)).toEqual({ interval: '14 days', label: 'last 14 days' });
    });

    it('should cap day ranges at 365', () => {
      expect(normalizeRange('500')).toEqual({ interval: '365 days', label: 'last 365 days' });
      expect(normalizeRange('1000')).toEqual({ interval: '365 days', label: 'last 365 days' });
    });

    it('should have minimum of 1 day', () => {
      expect(normalizeRange('0')).toEqual({ interval: '7 days', label: 'last 7 days' }); // Falls back to default
      expect(normalizeRange('-5')).toEqual({ interval: '7 days', label: 'last 7 days' }); // Falls back to default
    });

    it('should be case insensitive', () => {
      expect(normalizeRange('HOUR')).toEqual({ interval: '1 hour', label: 'last hour' });
      expect(normalizeRange('Day')).toEqual({ interval: '24 hours', label: 'last 24 hours' });
      expect(normalizeRange('WEEK')).toEqual({ interval: '7 days', label: 'last 7 days' });
    });

    it('should handle whitespace', () => {
      expect(normalizeRange('  7d  ')).toEqual({ interval: '7 days', label: 'last 7 days' });
      expect(normalizeRange('  hour  ')).toEqual({ interval: '1 hour', label: 'last hour' });
    });
  });
});
