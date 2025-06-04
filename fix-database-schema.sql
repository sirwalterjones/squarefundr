-- Fix Database Schema for SquareFundr
-- Run this SQL in your Supabase SQL Editor to fix the missing columns

-- First, fix the missing 'lib/supabase.ts' import issue by creating the missing file
-- This will be done in a separate step

-- 1. Fix campaigns table - add missing columns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS sold_squares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Fix squares table - add missing 'number' column
ALTER TABLE public.squares 
ADD COLUMN IF NOT EXISTS number INTEGER,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Update existing squares to have the number field populated
-- This populates the number field based on position for existing squares
UPDATE public.squares 
SET number = (row * (SELECT columns FROM public.campaigns WHERE campaigns.id = squares.campaign_id) + col + 1)
WHERE number IS NULL;

-- 4. Make the number column NOT NULL after populating it
ALTER TABLE public.squares 
ALTER COLUMN number SET NOT NULL;

-- 5. Add unique constraint for campaign_id and number
ALTER TABLE public.squares 
ADD CONSTRAINT IF NOT EXISTS unique_campaign_square_number 
UNIQUE (campaign_id, number);

-- 6. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_sold_squares ON public.campaigns(sold_squares);
CREATE INDEX IF NOT EXISTS idx_squares_number ON public.squares(campaign_id, number);

-- 7. Create a function to automatically update sold_squares count
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

-- 8. Create trigger to automatically update sold_squares
DROP TRIGGER IF EXISTS trigger_update_sold_squares ON public.squares;
CREATE TRIGGER trigger_update_sold_squares
  AFTER INSERT OR UPDATE OR DELETE ON public.squares
  FOR EACH ROW EXECUTE FUNCTION update_sold_squares_count();

-- 9. Create a trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to campaigns
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at triggers to squares
DROP TRIGGER IF EXISTS update_squares_updated_at ON public.squares;
CREATE TRIGGER update_squares_updated_at
  BEFORE UPDATE ON public.squares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Fix the existing campaigns to have correct sold_squares count
UPDATE public.campaigns 
SET sold_squares = (
  SELECT COUNT(*) 
  FROM public.squares 
  WHERE campaign_id = campaigns.id 
  AND payment_status = 'completed'
);

-- 11. Verify the schema is correct
SELECT 
  'Schema verification:' as status,
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
  END as squares_check;

-- Success message
SELECT 'Database schema fixed successfully! 🎉' as message,
       'You can now restart your dev server' as next_step; 