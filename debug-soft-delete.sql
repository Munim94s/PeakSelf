-- Debug Soft Delete Issue
-- Run this to see what's happening

-- 1. Check the user exists and has deleted_at set
SELECT 
  id::text,
  email, 
  deleted_at,
  deleted_at IS NOT NULL AS "is_soft_deleted",
  EXTRACT(DAY FROM (NOW() - deleted_at)) AS days_ago
FROM users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at ASC
LIMIT 10;

-- 2. Check if the date is old enough (should be > 90)
SELECT 
  email,
  deleted_at,
  NOW() AS current_time,
  NOW() - INTERVAL '90 days' AS cutoff_date,
  deleted_at < NOW() - INTERVAL '90 days' AS "should_be_deleted"
FROM users 
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at ASC;

-- 3. Test the exact cleanup query
SELECT 
  id::text,
  email,
  deleted_at,
  'WOULD BE DELETED' AS status
FROM users
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';

-- 4. If you see the user in step 3, run this to actually delete:
-- DELETE FROM users
-- WHERE deleted_at IS NOT NULL 
--   AND deleted_at < NOW() - INTERVAL '90 days';
-- Uncomment the above to actually delete

-- 5. Alternative: Delete specific user by email
-- DELETE FROM users WHERE email = 'your-test-email@example.com';
