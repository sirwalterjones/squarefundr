-- Quick test to bypass foreign key constraints temporarily
-- Run this in Supabase SQL Editor to test functionality

-- Method 1: Create the system user in public.users only (simpler)
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

-- Method 2: If above doesn't work, temporarily disable foreign key constraint
-- Uncomment the lines below if needed:

-- ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_user_id_fkey;
-- 
-- -- Re-add it later with:
-- -- ALTER TABLE campaigns ADD CONSTRAINT campaigns_user_id_fkey 
-- --   FOREIGN KEY (user_id) REFERENCES users(id); 