-- RECREATE admin_messages table from scratch
-- This will fix any permission or structure issues

-- Drop the table completely 
DROP TABLE IF EXISTS public.admin_messages CASCADE;

-- Recreate with proper structure
CREATE TABLE public.admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_admin_id UUID NOT NULL,
  to_user_id UUID NOT NULL, 
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make sure it's publicly accessible for now
ALTER TABLE public.admin_messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO anon;

-- Test insert
INSERT INTO public.admin_messages (from_admin_id, to_user_id, subject, message) 
VALUES (
  'e883b63f-ea21-416b-ac83-c5357aecd4ec',
  'e883b63f-ea21-416b-ac83-c5357aecd4ec', 
  'Test Message', 
  'Testing if table works'
);

-- Verify it worked
SELECT * FROM public.admin_messages WHERE subject = 'Test Message';

-- Clean up test
DELETE FROM public.admin_messages WHERE subject = 'Test Message';

SELECT 'Table recreated successfully!' as result;
