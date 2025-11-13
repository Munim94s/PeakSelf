import pool from '../utils/db.js';
import logger from '../utils/logger.js';

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    logger.info('Creating blog engagement tracking tables...');

    // Blog post analytics table (aggregated metrics per post)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_post_analytics (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        
        -- View metrics
        total_views INTEGER NOT NULL DEFAULT 0,
        unique_visitors INTEGER NOT NULL DEFAULT 0,
        returning_visitors INTEGER NOT NULL DEFAULT 0,
        
        -- Engagement metrics
        avg_time_on_page INTEGER NOT NULL DEFAULT 0,
        median_time_on_page INTEGER NOT NULL DEFAULT 0,
        total_time_spent INTEGER NOT NULL DEFAULT 0,
        
        -- Scroll metrics
        avg_scroll_depth DECIMAL(5,2) NOT NULL DEFAULT 0,
        scroll_25_percent INTEGER NOT NULL DEFAULT 0,
        scroll_50_percent INTEGER NOT NULL DEFAULT 0,
        scroll_75_percent INTEGER NOT NULL DEFAULT 0,
        scroll_100_percent INTEGER NOT NULL DEFAULT 0,
        
        -- Interaction metrics
        total_clicks INTEGER NOT NULL DEFAULT 0,
        cta_clicks INTEGER NOT NULL DEFAULT 0,
        outbound_clicks INTEGER NOT NULL DEFAULT 0,
        internal_links_clicked INTEGER NOT NULL DEFAULT 0,
        
        -- Social engagement
        total_shares INTEGER NOT NULL DEFAULT 0,
        twitter_shares INTEGER NOT NULL DEFAULT 0,
        facebook_shares INTEGER NOT NULL DEFAULT 0,
        linkedin_shares INTEGER NOT NULL DEFAULT 0,
        copy_link_count INTEGER NOT NULL DEFAULT 0,
        
        -- Content engagement
        comments_count INTEGER NOT NULL DEFAULT 0,
        likes_count INTEGER NOT NULL DEFAULT 0,
        bookmarks_count INTEGER NOT NULL DEFAULT 0,
        
        -- Bounce & exit
        bounce_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        exit_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        
        -- Traffic sources
        source_direct INTEGER NOT NULL DEFAULT 0,
        source_google INTEGER NOT NULL DEFAULT 0,
        source_instagram INTEGER NOT NULL DEFAULT 0,
        source_facebook INTEGER NOT NULL DEFAULT 0,
        source_youtube INTEGER NOT NULL DEFAULT 0,
        source_twitter INTEGER NOT NULL DEFAULT 0,
        source_other INTEGER NOT NULL DEFAULT 0,
        
        -- Conversion metrics
        newsletter_signups INTEGER NOT NULL DEFAULT 0,
        form_submissions INTEGER NOT NULL DEFAULT 0,
        
        -- Engagement score (calculated)
        engagement_score DECIMAL(10,2) NOT NULL DEFAULT 0,
        engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        
        -- Time tracking
        first_view_at TIMESTAMPTZ NULL,
        last_view_at TIMESTAMPTZ NULL,
        last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        UNIQUE(post_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_analytics_score 
        ON blog_post_analytics(engagement_score DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_analytics_views 
        ON blog_post_analytics(total_views DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_analytics_post 
        ON blog_post_analytics(post_id);
    `);

    logger.info('✓ blog_post_analytics table created');

    // Individual blog post engagement events (raw data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_engagement_events (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
        visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
        user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        
        event_type TEXT NOT NULL CHECK (event_type IN (
          'view', 'scroll_milestone', 'time_milestone', 'click', 
          'share', 'comment', 'like', 'bookmark', 'exit', 'cta_click',
          'newsletter_signup', 'form_submit', 'copy_link', 'outbound_click',
          'internal_click'
        )),
        
        event_data JSONB NOT NULL DEFAULT '{}',
        
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_engagement_post_time 
        ON blog_engagement_events(post_id, occurred_at DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_engagement_session 
        ON blog_engagement_events(session_id, occurred_at);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_engagement_type 
        ON blog_engagement_events(event_type, post_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_engagement_data 
        ON blog_engagement_events USING GIN (event_data);
    `);

    logger.info('✓ blog_engagement_events table created');

    // Blog post engagement sessions (detailed per-session metrics)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_post_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
        visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
        user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        
        -- Entry/exit
        entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        exited_at TIMESTAMPTZ NULL,
        time_on_page INTEGER NOT NULL DEFAULT 0,
        
        -- Reading progress
        max_scroll_depth DECIMAL(5,2) NOT NULL DEFAULT 0,
        read_to_end BOOLEAN NOT NULL DEFAULT FALSE,
        
        -- Engagement flags
        was_engaged BOOLEAN NOT NULL DEFAULT FALSE,
        clicked_cta BOOLEAN NOT NULL DEFAULT FALSE,
        shared_content BOOLEAN NOT NULL DEFAULT FALSE,
        submitted_form BOOLEAN NOT NULL DEFAULT FALSE,
        
        -- Source
        traffic_source TEXT NOT NULL,
        referrer TEXT NULL,
        
        -- Entry point
        is_landing_page BOOLEAN NOT NULL DEFAULT FALSE,
        is_exit_page BOOLEAN NOT NULL DEFAULT FALSE,
        
        UNIQUE(session_id, post_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_sessions_post 
        ON blog_post_sessions(post_id, entered_at DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_sessions_engaged 
        ON blog_post_sessions(post_id) WHERE was_engaged = TRUE;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_sessions_source 
        ON blog_post_sessions(post_id, traffic_source);
    `);

    logger.info('✓ blog_post_sessions table created');

    // Time-series analytics (daily snapshots for trend analysis)
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_post_daily_stats (
        id BIGSERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
        stat_date DATE NOT NULL,
        
        views INTEGER NOT NULL DEFAULT 0,
        unique_visitors INTEGER NOT NULL DEFAULT 0,
        avg_time_on_page INTEGER NOT NULL DEFAULT 0,
        avg_scroll_depth DECIMAL(5,2) NOT NULL DEFAULT 0,
        engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        total_shares INTEGER NOT NULL DEFAULT 0,
        newsletter_signups INTEGER NOT NULL DEFAULT 0,
        
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        UNIQUE(post_id, stat_date)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_daily_stats_post_date 
        ON blog_post_daily_stats(post_id, stat_date DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_daily_stats_date 
        ON blog_post_daily_stats(stat_date DESC);
    `);

    logger.info('✓ blog_post_daily_stats table created');

    // Initialize analytics records for existing blog posts
    await client.query(`
      INSERT INTO blog_post_analytics (post_id)
      SELECT id FROM blog_posts
      ON CONFLICT (post_id) DO NOTHING;
    `);

    logger.info('✓ Initialized analytics for existing blog posts');

    await client.query('COMMIT');
    logger.info('✅ Blog engagement tracking migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Error creating blog engagement tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('DROP TABLE IF EXISTS blog_post_daily_stats CASCADE;');
    await client.query('DROP TABLE IF EXISTS blog_post_sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS blog_engagement_events CASCADE;');
    await client.query('DROP TABLE IF EXISTS blog_post_analytics CASCADE;');
    
    await client.query('COMMIT');
    logger.info('✓ Blog engagement tracking tables dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error dropping blog engagement tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { up, down };
