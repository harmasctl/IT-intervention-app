-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable row level security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy for suppliers
DROP POLICY IF EXISTS "Allow full access to suppliers" ON suppliers;
CREATE POLICY "Allow full access to suppliers"
  ON suppliers
  USING (true)
  WITH CHECK (true);

-- Add suppliers to realtime
alter publication supabase_realtime add table suppliers;
