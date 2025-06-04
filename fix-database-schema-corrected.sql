-- Fix Database Schema for SquareFundr - CORRECTED VERSION
-- Run this SQL in your Supabase SQL Editor to fix the missing columns

-- Based on the error logs, the actual database has different column names
-- Let's check what columns exist first, then add the missing ones

-- 1. Add missing 'sold_squares' column to campaigns table if it doesn't exist
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS sold_squares INTEGER DEFAULT 0;

-- 2. Add missing 'updated_at' column to campaigns table if it doesn't exist
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Check if squares table exists and what columns it has
-- From the errors, it seems the squares table has different column names
-- Let's check the actual structure first

-- First, let's see what tables and columns exist
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('campaigns', 'squares')
ORDER BY table_name, ordinal_position;

-- If the squares table doesn't exist or has wrong columns, create/recreate it
-- This will only run if the table doesn't exist
CREATE TABLE IF NOT EXISTS public.squares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  number INTEGER NOT NULL,
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0.01),
  claimed_by TEXT,
  donor_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_type TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_type IN ('stripe', 'cash')),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, row, col)
);

-- Alternative: If squares table exists but has wrong columns, add missing columns
-- Add 'number' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'number' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN number INTEGER;
  END IF;
END $$;

-- Add 'row' column if it doesn't exist (from error, this seems to be the issue)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'row' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN row INTEGER;
  END IF;
END $$;

-- Add 'col' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'col' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN col INTEGER;
  END IF;
END $$;

-- Add other potentially missing columns
DO $$
BEGIN
  -- Add value column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'value' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN value DECIMAL(10,2) DEFAULT 10.00;
  END IF;

  -- Add payment_status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'payment_status' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;

  -- Add payment_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'payment_type' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN payment_type TEXT DEFAULT 'stripe';
  END IF;

  -- Add claimed_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'claimed_by' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN claimed_by TEXT;
  END IF;

  -- Add donor_name column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'donor_name' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN donor_name TEXT;
  END IF;

  -- Add claimed_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'claimed_at' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'created_at' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'updated_at' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 4. Now populate the number field if it exists but is null
-- This will only run if both row and col columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'row' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'col' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'number' 
    AND table_schema = 'public'
  ) THEN
    -- Update existing squares to have the number field populated
    UPDATE public.squares 
    SET number = (
      row * (
        SELECT columns 
        FROM public.campaigns 
        WHERE campaigns.id = squares.campaign_id
      ) + col + 1
    )
    WHERE number IS NULL OR number = 0;
  END IF;
END $$;

-- 5. Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_campaigns_sold_squares ON public.campaigns(sold_squares);
CREATE INDEX IF NOT EXISTS idx_squares_number ON public.squares(campaign_id, number);
CREATE INDEX IF NOT EXISTS idx_squares_row_col ON public.squares(campaign_id, row, col);

-- 6. Create a function to automatically update sold_squares count
CREATE OR REPLACE FUNCTION update_sold_squares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.campaigns 
    SET sold_squares = (
      SELECT COUNT(*) 
      FROM public.squares 
      WHERE campaign_id = NEW.campaign_id 
      AND payment_status = 'completed'
    ),
    updated_at = NOW()
    WHERE id = NEW.campaign_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.campaigns 
    SET sold_squares = (
      SELECT COUNT(*) 
      FROM public.squares 
      WHERE campaign_id = OLD.campaign_id 
      AND payment_status = 'completed'
    ),
    updated_at = NOW()
    WHERE id = OLD.campaign_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to automatically update sold_squares
DROP TRIGGER IF EXISTS trigger_update_sold_squares ON public.squares;
CREATE TRIGGER trigger_update_sold_squares
  AFTER INSERT OR UPDATE OR DELETE ON public.squares
  FOR EACH ROW EXECUTE FUNCTION update_sold_squares_count();

-- 8. Create a trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers if they don't exist
DO $$
BEGIN
  -- Campaigns updated_at trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_campaigns_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_campaigns_updated_at
      BEFORE UPDATE ON public.campaigns
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;

  -- Squares updated_at trigger (if updated_at column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'updated_at' 
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_squares_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_squares_updated_at
      BEFORE UPDATE ON public.squares
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- 9. Fix the existing campaigns to have correct sold_squares count
UPDATE public.campaigns 
SET sold_squares = (
  SELECT COUNT(*) 
  FROM public.squares 
  WHERE campaign_id = campaigns.id 
  AND payment_status = 'completed'
);

-- 10. Final verification query
SELECT 
  'Schema verification complete!' as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'campaigns' AND column_name = 'sold_squares'
    ) THEN '✅ campaigns.sold_squares exists'
    ELSE '❌ campaigns.sold_squares missing'
  END as campaigns_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'squares' AND column_name = 'number'
    ) THEN '✅ squares.number exists'
    ELSE '❌ squares.number missing'
  END as squares_number_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'squares' AND column_name = 'row'
    ) THEN '✅ squares.row exists'
    ELSE '❌ squares.row missing'
  END as squares_row_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'squares' AND column_name = 'col'
    ) THEN '✅ squares.col exists'
    ELSE '❌ squares.col missing'
  END as squares_col_check;

-- Success message
SELECT 'Database schema fixed successfully! 🎉' as message,
       'You can now restart your dev server and create campaigns' as next_step; 