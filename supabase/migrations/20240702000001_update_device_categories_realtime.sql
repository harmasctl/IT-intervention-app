-- Check if device_categories table exists and add to realtime if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'device_categories'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'device_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE device_categories;
  END IF;
END $$;