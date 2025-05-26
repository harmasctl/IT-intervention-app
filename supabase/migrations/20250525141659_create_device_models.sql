-- Create device_models table
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

-- Add index on manufacturer and name for faster searches
CREATE INDEX IF NOT EXISTS idx_device_models_manufacturer ON device_models(manufacturer);
CREATE INDEX IF NOT EXISTS idx_device_models_name ON device_models(name);

-- Add model_id column to devices table
ALTER TABLE devices ADD COLUMN model_id UUID REFERENCES device_models(id);

-- Add RLS policies for device_models
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select device_models" 
    ON device_models FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert device_models" 
    ON device_models FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update device_models" 
    ON device_models FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete device_models" 
    ON device_models FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on change
CREATE TRIGGER update_device_models_modtime
BEFORE UPDATE ON device_models
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
