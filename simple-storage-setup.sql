-- Simple Storage Setup for SquareFundr
-- Run this in your Supabase SQL Editor
-- This version avoids permission issues with storage.objects

-- 1. Create the images bucket (safe if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'images', 
  'images', 
  true, 
  10485760, -- 10MB
  '{"image/png","image/jpeg","image/gif","image/webp","image/jpg"}'
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = '{"image/png","image/jpeg","image/gif","image/webp","image/jpg"}';

-- 2. Fix any existing constraint conflicts on squares table
-- Drop the problematic constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_payment_status' 
        AND table_name = 'squares'
    ) THEN
        ALTER TABLE public.squares DROP CONSTRAINT check_payment_status;
    END IF;
END $$;

-- 3. Recreate the payment_status constraint properly
ALTER TABLE public.squares 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'completed', 'failed'));

-- 4. Ensure squares table has correct structure (safe updates)
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
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
END $$;

-- 5. Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Basic storage setup completed!';
    RAISE NOTICE '📁 Images bucket created';
    RAISE NOTICE '🗃️ Squares table structure verified';
    RAISE NOTICE '⚠️  Set storage policies manually in Dashboard > Storage';
END $$; 