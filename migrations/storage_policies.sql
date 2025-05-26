-- The following statements should be run in the Supabase SQL editor
-- to set up storage permissions for device images

-- Create device-images bucket if it doesn't exist
SELECT create_storage_bucket('device-images', 'Device images bucket', 'public');

-- Create device-data bucket if it doesn't exist
SELECT create_storage_bucket('device-data', 'Device data for QR codes', 'public');

-- Enable RLS for storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for device-images bucket
CREATE POLICY "Public can view device images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'device-images');

CREATE POLICY "Authenticated users can upload device images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'device-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update device images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'device-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete device images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'device-images' AND auth.role() = 'authenticated');

-- Create policies for device-data bucket
CREATE POLICY "Public can view device data" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'device-data');

CREATE POLICY "Authenticated users can upload device data" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'device-data' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update device data" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'device-data' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete device data" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'device-data' AND auth.role() = 'authenticated'); 