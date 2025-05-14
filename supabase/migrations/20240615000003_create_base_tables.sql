-- Create restaurants table if it doesn't exist
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT NOT NULL,
  status TEXT DEFAULT 'operational',
  restaurant_id UUID REFERENCES restaurants(id),
  last_maintenance TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  custom_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create tickets table if it doesn't exist
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'new',
  device_id UUID REFERENCES devices(id),
  restaurant_id UUID REFERENCES restaurants(id),
  diagnostic_info TEXT,
  photos TEXT[],
  created_by UUID,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  jira_ticket_id TEXT
);

-- Create ticket_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  user_id UUID,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) NOT NULL,
  technician_id UUID,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create device_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS device_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) NOT NULL,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID
);

-- Enable row level security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow full access to restaurants" ON restaurants;
CREATE POLICY "Allow full access to restaurants"
  ON restaurants
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to devices" ON devices;
CREATE POLICY "Allow full access to devices"
  ON devices
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to tickets" ON tickets;
CREATE POLICY "Allow full access to tickets"
  ON tickets
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to ticket_comments" ON ticket_comments;
CREATE POLICY "Allow full access to ticket_comments"
  ON ticket_comments
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to maintenance_schedules" ON maintenance_schedules;
CREATE POLICY "Allow full access to maintenance_schedules"
  ON maintenance_schedules
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to device_status_history" ON device_status_history;
CREATE POLICY "Allow full access to device_status_history"
  ON device_status_history
  USING (true)
  WITH CHECK (true);

-- Add tables to realtime
alter publication supabase_realtime add table restaurants;
alter publication supabase_realtime add table devices;
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_comments;
alter publication supabase_realtime add table maintenance_schedules;
alter publication supabase_realtime add table device_status_history;
