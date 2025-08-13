-- COMPLETE ADMIN & HELP SYSTEM SETUP
-- Run this script in Supabase SQL Editor to set up all required tables

-- =====================================================
-- 1. CREATE USER_ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint separately to handle IF NOT EXISTS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_role_key' 
        AND conrelid = 'public.user_roles'::regclass
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE(user_id, role);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can insert/update/delete roles" ON public.user_roles;
CREATE POLICY "Admins can insert/update/delete roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- =====================================================
-- 2. CREATE HELP_REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.help_requests (
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
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_requests
DROP POLICY IF EXISTS "Users can view their own help requests" ON public.help_requests;
CREATE POLICY "Users can view their own help requests" ON public.help_requests
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can view all help requests" ON public.help_requests;
CREATE POLICY "Admins can view all help requests" ON public.help_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Anyone can insert help requests" ON public.help_requests;
DROP POLICY IF EXISTS "Anyone can submit help requests" ON public.help_requests;
CREATE POLICY "Anyone can submit help requests" ON public.help_requests
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own help requests" ON public.help_requests;
CREATE POLICY "Users can update their own help requests" ON public.help_requests
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can update help requests" ON public.help_requests;
DROP POLICY IF EXISTS "Admins can update all help requests" ON public.help_requests;
CREATE POLICY "Admins can update help requests" ON public.help_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- =====================================================
-- 3. CREATE HELP_MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.help_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    help_request_id UUID NOT NULL REFERENCES public.help_requests(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    sender_user_id UUID REFERENCES auth.users(id),
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    CONSTRAINT valid_sender CHECK (
        (sender_type = 'admin' AND sender_user_id IS NOT NULL) OR
        (sender_type = 'user')
    )
);

-- Enable RLS
ALTER TABLE public.help_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_messages
DROP POLICY IF EXISTS "Users can view messages for their help requests" ON public.help_messages;
DROP POLICY IF EXISTS "Users can view messages in their help requests" ON public.help_messages;
CREATE POLICY "Users can view messages in their help requests" ON public.help_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.help_requests hr 
            WHERE hr.id = help_request_id 
            AND hr.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can view all help messages" ON public.help_messages;
CREATE POLICY "Admins can view all help messages" ON public.help_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can insert messages for their help requests" ON public.help_messages;
DROP POLICY IF EXISTS "Users can send messages in their help requests" ON public.help_messages;
CREATE POLICY "Users can send messages in their help requests" ON public.help_messages
    FOR INSERT WITH CHECK (
        sender_type = 'user' AND
        EXISTS (
            SELECT 1 FROM public.help_requests hr 
            WHERE hr.id = help_request_id 
            AND hr.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can insert messages for any help request" ON public.help_messages;
DROP POLICY IF EXISTS "Admins can send messages to any help request" ON public.help_messages;
CREATE POLICY "Admins can send messages to any help request" ON public.help_messages
    FOR INSERT WITH CHECK (
        sender_type = 'admin' AND
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.help_messages;
CREATE POLICY "Users can update their own messages" ON public.help_messages
    FOR UPDATE USING (sender_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all messages" ON public.help_messages;
DROP POLICY IF EXISTS "Admins can update all help messages" ON public.help_messages;
CREATE POLICY "Admins can update all help messages" ON public.help_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Indexes for help_requests
CREATE INDEX IF NOT EXISTS idx_help_requests_email ON public.help_requests(email);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON public.help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON public.help_requests(created_at);

-- Indexes for help_messages
CREATE INDEX IF NOT EXISTS idx_help_messages_help_request_id ON public.help_messages(help_request_id);
CREATE INDEX IF NOT EXISTS idx_help_messages_sender_user_id ON public.help_messages(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_help_messages_created_at ON public.help_messages(created_at);

-- =====================================================
-- 5. CREATE UPDATE TIMESTAMP TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_requests_updated_at ON public.help_requests;
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON public.help_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_messages_updated_at ON public.help_messages;
CREATE TRIGGER update_help_messages_updated_at BEFORE UPDATE ON public.help_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. MAKE WALTER ADMIN
-- =====================================================

-- Get Walter's user ID and make him admin
DO $$
DECLARE
    walter_id UUID;
BEGIN
    -- Get Walter's user ID
    SELECT id INTO walter_id FROM auth.users WHERE email = 'walterjonesjr@gmail.com';
    
    -- Only insert if not already admin
    IF walter_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = walter_id AND role = 'admin'
    ) THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (walter_id, 'admin');
    END IF;
END $$;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Verify setup
SELECT 'Setup Complete! Tables created:' as status;
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_roles', 'help_requests', 'help_messages');

-- Check if Walter is admin
SELECT 'Walter admin status:' as check_type, 
       CASE WHEN EXISTS (
           SELECT 1 FROM public.user_roles ur 
           JOIN auth.users u ON ur.user_id = u.id 
           WHERE u.email = 'walterjonesjr@gmail.com' AND ur.role = 'admin'
       ) THEN 'ADMIN CONFIRMED ✅' 
       ELSE 'NOT ADMIN ❌' 
       END as result;
