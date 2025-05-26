-- Sample Restaurant
INSERT INTO restaurants (name, location, contact_email, contact_phone, address)
VALUES ('Test Restaurant', 'Downtown', 'test@example.com', '555-1234', '123 Main St')
ON CONFLICT DO NOTHING;

-- Get restaurant ID
DO $$
DECLARE
  restaurant_id UUID;
BEGIN
  SELECT id INTO restaurant_id FROM restaurants WHERE name = 'Test Restaurant' LIMIT 1;
  
  IF restaurant_id IS NOT NULL THEN
    -- Sample Device Categories
    INSERT INTO device_categories (name, description, icon, color, maintenance_interval)
    VALUES 
      ('Refrigeration', 'Refrigerators, freezers, and cooling equipment', 'refrigerator', '#3B82F6', 90),
      ('Cooking', 'Ovens, stoves, and cooking equipment', 'oven', '#F97316', 60),
      ('Coffee', 'Coffee machines and equipment', 'coffee', '#10B981', 30)
    ON CONFLICT DO NOTHING;
    
    -- Get category ID
    DECLARE
      category_id UUID;
    BEGIN
      SELECT id INTO category_id FROM device_categories WHERE name = 'Refrigeration' LIMIT 1;
      
      IF category_id IS NOT NULL THEN
        -- Sample Device
        INSERT INTO devices (
          name, 
          serial_number, 
          type, 
          model, 
          status, 
          restaurant_id, 
          category_id,
          purchase_date,
          warranty_expiry,
          custom_fields
        )
        VALUES (
          'Main Refrigerator', 
          'REF123456', 
          'refrigerator', 
          'CoolTech 3000', 
          'operational', 
          restaurant_id, 
          category_id,
          NOW() - INTERVAL '1 year',
          NOW() + INTERVAL '2 years',
          '{"temperature": 4, "voltage": 220, "hasBackupPower": true, "lastServiceNote": "Cleaned condenser coils"}'::jsonb
        )
        ON CONFLICT DO NOTHING;
        
        -- Get device ID
        DECLARE
          device_id UUID;
          user_id UUID;
        BEGIN
          SELECT id INTO device_id FROM devices WHERE serial_number = 'REF123456' LIMIT 1;
          
          -- Get first user if exists
          SELECT id INTO user_id FROM auth.users LIMIT 1;
          
          IF device_id IS NOT NULL AND user_id IS NOT NULL THEN
            -- Sample Maintenance Record
            INSERT INTO maintenance_records (
              device_id, 
              technician_id, 
              date, 
              description, 
              resolved
            )
            VALUES (
              device_id,
              user_id,
              NOW() - INTERVAL '2 months',
              'Regular maintenance check - replaced filters and cleaned condenser coils. Temperature set to 4°C.',
              true
            )
            ON CONFLICT DO NOTHING;
            
            -- Update device's last_maintenance date
            UPDATE devices 
            SET last_maintenance = NOW() - INTERVAL '2 months' 
            WHERE id = device_id;
          END IF;
        END;
      END IF;
    END;
  END IF;
END $$; 