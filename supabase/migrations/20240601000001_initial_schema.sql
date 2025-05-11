-- Create tables for the restaurant technical support management app

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('technician', 'software_tech', 'admin', 'manager', 'restaurant_staff', 'warehouse')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  status TEXT NOT NULL CHECK (status IN ('operational', 'maintenance', 'offline')) DEFAULT 'operational',
  last_maintenance TIMESTAMPTZ,
  image TEXT,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  device_id UUID NOT NULL REFERENCES devices(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'in-progress', 'resolved')) DEFAULT 'new',
  diagnostic_info TEXT NOT NULL,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id),
  date TIMESTAMPTZ NOT NULL,
  technician_id UUID NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intervention history table
CREATE TABLE IF NOT EXISTS intervention_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  date TIMESTAMPTZ NOT NULL,
  technician_id UUID NOT NULL REFERENCES users(id),
  actions TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment inventory table
CREATE TABLE IF NOT EXISTS equipment_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  stock_level INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  warehouse_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  technician_id UUID NOT NULL REFERENCES users(id),
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable realtime for all tables
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table restaurants;
alter publication supabase_realtime add table devices;
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table maintenance_records;
alter publication supabase_realtime add table intervention_history;
alter publication supabase_realtime add table equipment_inventory;
alter publication supabase_realtime add table schedules;
