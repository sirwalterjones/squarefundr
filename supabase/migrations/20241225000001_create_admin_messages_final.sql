-- Final admin messages table creation via migration
-- This ensures proper schema visibility and permissions

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.admin_messages CASCADE;

-- Create the admin_messages table
CREATE TABLE public.admin_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    from_admin_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS completely
ALTER TABLE public.admin_messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all necessary roles
GRANT ALL ON public.admin_messages TO anon;
GRANT ALL ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

-- Ensure proper ownership
ALTER TABLE public.admin_messages OWNER TO postgres;

-- Add a comment to track this table
COMMENT ON TABLE public.admin_messages IS 'Admin to user messaging system - created via migration';
