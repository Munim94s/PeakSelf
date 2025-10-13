-- Migration: Remove current_source logic
-- This removes all traces of current_source and current_referrer from the database
-- Renames first_source to just source, first_referrer to referrer, first_landing_path to landing_path

-- Step 1: Rename columns in visitors table
ALTER TABLE visitors 
  RENAME COLUMN first_source TO source;

ALTER TABLE visitors 
  RENAME COLUMN first_referrer TO referrer;

ALTER TABLE visitors 
  RENAME COLUMN first_landing_path TO landing_path;

-- Step 2: Drop current_source and current_referrer columns if they exist
ALTER TABLE visitors 
  DROP COLUMN IF EXISTS current_source;

ALTER TABLE visitors 
  DROP COLUMN IF EXISTS current_referrer;

-- Step 3: Add traffic_facebook column to dashboard snapshot if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_overview_latest') THEN
    -- Add traffic_facebook column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dashboard_overview_latest' 
                   AND column_name = 'traffic_facebook') THEN
      ALTER TABLE dashboard_overview_latest 
        ADD COLUMN traffic_facebook BIGINT DEFAULT 0;
    END IF;
  END IF;
END $$;

-- Verification queries (run these manually to check the migration)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'visitors';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'dashboard_overview_latest';
