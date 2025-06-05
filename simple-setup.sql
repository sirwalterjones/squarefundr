-- SquareFundr Database Setup (Updated)
-- Run this entire script in Supabase SQL Editor

-- First, drop existing tables if they have wrong schema (be careful in production!)
DROP TABLE IF EXISTS public.squares CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create campaigns table matching the API expectations
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  rows INTEGER NOT NULL CHECK (rows > 0),
  columns INTEGER NOT NULL CHECK (columns > 0),
  total_squares INTEGER NOT NULL,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'sequential', 'manual')),
  price_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create squares table matching what the API inserts
CREATE TABLE public.squares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  number INTEGER NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  claimed_by UUID,
  donor_name TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_type TEXT DEFAULT 'stripe' CHECK (payment_type IN ('stripe', 'cash')),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, row, col),
  UNIQUE(campaign_id, number)
);

-- Create user_roles table for admin functionality
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
DROP POLICY IF EXISTS "Users can view all campaigns" ON public.campaigns;
CREATE POLICY "Users can view all campaigns" ON public.campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
CREATE POLICY "Users can create their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for squares
DROP POLICY IF EXISTS "Users can view all squares" ON public.squares;
CREATE POLICY "Users can view all squares" ON public.squares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create squares for their campaigns" ON public.squares;
CREATE POLICY "Users can create squares for their campaigns" ON public.squares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = squares.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update squares for their campaigns" ON public.squares;
CREATE POLICY "Users can update squares for their campaigns" ON public.squares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = squares.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_squares_campaign_id ON public.squares(campaign_id);
CREATE INDEX IF NOT EXISTS idx_squares_claimed_by ON public.squares(claimed_by);
CREATE INDEX IF NOT EXISTS idx_squares_payment_status ON public.squares(payment_status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Success message
SELECT 'Database setup completed successfully! 🎉' as status,
       'Tables recreated with correct schema' as note; 