-- Production Setup for SquareFundr
-- Run this in your Supabase SQL Editor

-- First, let's create a system user in auth.users (this requires admin access)
-- You'll need to run this manually or use Supabase Auth API

-- Insert a system user into auth.users table (manual step required)
-- Go to Supabase Dashboard > Authentication > Users and create a user with:
-- Email: system@squarefundr.com
-- Password: (any secure password)
-- Copy the resulting UUID and replace in the INSERT below

-- For now, let's create the public.users record for system user
-- Replace '00000000-0000-0000-0000-000000000000' with actual auth user UUID
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',  -- System user UUID
  'authenticated',
  'authenticated',
  'system@squarefundr.com',
  '$2a$10$placeholder', -- Placeholder password hash
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"System User"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Now create the corresponding public.users record
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_url,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Same UUID as auth.users
  'system@squarefundr.com',
  'System User',
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Optional: Temporarily disable foreign key constraints for initial setup
-- (You can re-enable after creating test data)
-- ALTER TABLE campaigns DISABLE TRIGGER ALL;
-- ALTER TABLE squares DISABLE TRIGGER ALL;

-- Optional: Create a test campaign to verify everything works
INSERT INTO campaigns (
  id,
  user_id,
  title,
  description,
  image_url,
  slug,
  rows,
  columns,
  pricing_type,
  price_data,
  public_url,
  paid_to_admin,
  is_active,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',  -- System user
  'Test Campaign',
  'This is a test campaign to verify the setup',
  'https://example.com/test.jpg',
  'test-campaign',
  3,
  3,
  'fixed',
  '{"fixed": 10}',
  'http://localhost:3000/fundraiser/test-campaign',
  false,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Re-enable constraints if disabled
-- ALTER TABLE campaigns ENABLE TRIGGER ALL;
-- ALTER TABLE squares ENABLE TRIGGER ALL; 