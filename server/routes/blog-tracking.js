import express from 'express';
import pool from '../utils/db.js';
import logger from '../utils/logger.js';
import { success, error as errorResponse } from '../utils/response.js';
import { TRACKING_COOKIES } from '../constants.js';
import analyticsQueue from '../utils/analyticsQueue.js';

const router = express.Router();

// Helper to get current tracking IDs from cookies
function getTrackingIds(req) {
  const sessionId = req.cookies?.[TRACKING_COOKIES.SESSION_ID] || null;
  const visitorId = req.cookies?.[TRACKING_COOKIES.VISITOR_ID] || null;
  const userId = req.user?.id || null;
  
  return { sessionId, visitorId, userId };
}

// Helper to categorize traffic source from query params, cookies, or referrer
function categorizeSource(sourceHint, referrer) {
  const s = (sourceHint || "").toLowerCase();
  const r = (referrer || "").toLowerCase();
  if (s.includes('instagram') || r.includes('instagram.com')) return 'instagram';
  if (s.includes('facebook') || s.includes('fb') || r.includes('facebook.com') || r.includes('fb.com')) return 'facebook';
  if (s.includes('youtube') || r.includes('youtube.com') || r.includes('youtu.be')) return 'youtube';
  if (s.includes('google') || r.includes('google.')) return 'google';
  if (s.includes('twitter') || s.includes('x.com') || r.includes('twitter.com') || r.includes('x.com')) return 'twitter';
  if (!r && !s) return 'direct';
  return 'other';
}

// Helper to determine traffic source from request
function getTrafficSource(req) {
  // Check for explicit source in request body (from client-side tracking)
  const bodySource = req.body?.source;
  
  // Check for source cookie (from initial page visit)
  const cookieSource = req.cookies?.[TRACKING_COOKIES.SOURCE];
  
  // Get referrer
  const referrer = req.get('referer') || req.body?.referrer || null;
  
  // Prioritize: explicit body source > cookie source > categorized from referrer
  if (bodySource) {
    return categorizeSource(bodySource, referrer);
  }
  
  if (cookieSource && cookieSource !== 'other') {
    return cookieSource;
  }
  
  // Fall back to categorizing from referrer
  return categorizeSource(null, referrer);
}

// Calculate engagement score based on analytics
function calculateEngagementScore(analytics) {
  const {
    total_views = 0,
    avg_time_on_page = 0,
    scroll_100_percent = 0,
    total_shares = 0,
    newsletter_signups = 0,
    cta_clicks = 0,
    avg_scroll_depth = 0
  } = analytics;

  // Weighted scoring formula
  const score = 
    (total_views * 1) +
    (avg_time_on_page * 0.5) +
    (scroll_100_percent * 5) +
    (total_shares * 10) +
    (newsletter_signups * 20) +
    (cta_clicks * 3) +
    (avg_scroll_depth * 0.5);

  return Math.round(score * 100) / 100;
}

// Update aggregated analytics for a post
async function updatePostAnalytics(client, postId) {
  try {
    // Calculate aggregated metrics from blog_post_sessions
    const result = await client.query(`
      WITH session_stats AS (
        SELECT
          COUNT(DISTINCT session_id) as total_views,
          COUNT(DISTINCT visitor_id) as unique_visitors,
          COALESCE(AVG(time_on_page)::INTEGER, 0) as avg_time,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_on_page)::INTEGER, 0) as median_time,
          COALESCE(SUM(time_on_page)::INTEGER, 0) as total_time,
          COALESCE(AVG(max_scroll_depth)::DECIMAL(5,2), 0) as avg_scroll,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 25) as scroll_25,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 50) as scroll_50,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 75) as scroll_75,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 100) as scroll_100,
          COUNT(*) FILTER (WHERE was_engaged = TRUE) as engaged_sessions,
          COUNT(*) FILTER (WHERE clicked_cta = TRUE) as cta_clicks,
          COUNT(*) FILTER (WHERE shared_content = TRUE) as shares,
          COUNT(*) FILTER (WHERE submitted_form = TRUE) as forms,
          COUNT(*) FILTER (WHERE traffic_source = 'direct') as src_direct,
          COUNT(*) FILTER (WHERE traffic_source = 'google') as src_google,
          COUNT(*) FILTER (WHERE traffic_source = 'instagram') as src_instagram,
          COUNT(*) FILTER (WHERE traffic_source = 'facebook') as src_facebook,
          COUNT(*) FILTER (WHERE traffic_source = 'youtube') as src_youtube,
          COUNT(*) FILTER (WHERE traffic_source = 'other') as src_other,
          MIN(entered_at) as first_view,
          MAX(entered_at) as last_view
        FROM blog_post_sessions
        WHERE post_id = $1
      ),
      event_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'share' AND event_data->>'platform' = 'twitter') as twitter_shares,
          COUNT(*) FILTER (WHERE event_type = 'share' AND event_data->>'platform' = 'facebook') as facebook_shares,
          COUNT(*) FILTER (WHERE event_type = 'share' AND event_data->>'platform' = 'linkedin') as linkedin_shares,
          COUNT(*) FILTER (WHERE event_type = 'copy_link') as copy_links,
          COUNT(*) FILTER (WHERE event_type = 'newsletter_signup') as newsletter_signups,
          COUNT(*) FILTER (WHERE event_type = 'comment') as comments,
          COUNT(*) FILTER (WHERE event_type = 'like') as likes,
          COUNT(*) FILTER (WHERE event_type = 'bookmark') as bookmarks,
          COUNT(*) FILTER (WHERE event_type = 'cta_click') as total_clicks,
          COUNT(*) FILTER (WHERE event_type = 'outbound_click') as outbound_clicks,
          COUNT(*) FILTER (WHERE event_type = 'internal_click') as internal_clicks
        FROM blog_engagement_events
        WHERE post_id = $1
      )
      SELECT * FROM session_stats, event_stats
    `, [postId]);

    if (result.rows.length === 0) return;

    const stats = result.rows[0];
    const engagementRate = stats.total_views > 0 
      ? (stats.engaged_sessions / stats.total_views * 100).toFixed(2)
      : 0;

    // Ensure no NULL values are passed
    const safeStats = {
      ...stats,
      avg_time: stats.avg_time || 0,
      median_time: stats.median_time || 0,
      total_time: stats.total_time || 0,
      avg_scroll: stats.avg_scroll || 0
    };

    // Update blog_post_analytics
    await client.query(`
      UPDATE blog_post_analytics SET
        total_views = $1,
        unique_visitors = $2,
        avg_time_on_page = $3,
        median_time_on_page = $4,
        total_time_spent = $5,
        avg_scroll_depth = $6,
        scroll_25_percent = $7,
        scroll_50_percent = $8,
        scroll_75_percent = $9,
        scroll_100_percent = $10,
        cta_clicks = $11,
        total_shares = $12,
        twitter_shares = $13,
        facebook_shares = $14,
        linkedin_shares = $15,
        copy_link_count = $16,
        newsletter_signups = $17,
        comments_count = $18,
        likes_count = $19,
        bookmarks_count = $20,
        form_submissions = $21,
        source_direct = $22,
        source_google = $23,
        source_instagram = $24,
        source_facebook = $25,
        source_youtube = $26,
        source_other = $27,
        total_clicks = $28,
        outbound_clicks = $29,
        internal_links_clicked = $30,
        engagement_rate = $31,
        first_view_at = $32,
        last_view_at = $33,
        last_updated_at = NOW()
      WHERE post_id = $34
    `, [
      safeStats.total_views, safeStats.unique_visitors, safeStats.avg_time, safeStats.median_time,
      safeStats.total_time, safeStats.avg_scroll, safeStats.scroll_25, safeStats.scroll_50,
      safeStats.scroll_75, safeStats.scroll_100, safeStats.cta_clicks, safeStats.shares,
      safeStats.twitter_shares, safeStats.facebook_shares, safeStats.linkedin_shares,
      safeStats.copy_links, safeStats.newsletter_signups, safeStats.comments, safeStats.likes,
      safeStats.bookmarks, safeStats.forms, safeStats.src_direct, safeStats.src_google,
      safeStats.src_instagram, safeStats.src_facebook, safeStats.src_youtube, safeStats.src_other,
      safeStats.total_clicks, safeStats.outbound_clicks, safeStats.internal_clicks,
      engagementRate, safeStats.first_view, safeStats.last_view, postId
    ]);

    // Recalculate engagement score
    const { rows } = await client.query(
      'SELECT * FROM blog_post_analytics WHERE post_id = $1',
      [postId]
    );
    
    if (rows.length > 0) {
      const score = calculateEngagementScore(rows[0]);
      await client.query(
        'UPDATE blog_post_analytics SET engagement_score = $1 WHERE post_id = $2',
        [score, postId]
      );
    }
  } catch (err) {
    logger.error('Error updating post analytics:', err);
  }
}

// POST /api/track/blog/:postId/engagement
router.post('/:postId/engagement', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { postId } = req.params;
    const { event_type, event_data = {} } = req.body;
    const { sessionId, visitorId, userId } = getTrackingIds(req);

    if (!event_type) {
      return errorResponse(res, 'Event type is required', 400);
    }

    if (!sessionId || !visitorId) {
      return errorResponse(res, 'Tracking cookies not found', 400);
    }

    await client.query('BEGIN');

    // Verify post exists
    const postCheck = await client.query(
      'SELECT id FROM blog_posts WHERE id = $1',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, 'Blog post not found', 404);
    }

    const trafficSource = getTrafficSource(req);
    const referrer = req.get('referer') || null;

    // Handle 'view' event - create or update blog_post_sessions
    if (event_type === 'view') {
      const isLandingPage = !referrer || !referrer.includes(req.get('host'));
      
      await client.query(`
        INSERT INTO blog_post_sessions (
          post_id, session_id, visitor_id, user_id, traffic_source, 
          referrer, is_landing_page
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (session_id, post_id) 
        DO UPDATE SET
          entered_at = blog_post_sessions.entered_at,
          user_id = COALESCE(blog_post_sessions.user_id, EXCLUDED.user_id)
      `, [postId, sessionId, visitorId, userId, trafficSource, referrer, isLandingPage]);
    }

    // Consolidated update using CASE expressions to avoid multiple queries per event
    const depth = Number(event_data.depth || 0);
    const seconds = Number(event_data.seconds || 0);
    const exitTime = Number(event_data.time_on_page || 0);

    await client.query(`
      UPDATE blog_post_sessions
      SET
        -- Scroll depth and engagement from scroll
        max_scroll_depth = CASE WHEN $1 = 'scroll_milestone' THEN GREATEST(max_scroll_depth, $2) ELSE max_scroll_depth END,
        read_to_end      = read_to_end OR ($1 = 'scroll_milestone' AND $2 >= 100),
        -- Time and engagement from time milestones
        time_on_page     = CASE WHEN $1 = 'time_milestone' THEN GREATEST(time_on_page, $3)
                                WHEN $1 = 'exit' THEN GREATEST(time_on_page, $4)
                                ELSE time_on_page END,
        -- Click/Share/Form engagement flags
        clicked_cta      = clicked_cta OR ($1 = 'cta_click'),
        shared_content   = shared_content OR ($1 = 'share'),
        submitted_form   = submitted_form OR ($1 IN ('form_submit','newsletter_signup')),
        -- Exit flags
        exited_at        = CASE WHEN $1 = 'exit' THEN NOW() ELSE exited_at END,
        is_exit_page     = is_exit_page OR ($1 = 'exit'),
        -- Overall engagement
        was_engaged      = was_engaged
                            OR ($1 = 'scroll_milestone' AND $2 >= 25)
                            OR ($1 = 'time_milestone' AND $3 >= 30)
                            OR ($1 IN ('cta_click','share','form_submit','newsletter_signup'))
      WHERE session_id = $5 AND post_id = $6
    `, [event_type, depth, seconds, exitTime, sessionId, postId]);
    

    // Record the raw event
    await client.query(`
      INSERT INTO blog_engagement_events (
        post_id, session_id, visitor_id, user_id, event_type, event_data
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [postId, sessionId, visitorId, userId, event_type, event_data]);

    await client.query('COMMIT');
    
    // Queue analytics update (non-blocking, processed in batches)
    analyticsQueue.queueUpdate(postId);
    
    return success(res, { tracked: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error tracking blog engagement:', err);
    return errorResponse(res, 'Failed to track engagement', 500);
  } finally {
    client.release();
  }
});

export default router;
