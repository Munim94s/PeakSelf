import pool from '../utils/db.js';
import logger from '../utils/logger.js';

export async function up() {
  logger.info('Running migration: add_analytics_indexes (up)');
  try {
    await pool.query('BEGIN');

    // Blog post sessions: common aggregations and filters
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bps_post_entered
      ON blog_post_sessions(post_id, entered_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bps_post_engaged_source
      ON blog_post_sessions(post_id, was_engaged, traffic_source);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bps_visitor_post
      ON blog_post_sessions(visitor_id, post_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bps_user_post
      ON blog_post_sessions(user_id, post_id)
      WHERE user_id IS NOT NULL;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bps_post_date
      ON blog_post_sessions(post_id, (DATE(entered_at)) DESC);
    `);

    // Blog engagement events: aggregations per post, lookups by visitor
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bee_post_time
      ON blog_engagement_events(post_id, occurred_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bee_visitor_post
      ON blog_engagement_events(visitor_id, post_id);
    `);

    // Blog posts: frequent filters
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_niche_status_published
      ON blog_posts(niche_id, status, published_at DESC)
      WHERE status = 'published';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_status
      ON blog_posts(slug)
      WHERE status = 'published';
    `);

    // Content tags join efficiency
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_tags_content_tag
      ON content_tags(content_id, tag_id);
    `);

    // Blog post analytics fast lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bpa_post
      ON blog_post_analytics(post_id);
    `);

    // Blog post daily stats: frequently queried by post and date
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_daily_stats_post_date
      ON blog_post_daily_stats(post_id, stat_date DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_daily_stats_date
      ON blog_post_daily_stats(stat_date DESC);
    `);

    await pool.query('COMMIT');
    logger.info('Migration add_analytics_indexes completed successfully');
  } catch (err) {
    await pool.query('ROLLBACK');
    logger.error('Migration add_analytics_indexes failed:', err);
    throw err;
  }
}

export async function down() {
  logger.info('Running migration: add_analytics_indexes (down)');
  try {
    await pool.query('BEGIN');

    await pool.query(`DROP INDEX IF EXISTS idx_blog_daily_stats_date`);
    await pool.query(`DROP INDEX IF EXISTS idx_blog_daily_stats_post_date`);
    await pool.query(`DROP INDEX IF EXISTS idx_bpa_post`);
    await pool.query(`DROP INDEX IF EXISTS idx_content_tags_content_tag`);
    await pool.query(`DROP INDEX IF EXISTS idx_blog_posts_slug_status`);
    await pool.query(`DROP INDEX IF EXISTS idx_blog_posts_niche_status_published`);
    await pool.query(`DROP INDEX IF EXISTS idx_bee_visitor_post`);
    await pool.query(`DROP INDEX IF EXISTS idx_bee_post_time`);
    await pool.query(`DROP INDEX IF EXISTS idx_bps_post_date`);
    await pool.query(`DROP INDEX IF EXISTS idx_bps_user_post`);
    await pool.query(`DROP INDEX IF EXISTS idx_bps_visitor_post`);
    await pool.query(`DROP INDEX IF EXISTS idx_bps_post_engaged_source`);
    await pool.query(`DROP INDEX IF EXISTS idx_bps_post_entered`);

    await pool.query('COMMIT');
    logger.info('Rollback add_analytics_indexes completed successfully');
  } catch (err) {
    await pool.query('ROLLBACK');
    logger.error('Rollback add_analytics_indexes failed:', err);
    throw err;
  }
}
