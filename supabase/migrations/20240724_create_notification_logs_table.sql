-- Create notification logs table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- email, sms, line
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  message_id VARCHAR(255), -- External service message ID
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_type_status 
ON notification_logs(type, status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient 
ON notification_logs(recipient);

CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at 
ON notification_logs(sent_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_logs_updated_at
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_logs_updated_at();

-- Grant permissions
GRANT ALL ON TABLE notification_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE notification_logs_id_seq TO authenticated;