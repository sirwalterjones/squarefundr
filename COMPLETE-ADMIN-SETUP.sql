-- =====================================================
-- COMPLETE ADMIN AND HELP SYSTEM SETUP
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- 1. CREATE USER_ROLES TABLE (for admin permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT 
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 2. CREATE HELP_REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS help_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT -- Admin notes/responses (legacy field)
);

-- Enable RLS on help_requests
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- 3. CREATE HELP_MESSAGES TABLE
-- =====================================================
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

-- Enable RLS on help_messages
ALTER TABLE help_messages ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES FOR HELP_REQUESTS
-- =====================================================

-- Anyone can submit help requests
DROP POLICY IF EXISTS "Anyone can submit help requests" ON help_requests;
CREATE POLICY "Anyone can submit help requests" ON help_requests
    FOR INSERT 
    WITH CHECK (true);

-- Users can view their own help requests
DROP POLICY IF EXISTS "Users can view their own help requests" ON help_requests;
CREATE POLICY "Users can view their own help requests" ON help_requests
    FOR SELECT 
    USING (
        email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    );

-- Admins can view all help requests
DROP POLICY IF EXISTS "Admins can view all help requests" ON help_requests;
CREATE POLICY "Admins can view all help requests" ON help_requests
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Admins can update help requests
DROP POLICY IF EXISTS "Admins can update help requests" ON help_requests;
CREATE POLICY "Admins can update help requests" ON help_requests
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- 5. CREATE RLS POLICIES FOR HELP_MESSAGES
-- =====================================================

-- Users can view messages in their help requests
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

-- Users can send messages in their help requests
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

-- Admins can view all help messages
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

-- Admins can send messages to any help request
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

-- Admins can update help messages (mark as read)
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

-- 6. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for help_requests
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_requests_priority ON help_requests(priority);
CREATE INDEX IF NOT EXISTS idx_help_requests_email ON help_requests(email);

-- Indexes for help_messages
CREATE INDEX IF NOT EXISTS idx_help_messages_help_request_id ON help_messages(help_request_id);
CREATE INDEX IF NOT EXISTS idx_help_messages_created_at ON help_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_messages_sender_type ON help_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_help_messages_is_read ON help_messages(is_read);

-- 7. CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp for user_roles
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_roles updated_at
DROP TRIGGER IF EXISTS trigger_user_roles_updated_at ON user_roles;
CREATE TRIGGER trigger_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_roles_updated_at();

-- Function to update updated_at timestamp for help_requests
CREATE OR REPLACE FUNCTION update_help_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for help_requests updated_at
DROP TRIGGER IF EXISTS trigger_help_requests_updated_at ON help_requests;
CREATE TRIGGER trigger_help_requests_updated_at
    BEFORE UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_help_requests_updated_at();

-- Function to update updated_at timestamp for help_messages
CREATE OR REPLACE FUNCTION update_help_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for help_messages updated_at
DROP TRIGGER IF EXISTS trigger_help_messages_updated_at ON help_messages;
CREATE TRIGGER trigger_help_messages_updated_at
    BEFORE UPDATE ON help_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_help_messages_updated_at();

-- Function to update help_requests.updated_at when new message is added
CREATE OR REPLACE FUNCTION update_help_request_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE help_requests 
    SET updated_at = NOW()
    WHERE id = NEW.help_request_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update help_requests when new message is added
DROP TRIGGER IF EXISTS trigger_update_help_request_on_new_message ON help_messages;
CREATE TRIGGER trigger_update_help_request_on_new_message
    AFTER INSERT ON help_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_help_request_on_new_message();

-- =====================================================
-- 8. MAKE YOURSELF AN ADMIN (REPLACE WITH YOUR EMAIL)
-- =====================================================

-- Insert admin role for walterjonesjr@gmail.com
-- Change this email to your actual email address!
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'walterjonesjr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Test the setup by checking if tables exist and are accessible
SELECT 'user_roles table created' as status, COUNT(*) as existing_roles FROM user_roles;
SELECT 'help_requests table created' as status, COUNT(*) as existing_requests FROM help_requests;
SELECT 'help_messages table created' as status, COUNT(*) as existing_messages FROM help_messages;

-- Show admin users
SELECT 'Admin users:' as info, u.email, ur.role 
FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE ur.role = 'admin';
