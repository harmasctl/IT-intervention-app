-- Create a function to handle equipment movement in a transaction
CREATE OR REPLACE FUNCTION record_equipment_movement(
  p_equipment_id UUID,
  p_movement_type TEXT,
  p_quantity INTEGER,
  p_reason TEXT,
  p_destination TEXT,
  p_notes TEXT,
  p_previous_stock INTEGER,
  p_new_stock INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Insert the movement record
    INSERT INTO equipment_movements (
      equipment_id,
      movement_type,
      quantity,
      reason,
      destination,
      notes,
      previous_stock,
      new_stock
    ) VALUES (
      p_equipment_id,
      p_movement_type,
      p_quantity,
      p_reason,
      p_destination,
      p_notes,
      p_previous_stock,
      p_new_stock
    ) RETURNING id INTO v_result;
    
    -- Update the equipment stock level
    UPDATE equipment
    SET stock_level = p_new_stock
    WHERE id = p_equipment_id;
    
    -- Return success
    RETURN jsonb_build_object('success', true, 'movement_id', v_result);
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;
