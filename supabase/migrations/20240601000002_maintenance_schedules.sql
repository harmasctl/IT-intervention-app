-- Create maintenance_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    technician_id TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view all maintenance schedules" ON maintenance_schedules;
CREATE POLICY "Users can view all maintenance schedules"
ON maintenance_schedules FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert maintenance schedules" ON maintenance_schedules;
CREATE POLICY "Users can insert maintenance schedules"
ON maintenance_schedules FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update maintenance schedules" ON maintenance_schedules;
CREATE POLICY "Users can update maintenance schedules"
ON maintenance_schedules FOR UPDATE
USING (true);

-- Enable realtime
alter publication supabase_realtime add table maintenance_schedules;