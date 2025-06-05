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

-- 2. Fix squares table structure

-- First, check if squares table exists and what columns it has
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'squares';

-- Create squares table if it doesn't exist
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

-- Add missing columns to squares table if they exist but don't have necessary columns
ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS row INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS col INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS number INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS value DECIMAL(10,2) NOT NULL DEFAULT 10.00;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS claimed_by TEXT;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS donor_name TEXT;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'stripe';

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE IF EXISTS public.squares 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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