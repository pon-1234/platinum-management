-- Create functions for bottle keep expiry alerts

-- 1. Table to track sent alerts (to avoid duplicates)
CREATE TABLE IF NOT EXISTS bottle_keep_alerts_sent (
  id SERIAL PRIMARY KEY,
  bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  message TEXT
);

-- 2. Function to get bottles requiring alerts
CREATE OR REPLACE FUNCTION get_bottles_requiring_alerts()
RETURNS TABLE (
  bottle_keep_id UUID,
  customer_id UUID,
  customer_name VARCHAR,
  customer_email VARCHAR,
  customer_phone VARCHAR,
  customer_line_id VARCHAR,
  product_name VARCHAR,
  expiry_date DATE,
  days_until_expiry INT,
  remaining_amount DECIMAL(3,2),
  alert_type VARCHAR,
  alert_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH alert_candidates AS (
    SELECT 
      bk.id as bottle_keep_id,
      bk.customer_id,
      c.name as customer_name,
      c.email as customer_email,
      c.phone_number as customer_phone,
      c.line_id as customer_line_id,
      p.name as product_name,
      bk.expiry_date,
      (bk.expiry_date - CURRENT_DATE) as days_until_expiry,
      bk.remaining_amount,
      CASE 
        WHEN bk.expiry_date < CURRENT_DATE THEN 'expired'
        WHEN bk.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'expiring_3days'
        WHEN bk.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_7days'
        WHEN bk.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_30days'
        ELSE NULL
      END as alert_type
    FROM bottle_keeps bk
    JOIN customers c ON c.id = bk.customer_id
    JOIN products p ON p.id = bk.product_id
    WHERE bk.status = 'active'
      AND (
        bk.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        OR bk.remaining_amount <= 0.2
      )
  )
  SELECT 
    ac.bottle_keep_id,
    ac.customer_id,
    ac.customer_name,
    ac.customer_email,
    ac.customer_phone,
    ac.customer_line_id,
    ac.product_name,
    ac.expiry_date,
    ac.days_until_expiry,
    ac.remaining_amount,
    COALESCE(ac.alert_type, 
      CASE WHEN ac.remaining_amount <= 0.2 THEN 'low_amount' ELSE NULL END
    ) as alert_type,
    CASE 
      WHEN ac.alert_type = 'expired' THEN 
        format('【期限切れ】%sのボトルキープが期限切れです（%s日経過）', ac.product_name, ABS(ac.days_until_expiry))
      WHEN ac.alert_type = 'expiring_3days' THEN 
        format('【期限間近】%sのボトルキープが%s日後に期限切れになります', ac.product_name, ac.days_until_expiry)
      WHEN ac.alert_type = 'expiring_7days' THEN 
        format('【期限通知】%sのボトルキープが%s日後に期限切れになります', ac.product_name, ac.days_until_expiry)
      WHEN ac.alert_type = 'expiring_30days' THEN 
        format('【期限通知】%sのボトルキープが%s日後に期限切れになります', ac.product_name, ac.days_until_expiry)
      WHEN ac.remaining_amount <= 0.2 THEN 
        format('【残量わずか】%sのボトルキープの残量が%s%%です', ac.product_name, ROUND(ac.remaining_amount * 100))
    END as alert_message
  FROM alert_candidates ac
  WHERE ac.alert_type IS NOT NULL OR ac.remaining_amount <= 0.2
  ORDER BY 
    CASE ac.alert_type
      WHEN 'expired' THEN 1
      WHEN 'expiring_3days' THEN 2
      WHEN 'expiring_7days' THEN 3
      WHEN 'expiring_30days' THEN 4
      ELSE 5
    END,
    ac.days_until_expiry;
END;
$$;

-- 3. Function to record sent alerts
CREATE OR REPLACE FUNCTION record_alert_sent(
  p_bottle_keep_id UUID,
  p_customer_id UUID,
  p_alert_type VARCHAR,
  p_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if alert was already sent today
  IF EXISTS (
    SELECT 1 
    FROM bottle_keep_alerts_sent 
    WHERE bottle_keep_id = p_bottle_keep_id 
      AND alert_type = p_alert_type 
      AND DATE(sent_at) = CURRENT_DATE
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Record the alert
  INSERT INTO bottle_keep_alerts_sent (
    bottle_keep_id,
    customer_id,
    alert_type,
    message
  ) VALUES (
    p_bottle_keep_id,
    p_customer_id,
    p_alert_type,
    p_message
  );
  
  RETURN TRUE;
END;
$$;

-- 4. Function to get unsent alerts (for batch processing)
CREATE OR REPLACE FUNCTION get_unsent_alerts()
RETURNS TABLE (
  bottle_keep_id UUID,
  customer_id UUID,
  customer_name VARCHAR,
  customer_email VARCHAR,
  customer_phone VARCHAR,
  customer_line_id VARCHAR,
  product_name VARCHAR,
  expiry_date DATE,
  days_until_expiry INT,
  remaining_amount DECIMAL(3,2),
  alert_type VARCHAR,
  alert_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bra.*
  FROM get_bottles_requiring_alerts() bra
  WHERE NOT EXISTS (
    SELECT 1 
    FROM bottle_keep_alerts_sent bas
    WHERE bas.bottle_keep_id = bra.bottle_keep_id 
      AND bas.alert_type = bra.alert_type 
      AND DATE(bas.sent_at) = CURRENT_DATE
  );
END;
$$;

-- 5. Function to process and send alerts (returns alerts that need to be sent)
CREATE OR REPLACE FUNCTION process_bottle_keep_alerts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alerts JSON;
  v_alert RECORD;
  v_sent_count INT := 0;
BEGIN
  -- Get all unsent alerts
  WITH alerts_to_send AS (
    SELECT * FROM get_unsent_alerts()
  )
  SELECT json_agg(
    json_build_object(
      'bottle_keep_id', bottle_keep_id,
      'customer_id', customer_id,
      'customer_name', customer_name,
      'customer_email', customer_email,
      'customer_phone', customer_phone,
      'customer_line_id', customer_line_id,
      'product_name', product_name,
      'expiry_date', expiry_date,
      'days_until_expiry', days_until_expiry,
      'remaining_amount', remaining_amount,
      'alert_type', alert_type,
      'alert_message', alert_message
    )
  ) INTO v_alerts
  FROM alerts_to_send;
  
  -- Record all alerts as sent
  FOR v_alert IN SELECT * FROM get_unsent_alerts()
  LOOP
    PERFORM record_alert_sent(
      v_alert.bottle_keep_id,
      v_alert.customer_id,
      v_alert.alert_type,
      v_alert.alert_message
    );
    v_sent_count := v_sent_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'alerts', COALESCE(v_alerts, '[]'::json),
    'sent_count', v_sent_count
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_bottles_requiring_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION record_alert_sent(UUID, UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unsent_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION process_bottle_keep_alerts() TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_lookup 
ON bottle_keep_alerts_sent(bottle_keep_id, alert_type, sent_at);

-- Create unique constraint to prevent duplicate alerts on the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_unique
ON bottle_keep_alerts_sent(bottle_keep_id, alert_type, DATE(sent_at));

CREATE INDEX IF NOT EXISTS idx_bottle_keeps_expiry_alert 
ON bottle_keeps(status, expiry_date) 
WHERE status = 'active';