-- Enable realtime for device_categories table
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'device_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE device_categories;
  END IF;
END
$$;