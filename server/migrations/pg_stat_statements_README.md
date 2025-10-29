# pg_stat_statements Implementation

## Overview
The `pg_stat_statements` extension has been enabled to track query performance metrics and identify optimization opportunities.

## What It Does
- Tracks execution statistics for all SQL queries
- Records execution count, timing (total/min/max/mean), and resource usage
- Identifies slow queries and performance bottlenecks
- Provides cache hit ratios and disk read statistics

## Migration
The extension was enabled via migration:
```bash
node server/migrations/run.js enable_pg_stat_statements up
```

## API Endpoints
All endpoints require admin authentication.

### GET `/api/admin/performance/summary`
Returns overall database performance metrics:
- Total queries and executions
- Average and slowest query times
- Overall cache hit ratio
- Database size
- Active/idle connections

**Response:**
```json
{
  "query_stats": {
    "total_queries": 42,
    "total_executions": 1523,
    "total_time_ms": 12345.67,
    "avg_query_time_ms": 8.11,
    "slowest_query_ms": 234.56,
    "cache_hits": 98765,
    "disk_reads": 1234,
    "overall_cache_hit_ratio": 98.77
  },
  "database_size": "128 MB",
  "connections": {
    "active_connections": 5,
    "active_queries": 2,
    "idle_connections": 3
  }
}
```

### GET `/api/admin/performance/queries`
Returns detailed statistics for slow/frequent queries.

**Query Parameters:**
- `limit` (default: 20) - Number of queries to return
- `order_by` (default: total_exec_time) - Sort column: total_exec_time, mean_exec_time, calls, max_exec_time
- `min_calls` (default: 10) - Minimum execution count to include

**Response:**
```json
{
  "queries": [
    {
      "query": "SELECT * FROM users WHERE email = $1",
      "calls": 150,
      "total_exec_time_ms": 523.45,
      "mean_exec_time_ms": 3.49,
      "min_exec_time_ms": 0.52,
      "max_exec_time_ms": 45.23,
      "stddev_exec_time_ms": 5.67,
      "rows_returned": 150,
      "shared_blks_hit": 450,
      "shared_blks_read": 10,
      "cache_hit_ratio": 97.83
    }
  ],
  "summary": {
    "total_tracked_queries": 20,
    "order_by": "total_exec_time",
    "min_calls": 10
  }
}
```

### POST `/api/admin/performance/reset`
Resets all query statistics. Use with caution.

**Response:**
```json
{
  "message": "Query statistics reset successfully"
}
```

## Frontend Dashboard
Navigate to **Admin → Performance** to view:
- Performance summary cards (total queries, avg time, cache ratio, connections)
- Slow queries table with sortable columns
- Color-coded metrics (red/orange/yellow/green)
- Reset statistics button

## Interpreting Metrics

### Cache Hit Ratio
- **95%+** (Green): Excellent - most queries use cached data
- **80-95%** (Yellow): Good - acceptable performance
- **60-80%** (Orange): Poor - consider increasing shared_buffers
- **<60%** (Red): Critical - queries are hitting disk too often

### Query Times
- **<100ms** (Green): Fast
- **100-500ms** (Yellow): Moderate
- **500-1000ms** (Orange): Slow
- **>1000ms** (Red): Very slow - optimization needed

## Optimization Tips

### For Low Cache Hit Ratio
1. Increase PostgreSQL `shared_buffers` setting
2. Add indexes to frequently queried columns
3. Review query patterns for unnecessary full table scans

### For Slow Queries
1. Add missing indexes
2. Optimize WHERE clauses and JOINs
3. Use EXPLAIN ANALYZE to understand query plans
4. Consider query result caching in application layer

### For High Execution Counts
1. Implement application-level caching (already done with node-cache)
2. Use materialized views for complex aggregations
3. Batch similar queries

## Monitoring Best Practices
1. Check performance dashboard regularly (weekly)
2. Reset statistics after major deployments to get fresh baseline
3. Set up alerts for queries exceeding thresholds
4. Document optimization efforts and their impact

## Troubleshooting

### Extension Not Enabled Error
If you see "pg_stat_statements extension is not enabled":
1. Run migration: `node server/migrations/run.js enable_pg_stat_statements up`
2. If that fails, PostgreSQL may need configuration:
   - Edit `postgresql.conf`: `shared_preload_libraries = 'pg_stat_statements'`
   - Restart PostgreSQL
   - Run migration again

### No Query Data
If queries array is empty:
- Statistics accumulate over time as queries execute
- Use the application to generate query traffic
- Check back in a few minutes

## Related Files
- Migration: `server/migrations/enable_pg_stat_statements.js`
- Backend routes: `server/routes/admin/performance.js`
- Frontend component: `client/src/components/AdminPerformance.jsx`
