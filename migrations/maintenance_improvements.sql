-- Add status field to maintenance_records table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'status') THEN
      ALTER TABLE maintenance_records ADD COLUMN status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
    END IF;
  END IF;
END $$;

-- Add parts_replaced field to maintenance_records table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'parts_replaced') THEN
      ALTER TABLE maintenance_records ADD COLUMN parts_replaced JSONB DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;

-- Add cost field to maintenance_records table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'cost') THEN
      ALTER TABLE maintenance_records ADD COLUMN cost DECIMAL(10, 2);
    END IF;
  END IF;
END $$;

-- Add maintenance_duration_minutes field to maintenance_records table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'maintenance_duration_minutes') THEN
      ALTER TABLE maintenance_records ADD COLUMN maintenance_duration_minutes INTEGER;
    END IF;
  END IF;
END $$;

-- Add next_maintenance_date field to devices table if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'next_maintenance_date') THEN
      ALTER TABLE devices ADD COLUMN next_maintenance_date TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END $$;

-- Add index on next_maintenance_date if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_next_maintenance_date') THEN
    CREATE INDEX idx_devices_next_maintenance_date ON devices (next_maintenance_date);
  END IF;
END $$;

-- Create function to automatically update next_maintenance_date when last_maintenance is updated
CREATE OR REPLACE FUNCTION update_next_maintenance_date()
RETURNS TRIGGER AS $$
DECLARE
  maintenance_interval INTEGER;
BEGIN
  -- Get the maintenance_interval from the device's category
  SELECT dc.maintenance_interval INTO maintenance_interval
  FROM device_categories dc
  JOIN devices d ON d.category_id = dc.id
  WHERE d.id = NEW.id;
  
  -- If we have a last_maintenance date and a maintenance_interval, calculate the next_maintenance_date
  IF NEW.last_maintenance IS NOT NULL AND maintenance_interval IS NOT NULL THEN
    NEW.next_maintenance_date := NEW.last_maintenance + (maintenance_interval || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_next_maintenance_date'
  ) THEN
    CREATE TRIGGER trigger_update_next_maintenance_date
    BEFORE INSERT OR UPDATE OF last_maintenance ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_next_maintenance_date();
  END IF;
END $$; 