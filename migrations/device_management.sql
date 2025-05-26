-- Device Categories Table
CREATE TABLE IF NOT EXISTS device_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  maintenance_interval INTEGER DEFAULT 90, -- days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for device_categories
ALTER TABLE device_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON device_categories
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON device_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON device_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON device_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add device category fields to devices table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'devices') THEN
    -- Check if column already exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'category_id') THEN
      ALTER TABLE devices ADD COLUMN category_id UUID REFERENCES device_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'custom_fields') THEN
      ALTER TABLE devices ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'last_maintenance') THEN
      ALTER TABLE devices ADD COLUMN last_maintenance TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'next_maintenance_reminder_sent') THEN
      ALTER TABLE devices ADD COLUMN next_maintenance_reminder_sent TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'warranty_expiry') THEN
      ALTER TABLE devices ADD COLUMN warranty_expiry TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'purchase_date') THEN
      ALTER TABLE devices ADD COLUMN purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'qr_code') THEN
      ALTER TABLE devices ADD COLUMN qr_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'image') THEN
      ALTER TABLE devices ADD COLUMN image TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'status') THEN
      ALTER TABLE devices ADD COLUMN status TEXT DEFAULT 'operational'::text;
    END IF;
  ELSE
    -- Create devices table if it doesn't exist
    CREATE TABLE devices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      serial_number TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      model TEXT,
      status TEXT DEFAULT 'operational'::text,
      restaurant_id UUID NOT NULL REFERENCES restaurants(id),
      category_id UUID REFERENCES device_categories(id),
      last_maintenance TIMESTAMP WITH TIME ZONE,
      next_maintenance_reminder_sent TIMESTAMP WITH TIME ZONE,
      warranty_expiry TIMESTAMP WITH TIME ZONE,
      purchase_date TIMESTAMP WITH TIME ZONE,
      qr_code TEXT,
      image TEXT,
      custom_fields JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create RLS policies for devices
    ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Enable read access for all users" ON devices
      FOR SELECT USING (true);
    
    CREATE POLICY "Enable insert for authenticated users only" ON devices
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Enable update for authenticated users only" ON devices
      FOR UPDATE USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Enable delete for authenticated users only" ON devices
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES auth.users(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for maintenance_records
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON maintenance_records
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON maintenance_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON maintenance_records
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON maintenance_records
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance on maintenance-related queries
CREATE INDEX IF NOT EXISTS idx_devices_last_maintenance ON devices (last_maintenance);
CREATE INDEX IF NOT EXISTS idx_devices_category_id ON devices (category_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_device_id ON maintenance_records (device_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records (date);

-- Create storage bucket for device images if it doesn't exist
CREATE OR REPLACE FUNCTION create_storage_bucket()
RETURNS void AS $$
BEGIN
  -- This function is just a placeholder
  -- In real application you would execute storage.create_bucket('device-images')
  -- But we'll assume this is done through the Supabase UI or API
END;
$$ LANGUAGE plpgsql;

SELECT create_storage_bucket();

-- Add example data
INSERT INTO device_categories (name, description, icon, color, maintenance_interval)
VALUES 
  ('Refrigeration', 'Refrigerators, freezers, and cooling equipment', 'refrigerator', '#3B82F6', 90),
  ('Cooking', 'Ovens, stoves, and cooking equipment', 'oven', '#F97316', 60),
  ('Coffee', 'Coffee machines and equipment', 'coffee', '#10B981', 30)
ON CONFLICT (id) DO NOTHING;

-- Add example maintenance record
DO $$
DECLARE
  device_id UUID;
  user_id UUID;
BEGIN
  -- Get first device if exists
  SELECT id INTO device_id FROM devices LIMIT 1;
  
  -- Get first user if exists
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  -- If we have both a device and user, create a sample maintenance record
  IF device_id IS NOT NULL AND user_id IS NOT NULL THEN
    INSERT INTO maintenance_records (device_id, technician_id, description, resolved)
    VALUES (device_id, user_id, 'Regular maintenance check - replaced filters', true)
    ON CONFLICT (id) DO NOTHING;
    
    -- Update device's last_maintenance date
    UPDATE devices SET last_maintenance = NOW() WHERE id = device_id;
  END IF;
END $$; 