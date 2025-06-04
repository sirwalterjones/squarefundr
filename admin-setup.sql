-- Simplified Admin Setup for SquareFundr
-- Run this in your Supabase SQL Editor

-- Option 1: Create a system user for API operations (no foreign key issues)
INSERT INTO public.users (
  id,
  email,
  full_name,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@squarefundr.com',
  'System User',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create the admin role table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Update campaigns table to allow admins to create campaigns for any user
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;

CREATE POLICY "Users can create their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to view all campaigns
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to update any campaign
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Optional: Update the foreign key constraint to make it less strict
-- This allows users to be created in public.users without requiring auth.users entry first
-- (You may need to drop and recreate the table if constraint exists)

SELECT 'Setup complete! System user created.' as status;

-- After running this SQL, follow these steps to create your admin account:
-- 1. Go to http://localhost:3000/auth in your browser
-- 2. Click "Sign up" and create an account with walterjonesjr@gmail.com
-- 3. Come back here and run the following SQL with your actual user ID:

-- STEP 2: After creating your account via signup, run this SQL:
-- (Replace YOUR_ACTUAL_USER_ID with the UUID from auth.users)
/*
INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_ACTUAL_USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
*/ 