import express from 'express';
import pool from '../../utils/db.js';
import logger from '../../utils/logger.js';
import { success, error as errorResponse } from '../../utils/response.js';
import cache from '../../utils/cache.js';

const router = express.Router();

// GET /api/admin/blog-analytics/
// Dashboard overview for all blog posts
router.get('/', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'blog_analytics:overview';
    if (!req.query.nocache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

    // Aggregate metrics across all posts
    const overviewResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT post_id) as total_posts,
        SUM(total_views) as total_views,
        AVG(engagement_rate) as avg_engagement_rate,
        SUM(total_shares) as total_shares,
        SUM(likes_count) as total_likes,
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
    
    const result = {
      overview: overviewResult.rows[0],
      recent_activity: recentActivity.rows[0],
      top_posts_week: topPostsWeek.rows
    };

    // Cache for 60 seconds
    cache.set(cacheKey, result, 60);

    return success(res, result);
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
      'avg_time_on_page', 'total_shares', 'likes_count', 'avg_scroll_depth', 'title'
    ];
    
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'engagement_score';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const rawLimit = parseInt(limit, 10);
    const pageLimit = Math.max(1, Math.min(100, Number.isNaN(rawLimit) ? 20 : rawLimit));
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
        bpa.likes_count,
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

    const { rows } = await pool.query(`
      WITH base AS (
        SELECT bp.id, bp.title, bp.slug,
               bpa.total_views, bpa.unique_visitors,
               bpa.engagement_rate, bpa.total_shares,
               bpa.avg_time_on_page, bpa.newsletter_signups
        FROM blog_posts bp
        JOIN blog_post_analytics bpa ON bp.id = bpa.post_id
      )
      (
        SELECT 'most_viewed' AS category,
               id, title, slug, total_views, unique_visitors,
               NULL::numeric AS engagement_rate,
               NULL::int AS total_shares,
               NULL::int AS avg_time_on_page,
               NULL::numeric AS conversion_rate
        FROM base
        WHERE total_views > 0
        ORDER BY total_views DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 'highest_engagement' AS category,
               id, title, slug, total_views, unique_visitors,
               engagement_rate,
               NULL::int,
               NULL::int,
               NULL::numeric
        FROM base
        WHERE total_views >= 10
        ORDER BY engagement_rate DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 'most_shared' AS category,
               id, title, slug, total_views, unique_visitors,
               NULL::numeric,
               total_shares,
               NULL::int,
               NULL::numeric
        FROM base
        WHERE total_shares > 0
        ORDER BY total_shares DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 'longest_read_time' AS category,
               id, title, slug, total_views, unique_visitors,
               NULL::numeric,
               NULL::int,
               avg_time_on_page,
               NULL::numeric
        FROM base
        WHERE total_views >= 10
        ORDER BY avg_time_on_page DESC
        LIMIT $1
      )
      UNION ALL
      (
        SELECT 'best_conversion' AS category,
               id, title, slug, total_views, unique_visitors,
               NULL::numeric,
               NULL::int,
               NULL::int,
               CASE WHEN total_views > 0 
                 THEN ROUND((newsletter_signups::DECIMAL / total_views * 100), 2)
                 ELSE 0
               END as conversion_rate
        FROM base
        WHERE newsletter_signups > 0
        ORDER BY conversion_rate DESC
        LIMIT $1
      )
    `, [leaderboardLimit]);

    // Split rows into categories
    const most_viewed = [];
    const highest_engagement = [];
    const most_shared = [];
    const longest_read_time = [];
    const best_conversion = [];

    for (const r of rows) {
      switch (r.category) {
        case 'most_viewed':
          most_viewed.push({ id: r.id, title: r.title, slug: r.slug, total_views: r.total_views, unique_visitors: r.unique_visitors });
          break;
        case 'highest_engagement':
          highest_engagement.push({ id: r.id, title: r.title, slug: r.slug, engagement_rate: r.engagement_rate, total_views: r.total_views });
          break;
        case 'most_shared':
          most_shared.push({ id: r.id, title: r.title, slug: r.slug, total_shares: r.total_shares, total_views: r.total_views });
          break;
        case 'longest_read_time':
          longest_read_time.push({ id: r.id, title: r.title, slug: r.slug, avg_time_on_page: r.avg_time_on_page, total_views: r.total_views });
          break;
        case 'best_conversion':
          best_conversion.push({ id: r.id, title: r.title, slug: r.slug, newsletter_signups: r.newsletter_signups, total_views: r.total_views, conversion_rate: r.conversion_rate });
          break;
      }
    }

    return success(res, { most_viewed, highest_engagement, most_shared, longest_read_time, best_conversion });
  } catch (err) {
    logger.error('Error fetching leaderboard:', err);
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
});

// GET /api/admin/blog-analytics/top-posts-timeline
// Get timeline data for top performing posts
router.get('/top-posts-timeline', async (req, res) => {
  try {
    const { days = 30, limit = 5, metric = 'views' } = req.query;
    
    const daysInt = Math.max(1, Math.min(90, parseInt(days)));
    const limitInt = Math.max(1, Math.min(10, parseInt(limit)));
    const validMetric = ['views', 'engagement'].includes(metric) ? metric : 'views';
    
    // Get top posts based on selected metric
    const topPostsQuery = validMetric === 'views' 
      ? `
        SELECT post_id, SUM(views) as total
        FROM blog_post_daily_stats
        WHERE stat_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
        GROUP BY post_id
        ORDER BY total DESC
        LIMIT $2
      `
      : `
        SELECT post_id, AVG(engagement_rate) as total
        FROM blog_post_daily_stats
        WHERE stat_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
          AND engagement_rate IS NOT NULL
        GROUP BY post_id
        ORDER BY total DESC
        LIMIT $2
      `;
    
    const topPosts = await pool.query(topPostsQuery, [daysInt, limitInt]);
    const postIds = topPosts.rows.map(r => r.post_id);
    
    if (postIds.length === 0) {
      return success(res, { timeline: [], posts: [] });
    }
    
    // Get daily data for these posts
    const timelineResult = await pool.query(`
      SELECT 
        bpds.stat_date,
        bp.id,
        bp.title,
        bp.slug,
        bpds.views,
        bpds.engagement_rate
      FROM blog_post_daily_stats bpds
      JOIN blog_posts bp ON bpds.post_id = bp.id
      WHERE bpds.post_id = ANY($1::int[])
        AND bpds.stat_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
      ORDER BY bpds.stat_date ASC, bp.title
    `, [postIds, daysInt]);
    
    // Transform data for recharts
    const dataByDate = {};
    timelineResult.rows.forEach(row => {
      const date = row.stat_date;
      if (!dataByDate[date]) {
        dataByDate[date] = { date };
      }
      dataByDate[date][row.title] = validMetric === 'views' ? row.views : row.engagement_rate;
    });
    
    const timeline = Object.values(dataByDate);
    
    return success(res, { 
      timeline,
      posts: topPosts.rows.map((r, idx) => {
        const post = timelineResult.rows.find(tr => tr.id === r.post_id);
        return {
          id: r.post_id,
          title: post?.title || 'Unknown',
          slug: post?.slug || '',
          total: r.total
        };
      })
    });
  } catch (err) {
    logger.error('Error fetching top posts timeline:', err);
    return errorResponse(res, 'Failed to fetch top posts timeline', 500);
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
    
    const daysInt = Math.max(1, Math.min(90, parseInt(days))); // Cap at 90 days for performance
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
        AND stat_date >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
      ORDER BY stat_date ASC
    `, [postId, daysInt]);
    
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
    
    // Combined query for all audience metrics
    const result = await pool.query(`
      WITH visitor_metrics AS (
        SELECT 
          COUNT(DISTINCT visitor_id) FILTER (WHERE is_landing_page = TRUE) as new_visitors,
          COUNT(DISTINCT visitor_id) FILTER (WHERE is_landing_page = FALSE) as returning_visitors,
          COUNT(DISTINCT visitor_id) as total_visitors,
          COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous,
          COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered,
          COUNT(DISTINCT user_id) as unique_users
        FROM blog_post_sessions
        WHERE post_id = $1
      ),
      traffic_sources AS (
        SELECT 
          jsonb_agg(
            jsonb_build_object('traffic_source', traffic_source, 'count', count)
            ORDER BY count DESC
          ) as sources
        FROM (
          SELECT traffic_source, COUNT(*) as count
          FROM blog_post_sessions
          WHERE post_id = $1
          GROUP BY traffic_source
          ORDER BY count DESC
        ) t
      )
      SELECT 
        vm.new_visitors, vm.returning_visitors, vm.total_visitors,
        vm.anonymous, vm.registered, vm.unique_users,
        COALESCE(ts.sources, '[]'::jsonb) as traffic_sources
      FROM visitor_metrics vm, traffic_sources ts
    `, [postId]);
    
    const data = result.rows[0];
    
    return success(res, {
      visitor_types: {
        new_visitors: parseInt(data.new_visitors),
        returning_visitors: parseInt(data.returning_visitors),
        total_visitors: parseInt(data.total_visitors)
      },
      traffic_sources: data.traffic_sources,
      user_segments: {
        anonymous: parseInt(data.anonymous),
        registered: parseInt(data.registered),
        unique_users: parseInt(data.unique_users)
      }
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
    
    // Combined query for all heatmap metrics
    const result = await pool.query(`
      WITH session_metrics AS (
        SELECT 
          COUNT(*) FILTER (WHERE max_scroll_depth < 25) as scroll_0_25,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 25 AND max_scroll_depth < 50) as scroll_25_50,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 50 AND max_scroll_depth < 75) as scroll_50_75,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 75 AND max_scroll_depth < 100) as scroll_75_100,
          COUNT(*) FILTER (WHERE max_scroll_depth >= 100) as scroll_100,
          COUNT(*) FILTER (WHERE time_on_page < 30) as time_0_30,
          COUNT(*) FILTER (WHERE time_on_page >= 30 AND time_on_page < 60) as time_30_60,
          COUNT(*) FILTER (WHERE time_on_page >= 60 AND time_on_page < 120) as time_60_120,
          COUNT(*) FILTER (WHERE time_on_page >= 120 AND time_on_page < 300) as time_120_300,
          COUNT(*) FILTER (WHERE time_on_page >= 300) as time_300_plus
        FROM blog_post_sessions
        WHERE post_id = $1
      ),
      click_events AS (
        SELECT 
          jsonb_agg(
            jsonb_build_object('event_type', event_type, 'count', count)
            ORDER BY count DESC
          ) as events
        FROM (
          SELECT event_type, COUNT(*) as count
          FROM blog_engagement_events
          WHERE post_id = $1 
            AND event_type IN ('click', 'cta_click', 'share', 'outbound_click', 'internal_click')
          GROUP BY event_type
          ORDER BY count DESC
        ) e
      )
      SELECT 
        sm.scroll_0_25, sm.scroll_25_50, sm.scroll_50_75, sm.scroll_75_100, sm.scroll_100,
        sm.time_0_30, sm.time_30_60, sm.time_60_120, sm.time_120_300, sm.time_300_plus,
        COALESCE(ce.events, '[]'::jsonb) as click_events
      FROM session_metrics sm, click_events ce
    `, [postId]);
    
    const data = result.rows[0];
    
    return success(res, {
      scroll_distribution: {
        "0-25%": parseInt(data.scroll_0_25),
        "25-50%": parseInt(data.scroll_25_50),
        "50-75%": parseInt(data.scroll_50_75),
        "75-100%": parseInt(data.scroll_75_100),
        "100%": parseInt(data.scroll_100)
      },
      time_distribution: {
        "0-30s": parseInt(data.time_0_30),
        "30s-1m": parseInt(data.time_30_60),
        "1-2m": parseInt(data.time_60_120),
        "2-5m": parseInt(data.time_120_300),
        "5m+": parseInt(data.time_300_plus)
      },
      click_events: data.click_events
    });
  } catch (err) {
    logger.error('Error fetching heatmap data:', err);
    return errorResponse(res, 'Failed to fetch heatmap data', 500);
  }
});

export default router;
