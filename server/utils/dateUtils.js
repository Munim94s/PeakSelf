/**
 * Parse a time range string into a safe SQL interval literal and a human-readable label
 * @param {string} range - Time range string (e.g., '1h', '24h', '7d', '30d')
 * @param {number} fallbackDays - Default number of days if range is invalid (default: 7)
 * @returns {Object} - Object with interval (SQL-safe string) and label (human-readable)
 */
export function normalizeRange(range, fallbackDays = 7) {
  const r = String(range || '').trim().toLowerCase();
  switch (r) {
    case '1h':
    case 'hour':
    case 'last_hour':
      return { interval: "1 hour", label: "last hour" };
    case '24h':
    case '1d':
    case 'day':
    case 'last_day':
      return { interval: "24 hours", label: "last 24 hours" };
    case '7d':
    case 'week':
    case 'last_week':
      return { interval: "7 days", label: "last 7 days" };
    case '30d':
    case 'month':
    case 'last_month':
      return { interval: "30 days", label: "last 30 days" };
    case '90d':
    case 'quarter':
      return { interval: "90 days", label: "last 90 days" };
    case '365d':
    case 'year':
    case 'last_year':
      return { interval: "365 days", label: "last year" };
    default: {
      const parsed = parseInt(r, 10);
      // If parsing fails (NaN) or value is 0 or negative, use fallback
      if (isNaN(parsed) || parsed <= 0) {
        return { interval: `${fallbackDays} days`, label: `last ${fallbackDays} days` };
      }
      const days = Math.min(365, parsed);
      return { interval: `${days} days`, label: `last ${days} days` };
    }
  }
}
