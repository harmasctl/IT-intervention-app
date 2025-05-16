-- Add SLA tracking fields to tickets table
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS sla_response_target INTERVAL,
ADD COLUMN IF NOT EXISTS sla_resolution_target INTERVAL,
ADD COLUMN IF NOT EXISTS first_response_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolution_time TIMESTAMP WITH TIME ZONE;

-- Add realtime for the updated table
alter publication supabase_realtime add table tickets;
