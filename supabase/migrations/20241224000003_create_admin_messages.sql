-- Create admin_messages table for admin-to-user messaging
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_admin_id UUID REFERENCES auth.users(id) NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can send messages" ON admin_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their messages" ON admin_messages
  FOR SELECT
  USING (to_user_id = auth.uid());

CREATE POLICY "Admins can view all messages" ON admin_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can mark messages as read" ON admin_messages
  FOR UPDATE
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());
