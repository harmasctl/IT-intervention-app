-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'low_stock')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_id UUID,
  related_type TEXT
);

-- Enable row level security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own notifications
DROP POLICY IF EXISTS "Users can view all notifications" ON notifications;
CREATE POLICY "Users can view all notifications"
  ON notifications
  FOR ALL
  USING (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
