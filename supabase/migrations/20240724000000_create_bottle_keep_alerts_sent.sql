-- Create bottle_keep_alerts_sent table for tracking sent alerts
CREATE TABLE IF NOT EXISTS bottle_keep_alerts_sent (
  id SERIAL PRIMARY KEY,
  bottle_keep_id UUID NOT NULL REFERENCES bottle_keeps(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_bottle_keep_id 
ON bottle_keep_alerts_sent(bottle_keep_id);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_customer_id 
ON bottle_keep_alerts_sent(customer_id);

CREATE INDEX IF NOT EXISTS idx_bottle_keep_alerts_sent_alert_type 
ON bottle_keep_alerts_sent(alert_type);

-- Grant permissions
GRANT ALL ON TABLE bottle_keep_alerts_sent TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE bottle_keep_alerts_sent_id_seq TO authenticated;