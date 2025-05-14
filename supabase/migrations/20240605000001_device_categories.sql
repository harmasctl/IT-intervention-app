-- Create device_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.device_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access" ON public.device_categories;
CREATE POLICY "Public access"
  ON public.device_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth users can insert" ON public.device_categories;
CREATE POLICY "Auth users can insert"
  ON public.device_categories FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can update" ON public.device_categories;
CREATE POLICY "Auth users can update"
  ON public.device_categories FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Add category_id to devices table
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.device_categories(id);

-- Enable realtime
alter publication supabase_realtime add table device_categories;
