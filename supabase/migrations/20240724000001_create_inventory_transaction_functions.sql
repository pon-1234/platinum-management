-- Create RPC functions for inventory transactions with proper concurrency control

-- 1. Create inventory movement with atomic stock update
CREATE OR REPLACE FUNCTION create_inventory_movement_with_stock_update(
  p_product_id INT,
  p_movement_type TEXT,
  p_quantity INT,
  p_unit_cost DECIMAL(10,2) DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movement_id INT;
  v_current_stock INT;
  v_new_stock INT;
  v_product_exists BOOLEAN;
  result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock the product row to prevent concurrent updates
    SELECT stock_quantity, EXISTS(SELECT 1 FROM products WHERE id = p_product_id)
    INTO v_current_stock, v_product_exists
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    -- Check if product exists
    IF NOT v_product_exists THEN
      RAISE EXCEPTION 'Product with id % does not exist', p_product_id;
    END IF;
    
    -- Calculate new stock based on movement type
    CASE p_movement_type
      WHEN 'in' THEN
        v_new_stock := v_current_stock + p_quantity;
      WHEN 'out' THEN
        v_new_stock := v_current_stock - p_quantity;
        -- Check if sufficient stock for 'out' movement
        IF v_new_stock < 0 THEN
          RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_current_stock, p_quantity;
        END IF;
      WHEN 'adjustment' THEN
        v_new_stock := p_quantity; -- For adjustments, quantity is the new stock level
      ELSE
        RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
    END CASE;
    
    -- Insert inventory movement record
    INSERT INTO inventory_movements (
      product_id,
      movement_type,
      quantity,
      unit_cost,
      reason,
      reference_id,
      user_id,
      created_at
    ) VALUES (
      p_product_id,
      p_movement_type,
      p_quantity,
      p_unit_cost,
      p_reason,
      p_reference_id,
      COALESCE(p_user_id, auth.uid()),
      NOW()
    ) RETURNING id INTO v_movement_id;
    
    -- Update product stock
    UPDATE products
    SET 
      stock_quantity = v_new_stock,
      updated_at = NOW()
    WHERE id = p_product_id;
    
    -- Return result
    SELECT json_build_object(
      'movement_id', v_movement_id,
      'product_id', p_product_id,
      'previous_stock', v_current_stock,
      'new_stock', v_new_stock,
      'movement_type', p_movement_type,
      'quantity', p_quantity
    ) INTO result;
    
    RETURN result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;

-- 2. Batch update inventory (for multiple products at once)
CREATE OR REPLACE FUNCTION batch_update_inventory(
  p_movements JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_movement JSONB;
  v_results JSONB[] := '{}';
  v_result JSONB;
  v_success_count INT := 0;
  v_error_count INT := 0;
  v_errors JSONB[] := '{}';
BEGIN
  -- Process each movement
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    BEGIN
      -- Call the single movement function
      v_result := create_inventory_movement_with_stock_update(
        (v_movement->>'product_id')::INT,
        v_movement->>'movement_type',
        (v_movement->>'quantity')::INT,
        (v_movement->>'unit_cost')::DECIMAL(10,2),
        v_movement->>'reason',
        v_movement->>'reference_id',
        (v_movement->>'user_id')::UUID
      )::JSONB;
      
      v_results := array_append(v_results, v_result);
      v_success_count := v_success_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := array_append(v_errors, jsonb_build_object(
          'product_id', v_movement->>'product_id',
          'error', SQLERRM
        ));
        v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results,
    'errors', v_errors
  );
END;
$$;

-- 3. Get current stock with lock (for read-modify-write operations)
CREATE OR REPLACE FUNCTION get_product_stock_for_update(
  p_product_id INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock_info JSON;
BEGIN
  SELECT json_build_object(
    'product_id', id,
    'stock_quantity', stock_quantity,
    'low_stock_threshold', low_stock_threshold,
    'is_low_stock', stock_quantity <= low_stock_threshold
  ) INTO v_stock_info
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF v_stock_info IS NULL THEN
    RAISE EXCEPTION 'Product with id % not found', p_product_id;
  END IF;
  
  RETURN v_stock_info;
END;
$$;

-- 4. Helper function to count low stock products
CREATE OR REPLACE FUNCTION count_low_stock_products()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM products
  WHERE is_active = true
    AND stock_quantity <= low_stock_threshold
    AND stock_quantity > 0;
    
  RETURN v_count;
END;
$$;

-- 5. Get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  id INT,
  name VARCHAR,
  category VARCHAR,
  stock_quantity INT,
  low_stock_threshold INT,
  reorder_point INT,
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  max_stock INT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.category,
    p.stock_quantity,
    p.low_stock_threshold,
    p.reorder_point,
    p.price,
    p.cost,
    p.max_stock,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM products p
  WHERE p.is_active = true
    AND p.stock_quantity <= p.low_stock_threshold
    AND p.stock_quantity > 0
  ORDER BY p.stock_quantity ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_inventory_movement_with_stock_update(INT, TEXT, INT, DECIMAL, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_inventory(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_stock_for_update(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_low_stock_products() TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_products() TO authenticated;