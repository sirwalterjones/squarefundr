-- Create help_messages table for threaded conversations
CREATE TABLE IF NOT EXISTS help_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    sender_user_id UUID REFERENCES auth.users(id),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false,
    CONSTRAINT valid_sender CHECK (
        (sender_type = 'admin' AND sender_user_id IS NOT NULL) OR
        (sender_type = 'user')
    )
);

-- Enable RLS
ALTER TABLE help_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view messages in their help requests
DROP POLICY IF EXISTS "Users can view messages in their help requests" ON help_messages;
CREATE POLICY "Users can view messages in their help requests" ON help_messages
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM help_requests 
            WHERE help_requests.id = help_messages.help_request_id 
            AND help_requests.email = (
                SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
            )
        )
    );

-- Create policy for users to insert messages in their help requests
DROP POLICY IF EXISTS "Users can send messages in their help requests" ON help_messages;
CREATE POLICY "Users can send messages in their help requests" ON help_messages
    FOR INSERT 
    WITH CHECK (
        sender_type = 'user' AND
        EXISTS (
            SELECT 1 FROM help_requests 
            WHERE help_requests.id = help_request_id 
            AND help_requests.email = (
                SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
            )
        )
    );

-- Create policy for admins to view all messages
DROP POLICY IF EXISTS "Admins can view all help messages" ON help_messages;
CREATE POLICY "Admins can view all help messages" ON help_messages
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Create policy for admins to insert messages
DROP POLICY IF EXISTS "Admins can send messages to any help request" ON help_messages;
CREATE POLICY "Admins can send messages to any help request" ON help_messages
    FOR INSERT 
    WITH CHECK (
        sender_type = 'admin' AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Create policy for admins to update messages (mark as read)
DROP POLICY IF EXISTS "Admins can update help messages" ON help_messages;
CREATE POLICY "Admins can update help messages" ON help_messages
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_messages_help_request_id ON help_messages(help_request_id);
CREATE INDEX IF NOT EXISTS idx_help_messages_created_at ON help_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_messages_sender_type ON help_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_help_messages_is_read ON help_messages(is_read);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_help_messages_updated_at ON help_messages;
CREATE TRIGGER trigger_help_messages_updated_at
    BEFORE UPDATE ON help_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_help_messages_updated_at();

-- Create function to update help_requests.updated_at when new message is added
CREATE OR REPLACE FUNCTION update_help_request_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE help_requests 
    SET updated_at = NOW()
    WHERE id = NEW.help_request_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update help_requests when new message is added
DROP TRIGGER IF EXISTS trigger_update_help_request_on_new_message ON help_messages;
CREATE TRIGGER trigger_update_help_request_on_new_message
    AFTER INSERT ON help_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_help_request_on_new_message();
