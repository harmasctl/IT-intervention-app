-- Fix issues with devices table

-- Check if devices table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
    CREATE TABLE devices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      serial_number VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      model VARCHAR(255),
      status VARCHAR(50) DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'offline')),
      restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
      category_id UUID REFERENCES device_categories(id) ON DELETE SET NULL,
      last_maintenance TIMESTAMP WITH TIME ZONE,
      next_maintenance_date TIMESTAMP WITH TIME ZONE,
      warranty_expiry TIMESTAMP WITH TIME ZONE,
      purchase_date TIMESTAMP WITH TIME ZONE,
      qr_code TEXT,
      notes TEXT,
      custom_fields JSONB DEFAULT '{}'::jsonb,
      image TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Check if devices have status, if not add it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'devices' AND column_name = 'status') THEN
    ALTER TABLE devices ADD COLUMN status VARCHAR(50) DEFAULT 'operational' 
    CHECK (status IN ('operational', 'maintenance', 'offline'));
  END IF;
END $$;

-- Check if devices have next_maintenance_date, if not add it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'devices' AND column_name = 'next_maintenance_date') THEN
    ALTER TABLE devices ADD COLUMN next_maintenance_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Check if devices have updated_at, if not add it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                 WHERE table_name = 'devices' AND column_name = 'updated_at') THEN
    ALTER TABLE devices ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_devices_modtime'
  ) THEN
    CREATE TRIGGER trigger_update_devices_modtime
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
  END IF;
END $$;

-- Create indexes for improved performance
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_serial_number') THEN
    CREATE INDEX idx_devices_serial_number ON devices (serial_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_restaurant_id') THEN
    CREATE INDEX idx_devices_restaurant_id ON devices (restaurant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_category_id') THEN
    CREATE INDEX idx_devices_category_id ON devices (category_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_devices_status') THEN
    CREATE INDEX idx_devices_status ON devices (status);
  END IF;
END $$;

-- Fix any devices with NULL custom_fields
UPDATE devices SET custom_fields = '{}'::jsonb WHERE custom_fields IS NULL;

-- Fix any devices with NULL name or serial_number (replace with placeholder if found)
UPDATE devices SET name = 'Unnamed Device' WHERE name IS NULL;
UPDATE devices SET serial_number = 'UNKNOWN' WHERE serial_number IS NULL;

-- Fix any devices with NULL type
UPDATE devices SET type = 'Other' WHERE type IS NULL;

-- Create a new function to check maintenance status and update device status if needed
CREATE OR REPLACE FUNCTION update_device_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- If a device has overdue maintenance, update its status to 'maintenance'
  IF NEW.next_maintenance_date IS NOT NULL AND NEW.next_maintenance_date < NOW() THEN
    NEW.status := 'maintenance';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_device_status_on_maintenance'
  ) THEN
    CREATE TRIGGER trigger_update_device_status_on_maintenance
    BEFORE INSERT OR UPDATE OF next_maintenance_date ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_device_status_on_maintenance();
  END IF;
END $$; 