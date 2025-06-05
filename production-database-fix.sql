-- Fix Production Database Schema for SquareFundr
-- Run this SQL in your Supabase SQL Editor to fix the schema issues

-- 1. Fix the campaigns table structure

-- First, check what tables and columns exist
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'campaigns';

-- Add missing columns to campaigns table if they don't exist
ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS columns INTEGER NOT NULL DEFAULT 10 CHECK (columns >= 2 AND columns <= 50);

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS rows INTEGER NOT NULL DEFAULT 10 CHECK (rows >= 2 AND rows <= 50);

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS sold_squares INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'sequential', 'manual'));

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS price_data JSONB DEFAULT '{"fixed": 10}'::jsonb;

ALTER TABLE IF EXISTS public.campaigns 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Fix squares table structure to match code expectations
-- Based on provided structure:
-- Current: position, row_num, col_num, is_sold, buyer_name, buyer_email, price, sold_at, created_at, row, col, number
-- Expected: row, col, number, value, claimed_by, donor_name, payment_status, payment_type, claimed_at, created_at, updated_at

-- First, we'll create view-compatible mappings for the existing structure

-- 1. Add value column if it doesn't exist (using price column's values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'value' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN value DECIMAL(10,2);
    -- Copy values from price to value
    UPDATE public.squares SET value = price;
  END IF;
END $$;

-- 2. Add payment_status based on is_sold
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'payment_status' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN payment_status TEXT DEFAULT 'pending';
    -- Set completed status for sold squares
    UPDATE public.squares SET payment_status = 
      CASE WHEN is_sold = true THEN 'completed' ELSE 'pending' END;
  END IF;
END $$;

-- 3. Add payment_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'payment_type' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN payment_type TEXT DEFAULT 'stripe';
  END IF;
END $$;

-- 4. Add claimed_by for buyer information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'claimed_by' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN claimed_by TEXT;
    -- Use buyer_email if available
    UPDATE public.squares SET claimed_by = buyer_email WHERE buyer_email IS NOT NULL;
  END IF;
END $$;

-- 5. Add donor_name using buyer_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'donor_name' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN donor_name TEXT;
    -- Use buyer_name if available
    UPDATE public.squares SET donor_name = buyer_name WHERE buyer_name IS NOT NULL;
  END IF;
END $$;

-- 6. Add claimed_at using sold_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'claimed_at' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
    -- Use sold_at if available
    UPDATE public.squares SET claimed_at = sold_at WHERE sold_at IS NOT NULL;
  END IF;
END $$;

-- 7. Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'updated_at' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.squares ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 8. Ensure row_num/col_num values are copied to row/col if they exist but are null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'row_num' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'row' 
    AND table_schema = 'public'
  ) THEN
    -- Copy row_num values to row where row is null
    UPDATE public.squares SET row = row_num WHERE row IS NULL AND row_num IS NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'col_num' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'col' 
    AND table_schema = 'public'
  ) THEN
    -- Copy col_num values to col where col is null
    UPDATE public.squares SET col = col_num WHERE col IS NULL AND col_num IS NOT NULL;
  END IF;
END $$;

-- 9. Ensure position values are copied to number if they exist but are null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'position' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'number' 
    AND table_schema = 'public'
  ) THEN
    -- Copy position values to number where number is null
    UPDATE public.squares SET number = position WHERE number IS NULL AND position IS NOT NULL;
  END IF;
END $$;

-- 10. Make sure price values are copied to value column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'price' 
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'squares' 
    AND column_name = 'value' 
    AND table_schema = 'public'
  ) THEN
    -- Copy price values to value where value is null
    UPDATE public.squares SET value = price WHERE value IS NULL AND price IS NOT NULL;
  END IF;
END $$;

-- 3. Create or update indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_squares_campaign_id ON public.squares(campaign_id);
CREATE INDEX IF NOT EXISTS idx_squares_claimed_by ON public.squares(claimed_by);
CREATE INDEX IF NOT EXISTS idx_squares_payment_status ON public.squares(payment_status);

-- 4. Create update trigger for campaign sold_squares
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

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_sold_squares ON public.squares;
CREATE TRIGGER trigger_update_sold_squares
  AFTER INSERT OR UPDATE OR DELETE ON public.squares
  FOR EACH ROW EXECUTE FUNCTION update_sold_squares_count(); 