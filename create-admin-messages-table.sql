-- Create admin_messages table for the messaging system
-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS public.admin_messages;

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

-- Enable Row Level Security
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for now (can be refined later)
CREATE POLICY "admin_can_do_everything" ON public.admin_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the table was created
SELECT 'admin_messages table created successfully!' as status;
