#!/usr/bin/env node
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables first
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please set it and re-run.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }

function randomDateSince(hoursBack) {
  const now = Date.now();
  const deltaMs = Math.floor(Math.random() * hoursBack * 3600 * 1000);
  return new Date(now - deltaMs);
}

const REFERRERS = [
  'https://instagram.com/peakself',
  'https://www.instagram.com/explore',
  'https://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/shorts/abc123',
  'https://www.google.com/search?q=peakself',
  'https://www.google.co.uk/search?q=habits',
  '',
  '',
  '',
  'https://t.co/somepost',
  'https://news.ycombinator.com/',
  'https://reddit.com/r/selfimprovement',
  'https://facebook.com',
  '',
];

const PATHS = [
  '/', '/blog', '/blog/habits-that-stick', '/contact', '/about', '/login', '/register', '/post/how-to-focus'
];

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36'
];

const SOURCES = ['instagram', 'youtube', 'google', 'other'];

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS traffic_events (
      id BIGSERIAL PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL,
      referrer TEXT,
      path TEXT,
      user_agent TEXT,
      ip TEXT
    )
  `);
}

function pickSource() {
  // Weighted distribution: instagram 30%, youtube 25%, google 30%, other 15%
  const r = Math.random();
  if (r < 0.30) return 'instagram';
  if (r < 0.55) return 'youtube';
  if (r < 0.85) return 'google';
  return 'other';
}

function referrerFor(source) {
  const pool = REFERRERS.slice();
  if (source === 'instagram') return randChoice(['https://instagram.com/peakself', 'https://www.instagram.com/explore', '']);
  if (source === 'youtube') return randChoice(['https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/shorts/abc123', '']);
  if (source === 'google') return randChoice(['https://www.google.com/search?q=peakself', 'https://www.google.co.uk/search?q=habits']);
  return randChoice(REFERRERS);
}

async function insertBatch(n, hoursBack) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const source = pickSource();
    const ref = referrerFor(source);
    const occurredAt = randomDateSince(hoursBack);
    const path = randChoice(PATHS);
    const agent = randChoice(AGENTS);
    const ip = `${randInt(10, 250)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
    rows.push({ occurred_at: occurredAt, source, referrer: ref, path, user_agent: agent, ip });
  }

  const values = [];
  const params = [];
  let idx = 1;
  for (const r of rows) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(r.occurred_at, r.source, r.referrer, r.path, r.user_agent, r.ip);
  }
  await pool.query(
    `INSERT INTO traffic_events (occurred_at, source, referrer, path, user_agent, ip) VALUES ${values.join(',')}`,
    params
  );
}

async function main() {
  await ensureTable();

  const counts = {
    hour: parseInt(process.env.MOCK_HOUR || '200', 10),
    day: parseInt(process.env.MOCK_DAY || '800', 10),
    week: parseInt(process.env.MOCK_WEEK || '2000', 10),
    month: parseInt(process.env.MOCK_MONTH || '4000', 10),
    year: parseInt(process.env.MOCK_YEAR || '8000', 10),
  };

  console.log('Seeding mock traffic events...');
  await insertBatch(counts.hour, 1);     // last 1 hour
  await insertBatch(counts.day, 24);     // last 24 hours
  await insertBatch(counts.week, 24 * 7); // last 7 days
  await insertBatch(counts.month, 24 * 30); // last 30 days
  await insertBatch(counts.year, 24 * 365);  // last 365 days
  console.log('Done.');
}

main().then(() => pool.end()).catch((e) => {
  console.error('Seed failed:', e);
  process.exitCode = 1;
  pool.end();
});
