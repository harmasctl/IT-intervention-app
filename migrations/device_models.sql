-- Create device models table
CREATE TABLE IF NOT EXISTS device_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  category_id UUID REFERENCES device_categories(id),
  description TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add model_id to devices table
DO $$ 
BEGIN 
  IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'devices' AND column_name = 'model_id'
  ) THEN 
      ALTER TABLE devices ADD COLUMN model_id UUID REFERENCES device_models(id);
  END IF;
END $$;

-- Make type column nullable to support transition
DO $$ 
BEGIN 
  -- Check if we can update the type column to be nullable
  ALTER TABLE devices ALTER COLUMN type DROP NOT NULL;
  EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'Column "type" does not exist or is already nullable';
  WHEN OTHERS THEN
    -- Do nothing, column may already be nullable
    RAISE NOTICE 'Some other issue with type column: %', SQLERRM;
END $$;

-- Add RLS policies for device_models table
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Create policies only if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'device_models' AND policyname = 'Allow authenticated users to select device_models'
  ) THEN
    CREATE POLICY "Allow authenticated users to select device_models" 
      ON device_models FOR SELECT 
      USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'device_models' AND policyname = 'Allow authenticated users to insert device_models'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert device_models" 
      ON device_models FOR INSERT 
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'device_models' AND policyname = 'Allow authenticated users to update device_models'
  ) THEN
    CREATE POLICY "Allow authenticated users to update device_models" 
      ON device_models FOR UPDATE 
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'device_models' AND policyname = 'Allow authenticated users to delete device_models'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete device_models" 
      ON device_models FOR DELETE 
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Create function to automatically update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_device_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
DO $$ BEGIN
  -- Drop trigger if exists and recreate
  DROP TRIGGER IF EXISTS update_device_models_updated_at ON device_models;

  CREATE TRIGGER update_device_models_updated_at
  BEFORE UPDATE ON device_models
  FOR EACH ROW
  EXECUTE FUNCTION update_device_models_updated_at();
END $$; 