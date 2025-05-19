-- Enhance device management tables

-- Create device_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS device_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  maintenance_interval INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing fields to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES device_categories(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS warranty_end_date DATE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mac_address TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS os_version TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_maintenance_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS next_maintenance_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS maintenance_history JSONB[];
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create device_maintenance_logs table
CREATE TABLE IF NOT EXISTS device_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id),
  maintenance_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  maintenance_type TEXT NOT NULL,
  description TEXT,
  parts_replaced JSONB,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create device_assignments table to track device assignments history
CREATE TABLE IF NOT EXISTS device_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  assigned_by UUID REFERENCES users(id),
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default device categories
INSERT INTO device_categories (name, description, icon, color, maintenance_interval)
VALUES 
('POS Terminal', 'Point of Sale Terminals', 'computer', '#3b82f6', 90),
('Kitchen Display', 'Kitchen Display Systems', 'monitor', '#10b981', 60),
('Network Equipment', 'Routers, Switches, and Access Points', 'router', '#6366f1', 120),
('Printer', 'Receipt and Kitchen Printers', 'printer', '#f59e0b', 45),
('Server', 'On-premise servers', 'server', '#ef4444', 30),
('Mobile Device', 'Tablets and Mobile Ordering Devices', 'tablet', '#8b5cf6', 60),
('Payment Terminal', 'Credit Card and Payment Processing Devices', 'terminal', '#ec4899', 90),
('Digital Menu', 'Digital Menu Boards and Displays', 'tv', '#14b8a6', 120),
('Audio Equipment', 'Speakers and Sound Systems', 'speaker', '#f97316', 180),
('Security Device', 'Security Cameras and Systems', 'camera', '#64748b', 90)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for new tables
ALTER publication supabase_realtime ADD TABLE device_categories;
ALTER publication supabase_realtime ADD TABLE device_maintenance_logs;
ALTER publication supabase_realtime ADD TABLE device_assignments; 