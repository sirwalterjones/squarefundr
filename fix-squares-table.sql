-- Fix squares table schema to match API expectations
-- Run this in Supabase SQL Editor

-- Add missing columns to squares table
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS row INTEGER;
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS col INTEGER;
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS number INTEGER;
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS value DECIMAL(10,2);
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS claimed_by UUID;
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS donor_name TEXT;
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'stripe';
ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Make position column nullable (since we use number instead)
ALTER TABLE public.squares ALTER COLUMN position DROP NOT NULL;

-- Add constraints for the new schema
ALTER TABLE public.squares ADD CONSTRAINT check_payment_status 
  CHECK (payment_status IN ('pending', 'completed', 'failed'));
  
ALTER TABLE public.squares ADD CONSTRAINT check_payment_type 
  CHECK (payment_type IN ('stripe', 'cash'));

-- Add unique constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'squares_campaign_row_col_unique'
  ) THEN
    ALTER TABLE public.squares 
    ADD CONSTRAINT squares_campaign_row_col_unique 
    UNIQUE(campaign_id, row, col);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'squares_campaign_number_unique'
  ) THEN
    ALTER TABLE public.squares 
    ADD CONSTRAINT squares_campaign_number_unique 
    UNIQUE(campaign_id, number);
  END IF;
END $$;

-- Success message
SELECT 'Squares table updated successfully! 🎉' as status; 