# Performance Dashboard - Pagination & Filtering Update

## Changes Made

### Backend API Updates (`server/routes/admin/performance.js`)

#### New Query Parameters
- **`page`** (default: 1) - Current page number
- **`filter`** (default: 'application') - Query type filter
  - `application` - Only application queries (excludes pg_*, information_schema, etc.)
  - `all` - All queries
  - `system` - System/catalog queries only
  - `extension` - Extension and schema-related queries

#### Filter Logic
**Application Filter** excludes:
- Queries with `pg_*` patterns (PostgreSQL internals)
- `information_schema` queries
- Common GUI tool patterns (`pg_timezone_names`, CTEs with `pg_` tables)
- PL/pgSQL blocks (`do $$`)

**System Filter** shows only:
- Queries containing `pg_*` or `information_schema`

**Extension Filter** shows:
- Extension, namespace, and schema introspection queries

#### Pagination Response
```json
{
  "queries": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_queries": 87,
    "per_page": 20,
    "has_next": true,
    "has_prev": false
  },
  "filters": {
    "order_by": "total_exec_time",
    "min_calls": 10,
    "filter": "application"
  }
}
```

### Frontend Updates (`client/src/components/AdminPerformance.jsx`)

#### New Features
1. **Filter Dropdown**
   - Application (default) - Shows only your app queries
   - All Queries - Shows everything
   - System/Catalog - PostgreSQL internal queries
   - Extensions - Schema/extension queries

2. **Pagination Controls**
   - Previous/Next buttons
   - Page number buttons (1, 2, 3, ...)
   - Ellipsis for large page counts (1 ... 5 6 7 ... 20)
   - "Page X of Y" indicator
   - Total query count display

3. **Smart Pagination Display**
   - Always shows: First page, last page, current page
   - Shows: Current page ± 1 neighbor
   - Example: `1 ... 5 6 [7] 8 9 ... 20` (current page = 7)

4. **State Management**
   - Filter changes reset to page 1
   - Page state persists when changing sort order
   - All filters cached separately

## Usage

### API Examples

**Get page 2 of application queries:**
```
GET /api/admin/performance/queries?page=2&filter=application
```

**Get system queries sorted by call count:**
```
GET /api/admin/performance/queries?filter=system&order_by=calls
```

**Get all queries with pagination:**
```
GET /api/admin/performance/queries?filter=all&page=3&limit=20
```

### Frontend Usage

1. Navigate to **Admin → Performance**
2. Default view: Application queries only (filters out database tools)
3. Use filter dropdown to switch between query types
4. Use pagination to browse through pages
5. Sort by Total Time, Avg Time, Max Time, or Execution Count

## Benefits

✅ **Application queries now default** - No more GUI tool noise  
✅ **Pagination** - Handle hundreds of queries efficiently  
✅ **Flexible filtering** - Switch between app/system/all as needed  
✅ **Better performance** - Only loads 20 queries at a time  
✅ **Clean UI** - Easy navigation through large result sets  

## Testing

Test the filters:
```bash
# Run some application queries
curl http://localhost:5000/api/admin/dashboard

# View performance dashboard
# Should see INSERT, SELECT, UPDATE from your app
# NOT see pg_timezone_names or GUI tool queries
```

## Notes

- Default filter is `application` to show relevant queries immediately
- Pagination only appears when there are multiple pages
- Cache keys include all filter parameters
- Filter logic can be adjusted in `server/routes/admin/performance.js` lines 52-72
