-- Migration: Update goals table structure
-- Remove old columns and add priority field

-- Step 1: Add priority column if it doesn't exist
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

-- Step 2: Drop old columns if they exist
ALTER TABLE goals 
DROP COLUMN IF EXISTS target_value;

ALTER TABLE goals 
DROP COLUMN IF EXISTS current_value;

ALTER TABLE goals 
DROP COLUMN IF EXISTS unit;

-- Step 3: Ensure proper constraints
ALTER TABLE goals
ALTER COLUMN priority SET DEFAULT 'medium';

-- Verify the table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'goals' ORDER BY ordinal_position;
