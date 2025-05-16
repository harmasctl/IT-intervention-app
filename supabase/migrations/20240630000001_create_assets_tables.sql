-- Create assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'maintenance', 'offline', 'retired')),
  serial_number TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE,
  warranty_expiry TIMESTAMP WITH TIME ZONE,
  value DECIMAL(10, 2),
  notes TEXT,
  location_id UUID REFERENCES restaurants(id),
  assigned_to UUID REFERENCES users(id),
  last_maintenance TIMESTAMP WITH TIME ZONE,
  next_maintenance TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset maintenance table if it doesn't exist
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection')),
  description TEXT NOT NULL,
  technician_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  parts_used TEXT[],
  cost DECIMAL(10, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create asset attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS asset_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance attachments table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_id UUID NOT NULL REFERENCES asset_maintenance(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for all tables
alter publication supabase_realtime add table assets;
alter publication supabase_realtime add table asset_maintenance;
alter publication supabase_realtime add table asset_attachments;
alter publication supabase_realtime add table maintenance_attachments;
