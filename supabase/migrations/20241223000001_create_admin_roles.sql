-- Drop table if exists to ensure clean creation
DROP TABLE IF EXISTS public.user_roles;

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable realtime
alter publication supabase_realtime add table user_roles;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant master admin role to walterjonesjr@gmail.com
-- First, we need to find the user ID for this email
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for walterjonesjr@gmail.com from auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'walterjonesjr@gmail.com'
  LIMIT 1;
  
  -- If user exists, grant admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET 
      role = 'admin',
      updated_at = NOW();
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User walterjonesjr@gmail.com not found in auth.users';
  END IF;
END $$;
