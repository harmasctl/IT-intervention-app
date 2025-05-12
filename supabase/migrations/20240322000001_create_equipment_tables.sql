-- Create suppliers table first
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equipment_inventory table with supplier_id reference
CREATE TABLE IF NOT EXISTS equipment_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  model_number TEXT,
  serial_number TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  supplier_id UUID REFERENCES suppliers(id),
  warranty_expiration DATE,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create equipment_movements table
CREATE TABLE IF NOT EXISTS equipment_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment_inventory(id),
  from_location TEXT,
  to_location TEXT NOT NULL,
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moved_by UUID REFERENCES auth.users(id),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_inventory_supplier ON equipment_inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_equipment_movements_equipment ON equipment_movements(equipment_id);

-- Create RLS policies for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view suppliers" ON suppliers;
CREATE POLICY "Allow authenticated users to view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert suppliers" ON suppliers;
CREATE POLICY "Allow authenticated users to insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update suppliers" ON suppliers;
CREATE POLICY "Allow authenticated users to update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true);

-- Create RLS policies for equipment_inventory
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view equipment" ON equipment_inventory;
CREATE POLICY "Allow authenticated users to view equipment"
  ON equipment_inventory FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert equipment" ON equipment_inventory;
CREATE POLICY "Allow authenticated users to insert equipment"
  ON equipment_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update equipment" ON equipment_inventory;
CREATE POLICY "Allow authenticated users to update equipment"
  ON equipment_inventory FOR UPDATE
  TO authenticated
  USING (true);

-- Create RLS policies for equipment_movements
ALTER TABLE equipment_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view movements" ON equipment_movements;
CREATE POLICY "Allow authenticated users to view movements"
  ON equipment_movements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert movements" ON equipment_movements;
CREATE POLICY "Allow authenticated users to insert movements"
  ON equipment_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update movements" ON equipment_movements;
CREATE POLICY "Allow authenticated users to update movements"
  ON equipment_movements FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'equipment_inventory'
  ) THEN
    alter publication supabase_realtime add table equipment_inventory;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'equipment_movements'
  ) THEN
    alter publication supabase_realtime add table equipment_movements;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'suppliers'
  ) THEN
    alter publication supabase_realtime add table suppliers;
  END IF;
END
$$;