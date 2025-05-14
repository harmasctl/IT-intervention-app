-- Simplify restaurants table to only include name
-- First, create a backup of the current table
CREATE TABLE IF NOT EXISTS restaurants_backup AS
SELECT * FROM restaurants;

-- Drop columns that are no longer needed
ALTER TABLE restaurants
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS contact_number,
DROP COLUMN IF EXISTS manager_name;

-- Make sure we have the required columns
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
