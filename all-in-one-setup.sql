-- All-in-One Setup for SquareFundr Storage and Database
-- Run this entire block as one statement in Supabase SQL Editor

DO $$
BEGIN
  -- 1. Create images bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
  VALUES (
    'images', 
    'images', 
    true, 
    10485760,
    '{"image/png","image/jpeg","image/gif","image/webp","image/jpg"}'
  )
  ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = '{"image/png","image/jpeg","image/gif","image/webp","image/jpg"}';

  -- 2. Fix squares table constraint
  IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'check_payment_status' 
      AND table_name = 'squares'
  ) THEN
      ALTER TABLE public.squares DROP CONSTRAINT check_payment_status;
  END IF;
  
  ALTER TABLE public.squares 
  ADD CONSTRAINT check_payment_status 
  CHECK (payment_status IN ('pending', 'completed', 'failed'));

  -- 3. Add missing columns to squares table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='row') THEN
      ALTER TABLE public.squares ADD COLUMN row INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='col') THEN
      ALTER TABLE public.squares ADD COLUMN col INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='number') THEN
      ALTER TABLE public.squares ADD COLUMN number INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='value') THEN
      ALTER TABLE public.squares ADD COLUMN value DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='claimed_by') THEN
      ALTER TABLE public.squares ADD COLUMN claimed_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='donor_name') THEN
      ALTER TABLE public.squares ADD COLUMN donor_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='payment_status') THEN
      ALTER TABLE public.squares ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='payment_type') THEN
      ALTER TABLE public.squares ADD COLUMN payment_type TEXT DEFAULT 'stripe';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='claimed_at') THEN
      ALTER TABLE public.squares ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='created_at') THEN
      ALTER TABLE public.squares ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='squares' AND column_name='updated_at') THEN
      ALTER TABLE public.squares ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  RAISE NOTICE '✅ All setup completed successfully!';
  RAISE NOTICE '📁 Images bucket: created';
  RAISE NOTICE '🗃️ Squares table: updated';
  RAISE NOTICE '🎉 Ready to use!';
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow public read access to images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to delete their own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]); 