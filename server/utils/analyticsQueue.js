import pool from './db.js';
import logger from './logger.js';

/**
 * Analytics Queue Processor
 * 
 * Batches analytics updates to avoid expensive real-time aggregation on every tracking event.
 * Updates are queued and processed in batches every 30 seconds.
 */

class AnalyticsQueue {
  constructor() {
    this.queue = new Map(); // postId -> { needsUpdate: boolean, lastQueued: timestamp }
    this.processing = false;
    this.batchInterval = 30000; // 30 seconds
    this.maxBatchSize = 50; // Process max 50 posts per batch
    
    // Start the batch processor
    this.startProcessor();
  }

  /**
   * Queue a post for analytics update
   * @param {number} postId - Blog post ID
   */
  queueUpdate(postId) {
    if (!postId) return;
    
    this.queue.set(postId, {
      needsUpdate: true,
      lastQueued: Date.now()
    });
    
    logger.debug(`Analytics update queued for post ${postId}. Queue size: ${this.queue.size}`);
  }

  /**
   * Start the batch processor interval
   */
  startProcessor() {
    this.processorInterval = setInterval(async () => {
      await this.processBatch();
    }, this.batchInterval);

    // Log processor started
    logger.info(`Analytics queue processor started (batch interval: ${this.batchInterval}ms)`);

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Process queued analytics updates in batch
   */
  async processBatch() {
    if (this.processing || this.queue.size === 0) {
      return;
    }

    this.processing = true;
    const startTime = Date.now();
    
    try {
      // Get posts to update (limit batch size)
      const postsToUpdate = Array.from(this.queue.keys()).slice(0, this.maxBatchSize);
      
      // Clear from queue
      postsToUpdate.forEach(postId => this.queue.delete(postId));

      logger.info(`Processing analytics batch: ${postsToUpdate.length} posts`);

      // Process posts in parallel with concurrency control
      const concurrency = 5; // Process 5 at a time
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < postsToUpdate.length; i += concurrency) {
        const batch = postsToUpdate.slice(i, i + concurrency);
        const results = await Promise.allSettled(
          batch.map(postId => this.updatePostAnalytics(postId))
        );
        
        // Count successes and failures
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            logger.error(`Failed to update analytics for post ${batch[index]}:`, result.reason.message);
          }
        });
      }

      const duration = Date.now() - startTime;
      logger.info(`Analytics batch completed: ${successCount} successful, ${errorCount} failed (${duration}ms)`);

    } catch (error) {
      logger.error('Error processing analytics batch:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Update aggregated analytics for a post
   * @param {number} postId - Blog post ID
   */
  async updatePostAnalytics(postId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

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

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const stats = result.rows[0];
      const engagementRate = stats.total_views > 0 
        ? (stats.engaged_sessions / stats.total_views * 100).toFixed(2)
        : 0;

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore({
        total_views: stats.total_views || 0,
        avg_time_on_page: stats.avg_time || 0,
        scroll_100_percent: stats.scroll_100 || 0,
        total_shares: stats.shares || 0,
        newsletter_signups: stats.newsletter_signups || 0,
        cta_clicks: stats.cta_clicks || 0,
        avg_scroll_depth: stats.avg_scroll || 0
      });

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
          engagement_score = $32,
          first_view_at = $33,
          last_view_at = $34,
          last_updated_at = NOW()
        WHERE post_id = $35
      `, [
        stats.total_views || 0, stats.unique_visitors || 0, stats.avg_time || 0, stats.median_time || 0,
        stats.total_time || 0, stats.avg_scroll || 0, stats.scroll_25 || 0, stats.scroll_50 || 0,
        stats.scroll_75 || 0, stats.scroll_100 || 0, stats.cta_clicks || 0, stats.shares || 0,
        stats.twitter_shares || 0, stats.facebook_shares || 0, stats.linkedin_shares || 0,
        stats.copy_links || 0, stats.newsletter_signups || 0, stats.comments || 0, stats.likes || 0,
        stats.bookmarks || 0, stats.forms || 0, stats.src_direct || 0, stats.src_google || 0,
        stats.src_instagram || 0, stats.src_facebook || 0, stats.src_youtube || 0, stats.src_other || 0,
        stats.total_clicks || 0, stats.outbound_clicks || 0, stats.internal_clicks || 0,
        engagementRate, engagementScore, stats.first_view, stats.last_view, postId
      ]);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate engagement score based on analytics
   */
  calculateEngagementScore(analytics) {
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

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.size,
      processing: this.processing,
      batchInterval: this.batchInterval,
      maxBatchSize: this.maxBatchSize
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down analytics queue processor...');
    
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
    }

    // Process remaining items
    if (this.queue.size > 0) {
      logger.info(`Processing ${this.queue.size} remaining items...`);
      await this.processBatch();
    }

    logger.info('Analytics queue processor shut down successfully');
  }
}

// Create singleton instance
const analyticsQueue = new AnalyticsQueue();

export default analyticsQueue;
