-- This SQL script fixes storage bucket permissions issues
-- Run this in the Supabase SQL Editor

-- 1. Create buckets if they don't exist
DO $$
BEGIN
    -- Check if device-images bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'device-images') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('device-images', 'device-images', true);
    END IF;

    -- Check if device-data bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'device-data') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('device-data', 'device-data', true);
    END IF;
END
$$;

-- 2. Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view device images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload device images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update device images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete device images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view device data" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload device data" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update device data" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete device data" ON storage.objects;

-- 4. Create device-images bucket policies
-- Select policy (anyone can view)
CREATE POLICY "Public can view device images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'device-images');

-- Insert policy (authenticated users only)
CREATE POLICY "Authenticated users can upload device images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'device-images' AND 
  auth.role() = 'authenticated'
);

-- Update policy (authenticated users only)
CREATE POLICY "Authenticated users can update device images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'device-images' AND 
  auth.role() = 'authenticated'
);

-- Delete policy (authenticated users only)
CREATE POLICY "Authenticated users can delete device images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'device-images' AND 
  auth.role() = 'authenticated'
);

-- 5. Create device-data bucket policies
-- Select policy (anyone can view)
CREATE POLICY "Public can view device data" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'device-data');

-- Insert policy (authenticated users only)
CREATE POLICY "Authenticated users can upload device data" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'device-data' AND 
  auth.role() = 'authenticated'
);

-- Update policy (authenticated users only)
CREATE POLICY "Authenticated users can update device data" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'device-data' AND 
  auth.role() = 'authenticated'
);

-- Delete policy (authenticated users only)
CREATE POLICY "Authenticated users can delete device data" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'device-data' AND 
  auth.role() = 'authenticated'
);

-- Verify the policies were created
SELECT
  policy_name, 
  table_name, 
  definition, 
  check_expression
FROM
  pg_policies
WHERE
  table_name = 'objects'
  AND schemaname = 'storage'; 