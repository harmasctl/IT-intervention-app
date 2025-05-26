-- SQL to optimize database for device map functionality

-- 1. Ensure restaurants table has location fields
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to explain the location field
COMMENT ON COLUMN restaurants.location IS 'JSON object with latitude and longitude';

-- 2. Create indexes for faster queries
-- Index on restaurant name for quick search
CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name);

-- Index on device restaurant_id for quick filtering
CREATE INDEX IF NOT EXISTS idx_devices_restaurant_id ON devices(restaurant_id);

-- Index on device type for filtering
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);

-- Index on device status for filtering
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- 3. Create a view for restaurant device counts
CREATE OR REPLACE VIEW restaurant_device_counts AS
SELECT 
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    COUNT(d.id) AS device_count,
    COUNT(CASE WHEN d.status = 'operational' THEN 1 END) AS operational_count,
    COUNT(CASE WHEN d.status = 'maintenance' THEN 1 END) AS maintenance_count,
    COUNT(CASE WHEN d.status = 'offline' THEN 1 END) AS offline_count
FROM 
    restaurants r
LEFT JOIN 
    devices d ON r.id = d.restaurant_id
GROUP BY 
    r.id, r.name;

-- 4. Create a function to get devices by restaurant with category info
CREATE OR REPLACE FUNCTION get_restaurant_devices(restaurant_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    type TEXT,
    model TEXT,
    status TEXT,
    image TEXT,
    category_id UUID,
    category_name TEXT,
    last_maintenance TIMESTAMP WITH TIME ZONE,
    next_maintenance TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.type,
        d.model,
        d.status,
        d.image,
        d.category_id,
        c.name AS category_name,
        d.last_maintenance,
        d.next_maintenance
    FROM 
        devices d
    LEFT JOIN 
        device_categories c ON d.category_id = c.id
    WHERE 
        d.restaurant_id = $1
    ORDER BY 
        d.name;
END;
$$ LANGUAGE plpgsql; 