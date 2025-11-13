import express from 'express';
import pool from '../../utils/db.js';
import logger from '../../utils/logger.js';
import { success, error as errorResponse } from '../../utils/response.js';

const router = express.Router();

// GET /api/admin/blog-analytics/
// Dashboard overview for all blog posts
router.get('/', async (req, res) => {
  try {
    // Aggregate metrics across all posts
    const overviewResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT post_id) as total_posts,
        SUM(total_views) as total_views,
        AVG(engagement_rate) as avg_engagement_rate,
        SUM(total_shares) as total_shares,
        SUM(newsletter_signups) as total_signups,
        AVG(avg_time_on_page) as avg_time_on_page
      FROM blog_post_analytics
    `);
    
    // Recent activity (last 7 days)
    const recentActivity = await pool.query(`
      SELECT 
        SUM(views) as views_7d,
        AVG(engagement_rate) as engagement_7d
      FROM blog_post_daily_stats
      WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    // Top 5 posts this week
    const topPostsWeek = await pool.query(`
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        SUM(bpds.views) as views
      FROM blog_post_daily_stats bpds
      JOIN blog_posts bp ON bpds.post_id = bp.id
      WHERE bpds.stat_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY bp.id, bp.title, bp.slug
      ORDER BY views DESC
      LIMIT 5
    `);
    
    return success(res, {
      overview: overviewResult.rows[0],
      recent_activity: recentActivity.rows[0],
      top_posts_week: topPostsWeek.rows
    });
  } catch (err) {
    logger.error('Error fetching analytics overview:', err);
    return errorResponse(res, 'Failed to fetch analytics overview', 500);
  }
});

// GET /api/admin/blog-analytics/comparison
// Compare all blog posts performance
router.get('/comparison', async (req, res) => {
  try {
    const { sort_by = 'engagement_score', order = 'DESC', limit = 20, page = 1 } = req.query;
    
    const validSortFields = [
      'engagement_score', 'total_views', 'engagement_rate', 
      'avg_time_on_page', 'total_shares', 'avg_scroll_depth', 'title'
    ];
    
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'engagement_score';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const pageLimit = parseInt(limit, 10) || 20;
    const currentPage = parseInt(page, 10) || 1;
    const offset = (currentPage - 1) * pageLimit;
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM blog_posts bp
    `);
    const totalCount = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalCount / pageLimit);
    
    // Get paginated results
    // For title sorting, use bp.title, otherwise use bpa columns
    const orderByClause = sort_by === 'title' 
      ? `bp.${sortField} ${sortOrder}`
      : `bpa.${sortField} ${sortOrder} NULLS LAST`;
    
    const result = await pool.query(`
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.status,
        bp.created_at,
        bp.published_at,
        bpa.post_id,
        bpa.total_views,
        bpa.unique_visitors,
        bpa.avg_time_on_page,
        bpa.avg_scroll_depth,
        bpa.total_shares,
        bpa.engagement_score,
        bpa.engagement_rate,
        bpa.cta_clicks,
        bpa.scroll_25_percent,
        bpa.scroll_50_percent,
        bpa.scroll_75_percent,
        bpa.scroll_100_percent
      FROM blog_posts bp
      LEFT JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      ORDER BY ${orderByClause}
      LIMIT $1 OFFSET $2
    `, [pageLimit, offset]);
    
    return success(res, { 
      posts: result.rows,
      pagination: {
        current_page: currentPage,
        total_pages: totalPages,
        total: totalCount,
        limit: pageLimit,
        from: offset + 1,
        to: Math.min(offset + pageLimit, totalCount)
      }
    });
  } catch (err) {
    logger.error('Error fetching blog comparison:', err);
    return errorResponse(res, 'Failed to fetch blog comparison', 500);
  }
});

// GET /api/admin/blog-analytics/leaderboard
// Top performing posts by various metrics
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboardLimit = 10;
    
    // Most viewed
    const mostViewed = await pool.query(`
      SELECT bp.id, bp.title, bp.slug, bpa.total_views, bpa.unique_visitors
      FROM blog_posts bp
      JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bpa.total_views > 0
      ORDER BY bpa.total_views DESC
      LIMIT $1
    `, [leaderboardLimit]);
    
    // Highest engagement rate
    const highestEngagement = await pool.query(`
      SELECT bp.id, bp.title, bp.slug, bpa.engagement_rate, bpa.total_views
      FROM blog_posts bp
      JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bpa.total_views >= 10
      ORDER BY bpa.engagement_rate DESC
      LIMIT $1
    `, [leaderboardLimit]);
    
    // Most shared
    const mostShared = await pool.query(`
      SELECT bp.id, bp.title, bp.slug, bpa.total_shares, bpa.total_views
      FROM blog_posts bp
      JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bpa.total_shares > 0
      ORDER BY bpa.total_shares DESC
      LIMIT $1
    `, [leaderboardLimit]);
    
    // Longest read time
    const longestReadTime = await pool.query(`
      SELECT bp.id, bp.title, bp.slug, bpa.avg_time_on_page, bpa.total_views
      FROM blog_posts bp
      JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bpa.total_views >= 10
      ORDER BY bpa.avg_time_on_page DESC
      LIMIT $1
    `, [leaderboardLimit]);
    
    // Best conversion (newsletter signups)
    const bestConversion = await pool.query(`
      SELECT bp.id, bp.title, bp.slug, bpa.newsletter_signups, bpa.total_views,
        CASE WHEN bpa.total_views > 0 
          THEN ROUND((bpa.newsletter_signups::DECIMAL / bpa.total_views * 100), 2)
          ELSE 0
        END as conversion_rate
      FROM blog_posts bp
      JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bpa.newsletter_signups > 0
      ORDER BY conversion_rate DESC
      LIMIT $1
    `, [leaderboardLimit]);
    
    return success(res, {
      most_viewed: mostViewed.rows,
      highest_engagement: highestEngagement.rows,
      most_shared: mostShared.rows,
      longest_read_time: longestReadTime.rows,
      best_conversion: bestConversion.rows
    });
  } catch (err) {
    logger.error('Error fetching leaderboard:', err);
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
});

// GET /api/admin/blog-analytics/:postId
// Get complete analytics for a specific blog post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Get post with analytics
    const postResult = await pool.query(`
      SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.content,
        bp.excerpt,
        bp.image,
        bp.status,
        bp.author_id,
        bp.created_at,
        bp.published_at,
        bp.updated_at,
        bpa.post_id,
        bpa.total_views,
        bpa.unique_visitors,
        bpa.returning_visitors,
        bpa.avg_time_on_page,
        bpa.median_time_on_page,
        bpa.total_time_spent,
        bpa.avg_scroll_depth,
        bpa.scroll_25_percent,
        bpa.scroll_50_percent,
        bpa.scroll_75_percent,
        bpa.scroll_100_percent,
        bpa.total_clicks,
        bpa.cta_clicks,
        bpa.outbound_clicks,
        bpa.internal_links_clicked,
        bpa.total_shares,
        bpa.twitter_shares,
        bpa.facebook_shares,
        bpa.linkedin_shares,
        bpa.copy_link_count,
        bpa.comments_count,
        bpa.likes_count,
        bpa.bookmarks_count,
        bpa.bounce_rate,
        bpa.exit_rate,
        bpa.source_direct,
        bpa.source_google,
        bpa.source_instagram,
        bpa.source_facebook,
        bpa.source_youtube,
        bpa.source_twitter,
        bpa.source_other,
        bpa.newsletter_signups,
        bpa.form_submissions,
        bpa.engagement_score,
        bpa.engagement_rate,
        bpa.first_view_at,
        bpa.last_view_at,
        bpa.last_updated_at
      FROM blog_posts bp
      LEFT JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      WHERE bp.id = $1
    `, [postId]);
    
    if (postResult.rows.length === 0) {
      return errorResponse(res, 'Blog post not found', 404);
    }
    
    const post = postResult.rows[0];
    
    // Calculate trends (compare with previous 30 days)
    const trendsResult = await pool.query(`
      WITH current_period AS (
        SELECT 
          SUM(views) as current_views,
          AVG(engagement_rate) as current_engagement
        FROM blog_post_daily_stats
        WHERE post_id = $1 
          AND stat_date >= CURRENT_DATE - INTERVAL '30 days'
      ),
      previous_period AS (
        SELECT 
          SUM(views) as previous_views,
          AVG(engagement_rate) as previous_engagement
        FROM blog_post_daily_stats
        WHERE post_id = $1 
          AND stat_date >= CURRENT_DATE - INTERVAL '60 days'
          AND stat_date < CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        CASE 
          WHEN p.previous_views > 0 
          THEN ROUND(((c.current_views - p.previous_views)::DECIMAL / p.previous_views * 100), 1)
          ELSE 0 
        END as views_trend,
        CASE 
          WHEN p.previous_engagement > 0 
          THEN ROUND(((c.current_engagement - p.previous_engagement)::DECIMAL / p.previous_engagement * 100), 1)
          ELSE 0 
        END as engagement_trend
      FROM current_period c, previous_period p
    `, [postId]);
    
    const trends = trendsResult.rows[0] || { views_trend: 0, engagement_trend: 0 };
    
    return success(res, {
      post,
      trends: {
        views_trend: trends.views_trend > 0 ? `+${trends.views_trend}%` : `${trends.views_trend}%`,
        engagement_trend: trends.engagement_trend > 0 ? `+${trends.engagement_trend}%` : `${trends.engagement_trend}%`
      }
    });
  } catch (err) {
    logger.error('Error fetching post analytics:', err);
    return errorResponse(res, 'Failed to fetch post analytics', 500);
  }
});

// GET /api/admin/blog-analytics/:postId/timeline
// Daily performance data for charts
router.get('/:postId/timeline', async (req, res) => {
  try {
    const { postId } = req.params;
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        stat_date,
        views,
        unique_visitors,
        avg_time_on_page,
        avg_scroll_depth,
        engagement_rate,
        total_shares,
        newsletter_signups
      FROM blog_post_daily_stats
      WHERE post_id = $1 
        AND stat_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY stat_date ASC
    `, [postId]);
    
    return success(res, { timeline: result.rows });
  } catch (err) {
    logger.error('Error fetching timeline:', err);
    return errorResponse(res, 'Failed to fetch timeline', 500);
  }
});

// GET /api/admin/blog-analytics/:postId/audience
// Who's reading this post
router.get('/:postId/audience', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Visitor types
    const visitorTypes = await pool.query(`
      SELECT 
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_landing_page = TRUE) as new_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE is_landing_page = FALSE) as returning_visitors,
        COUNT(DISTINCT visitor_id) as total_visitors
      FROM blog_post_sessions
      WHERE post_id = $1
    `, [postId]);
    
    // Traffic sources
    const trafficSources = await pool.query(`
      SELECT 
        traffic_source,
        COUNT(*) as count
      FROM blog_post_sessions
      WHERE post_id = $1
      GROUP BY traffic_source
      ORDER BY count DESC
    `, [postId]);
    
    // User segments
    const userSegments = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered,
        COUNT(DISTINCT user_id) as unique_users
      FROM blog_post_sessions
      WHERE post_id = $1
    `, [postId]);
    
    return success(res, {
      visitor_types: visitorTypes.rows[0],
      traffic_sources: trafficSources.rows,
      user_segments: userSegments.rows[0]
    });
  } catch (err) {
    logger.error('Error fetching audience data:', err);
    return errorResponse(res, 'Failed to fetch audience data', 500);
  }
});

// GET /api/admin/blog-analytics/:postId/heatmap
// Engagement heatmap data
router.get('/:postId/heatmap', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Scroll depth distribution
    const scrollDistribution = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE max_scroll_depth < 25) as "0-25%",
        COUNT(*) FILTER (WHERE max_scroll_depth >= 25 AND max_scroll_depth < 50) as "25-50%",
        COUNT(*) FILTER (WHERE max_scroll_depth >= 50 AND max_scroll_depth < 75) as "50-75%",
        COUNT(*) FILTER (WHERE max_scroll_depth >= 75 AND max_scroll_depth < 100) as "75-100%",
        COUNT(*) FILTER (WHERE max_scroll_depth >= 100) as "100%"
      FROM blog_post_sessions
      WHERE post_id = $1
    `, [postId]);
    
    // Time spent distribution
    const timeDistribution = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE time_on_page < 30) as "0-30s",
        COUNT(*) FILTER (WHERE time_on_page >= 30 AND time_on_page < 60) as "30s-1m",
        COUNT(*) FILTER (WHERE time_on_page >= 60 AND time_on_page < 120) as "1-2m",
        COUNT(*) FILTER (WHERE time_on_page >= 120 AND time_on_page < 300) as "2-5m",
        COUNT(*) FILTER (WHERE time_on_page >= 300) as "5m+"
      FROM blog_post_sessions
      WHERE post_id = $1
    `, [postId]);
    
    // Click events by type
    const clickEvents = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM blog_engagement_events
      WHERE post_id = $1 
        AND event_type IN ('click', 'cta_click', 'share', 'outbound_click', 'internal_click')
      GROUP BY event_type
      ORDER BY count DESC
    `, [postId]);
    
    return success(res, {
      scroll_distribution: scrollDistribution.rows[0],
      time_distribution: timeDistribution.rows[0],
      click_events: clickEvents.rows
    });
  } catch (err) {
    logger.error('Error fetching heatmap data:', err);
    return errorResponse(res, 'Failed to fetch heatmap data', 500);
  }
});

export default router;
