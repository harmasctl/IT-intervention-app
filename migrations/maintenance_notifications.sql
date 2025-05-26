-- Add next_maintenance_reminder_sent column to devices table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'next_maintenance_reminder_sent') THEN
      ALTER TABLE devices ADD COLUMN next_maintenance_reminder_sent TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;

-- Create indexes for better performance on maintenance-related queries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_last_maintenance') THEN
    CREATE INDEX idx_devices_last_maintenance ON devices (last_maintenance);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_next_maintenance_reminder_sent') THEN
    CREATE INDEX idx_devices_next_maintenance_reminder_sent ON devices (next_maintenance_reminder_sent);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_category_id') THEN
    CREATE INDEX idx_devices_category_id ON devices (category_id);
  END IF;
END $$; 