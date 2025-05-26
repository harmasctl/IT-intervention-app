-- Create indexes for improved query performance on maintenance_records table

-- Index on status field for faster filtering by status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_records_status') THEN
    CREATE INDEX idx_maintenance_records_status ON maintenance_records (status);
  END IF;
END $$;

-- Composite index on device_id and status for common queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_records_device_status') THEN
    CREATE INDEX idx_maintenance_records_device_status ON maintenance_records (device_id, status);
  END IF;
END $$;

-- Index on cost for financial reporting queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_records_cost') THEN
    CREATE INDEX idx_maintenance_records_cost ON maintenance_records (cost);
  END IF;
END $$;

-- Composite index for date range queries with device
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_maintenance_records_device_date') THEN
    CREATE INDEX idx_maintenance_records_device_date ON maintenance_records (device_id, date);
  END IF;
END $$;

-- Create a function to auto-update a device's next maintenance date when a new record is added
CREATE OR REPLACE FUNCTION update_device_next_maintenance()
RETURNS TRIGGER AS $$
DECLARE
  maintenance_interval INTEGER;
BEGIN
  -- Only process when a record is marked as resolved/completed
  IF (NEW.resolved = TRUE OR NEW.status = 'completed') THEN
    -- Get the maintenance_interval from the device's category
    SELECT dc.maintenance_interval INTO maintenance_interval
    FROM devices d
    JOIN device_categories dc ON d.category_id = dc.id
    WHERE d.id = NEW.device_id;
    
    -- Update the device's last_maintenance and calculate next_maintenance_date
    IF maintenance_interval IS NOT NULL THEN
      UPDATE devices
      SET 
        last_maintenance = NEW.date,
        next_maintenance_date = NEW.date + (maintenance_interval || ' days')::INTERVAL
      WHERE id = NEW.device_id;
    ELSE
      -- If no interval is set, just update the last_maintenance date
      UPDATE devices
      SET last_maintenance = NEW.date
      WHERE id = NEW.device_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_device_maintenance'
  ) THEN
    CREATE TRIGGER trigger_update_device_maintenance
    AFTER INSERT OR UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_device_next_maintenance();
  END IF;
END $$;

-- Create a view for maintenance analytics
DO $$
BEGIN
  -- Drop the view if it exists
  DROP VIEW IF EXISTS maintenance_analytics;
  
  -- Create the view
  CREATE VIEW maintenance_analytics AS
  SELECT 
    d.id AS device_id,
    d.name AS device_name,
    d.serial_number,
    d.type,
    d.category_id,
    dc.name AS category_name,
    d.last_maintenance,
    d.next_maintenance_date,
    COUNT(mr.id) AS maintenance_count,
    SUM(mr.cost) AS total_maintenance_cost,
    AVG(mr.maintenance_duration_minutes) AS avg_maintenance_duration,
    COUNT(CASE WHEN mr.status = 'completed' OR mr.resolved = TRUE THEN 1 END) AS completed_maintenance_count,
    COUNT(CASE WHEN mr.status = 'pending' THEN 1 END) AS pending_maintenance_count,
    r.name AS restaurant_name,
    r.location AS restaurant_location
  FROM 
    devices d
  LEFT JOIN
    maintenance_records mr ON d.id = mr.device_id
  LEFT JOIN
    device_categories dc ON d.category_id = dc.id
  LEFT JOIN
    restaurants r ON d.restaurant_id = r.id
  GROUP BY
    d.id, dc.name, r.name, r.location;
END $$; 