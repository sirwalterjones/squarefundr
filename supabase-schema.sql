-- SquareFundr Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  rows INTEGER NOT NULL CHECK (rows >= 2 AND rows <= 50),
  columns INTEGER NOT NULL CHECK (columns >= 2 AND columns <= 50),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'sequential', 'manual')),
  price_data JSONB NOT NULL,
  public_url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_to_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Squares table
CREATE TABLE public.squares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  number INTEGER NOT NULL,
  value DECIMAL(10,2) NOT NULL CHECK (value >= 0.01),
  claimed_by UUID REFERENCES auth.users(id),
  donor_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_type TEXT NOT NULL DEFAULT 'stripe' CHECK (payment_type IN ('stripe', 'cash')),
  claimed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, row, col)
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  square_ids UUID[] NOT NULL,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0.01),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash')),
  donor_email TEXT,
  donor_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  square_id UUID REFERENCES public.squares(id) NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  buyer_name TEXT,
  buyer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_active ON public.campaigns(is_active);
CREATE INDEX idx_squares_campaign_id ON public.squares(campaign_id);
CREATE INDEX idx_squares_claimed_by ON public.squares(claimed_by);
CREATE INDEX idx_squares_payment_status ON public.squares(payment_status);
CREATE INDEX idx_transactions_campaign_id ON public.transactions(campaign_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_payments_square_id ON public.payments(square_id);
CREATE INDEX idx_payments_campaign_id ON public.payments(campaign_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_session_id ON public.payments(stripe_session_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaigns policies
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Squares policies
CREATE POLICY "Anyone can view squares for active campaigns" ON public.squares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = squares.campaign_id 
      AND campaigns.is_active = true
    )
  );

CREATE POLICY "Campaign owners can manage squares" ON public.squares
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = squares.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can claim squares" ON public.squares
  FOR UPDATE USING (
    claimed_by IS NULL OR claimed_by = auth.uid()
  );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.campaigns WHERE campaigns.id = transactions.campaign_id
    )
    OR EXISTS (
      SELECT 1 FROM public.squares 
      WHERE squares.id = ANY(transactions.square_ids) 
      AND squares.claimed_by = auth.uid()
    )
  );

CREATE POLICY "Anyone can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Payments policies
CREATE POLICY "Users can view payments for their campaigns" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = payments.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create payments" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update payments" ON public.payments
  FOR UPDATE USING (true);

-- Functions

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users updated_at
CREATE OR REPLACE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 