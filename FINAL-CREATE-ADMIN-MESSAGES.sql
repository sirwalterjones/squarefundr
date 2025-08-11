-- FINAL ADMIN MESSAGES TABLE CREATION
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop table if it exists (just in case)
DROP TABLE IF EXISTS public.admin_messages CASCADE;

-- Step 2: Create the table with all necessary columns
CREATE TABLE public.admin_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    from_admin_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Completely disable RLS for now (we'll enable it later if needed)
ALTER TABLE public.admin_messages DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant full permissions to all roles
GRANT ALL ON public.admin_messages TO anon;
GRANT ALL ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

-- Step 5: Grant usage on the sequence (for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Step 6: Test insert to verify everything works
INSERT INTO public.admin_messages (from_admin_id, to_user_id, subject, message, is_read)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test Subject', 'Test message content', false);

-- Step 7: Test select to verify read access
SELECT * FROM public.admin_messages WHERE subject = 'Test Subject';

-- Step 8: Clean up test record
DELETE FROM public.admin_messages WHERE subject = 'Test Subject';

-- Step 9: Verify table is empty and ready
SELECT COUNT(*) as row_count FROM public.admin_messages;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: admin_messages table created and tested successfully!';
END $$;
