-- SquareFundr Database Schema Fix - Final Version
-- This script safely adds missing columns and constraints

-- Add missing columns to campaigns table if they don't exist
DO $$ 
BEGIN
    -- Add sold_squares column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='campaigns' AND column_name='sold_squares') THEN
        ALTER TABLE public.campaigns ADD COLUMN sold_squares INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added sold_squares column to campaigns table';
    ELSE
        RAISE NOTICE 'sold_squares column already exists in campaigns table';
    END IF;
END $$;

-- Add missing columns to squares table if they don't exist
DO $$ 
BEGIN
    -- Add row column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='squares' AND column_name='row') THEN
        ALTER TABLE public.squares ADD COLUMN row INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'Added row column to squares table';
    ELSE
        RAISE NOTICE 'row column already exists in squares table';
    END IF;
    
    -- Add col column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='squares' AND column_name='col') THEN
        ALTER TABLE public.squares ADD COLUMN col INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'Added col column to squares table';
    ELSE
        RAISE NOTICE 'col column already exists in squares table';
    END IF;
    
    -- Add number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='squares' AND column_name='number') THEN
        ALTER TABLE public.squares ADD COLUMN number INTEGER NOT NULL DEFAULT 1;
        RAISE NOTICE 'Added number column to squares table';
    ELSE
        RAISE NOTICE 'number column already exists in squares table';
    END IF;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    rows INTEGER NOT NULL DEFAULT 10,
    columns INTEGER NOT NULL DEFAULT 10,
    pricing_type TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'sequential', 'manual')),
    price_data JSONB NOT NULL DEFAULT '{}',
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    sold_squares INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.squares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    row INTEGER NOT NULL DEFAULT 1,
    col INTEGER NOT NULL DEFAULT 1,
    number INTEGER NOT NULL DEFAULT 1,
    value NUMERIC(10,2) NOT NULL DEFAULT 0,
    claimed_by UUID,
    donor_name TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_type TEXT DEFAULT 'stripe' CHECK (payment_type IN ('stripe', 'cash')),
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    square_ids UUID[] NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash')),
    donor_email TEXT,
    donor_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints using conditional logic
DO $$ 
BEGIN
    -- Add unique constraint for campaign square numbers
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='unique_campaign_square_number' AND table_name='squares') THEN
        ALTER TABLE public.squares ADD CONSTRAINT unique_campaign_square_number 
        UNIQUE (campaign_id, number);
        RAISE NOTICE 'Added unique_campaign_square_number constraint';
    ELSE
        RAISE NOTICE 'unique_campaign_square_number constraint already exists';
    END IF;
    
    -- Add unique constraint for campaign row/col
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='unique_campaign_row_col' AND table_name='squares') THEN
        ALTER TABLE public.squares ADD CONSTRAINT unique_campaign_row_col 
        UNIQUE (campaign_id, row, col);
        RAISE NOTICE 'Added unique_campaign_row_col constraint';
    ELSE
        RAISE NOTICE 'unique_campaign_row_col constraint already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_user_id') THEN
        CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
        RAISE NOTICE 'Created idx_campaigns_user_id index';
    ELSE
        RAISE NOTICE 'idx_campaigns_user_id index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_slug') THEN
        CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
        RAISE NOTICE 'Created idx_campaigns_slug index';
    ELSE
        RAISE NOTICE 'idx_campaigns_slug index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaigns_sold_squares') THEN
        CREATE INDEX idx_campaigns_sold_squares ON public.campaigns(sold_squares);
        RAISE NOTICE 'Created idx_campaigns_sold_squares index';
    ELSE
        RAISE NOTICE 'idx_campaigns_sold_squares index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_squares_campaign_id') THEN
        CREATE INDEX idx_squares_campaign_id ON public.squares(campaign_id);
        RAISE NOTICE 'Created idx_squares_campaign_id index';
    ELSE
        RAISE NOTICE 'idx_squares_campaign_id index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_squares_number') THEN
        CREATE INDEX idx_squares_number ON public.squares(campaign_id, number);
        RAISE NOTICE 'Created idx_squares_number index';
    ELSE
        RAISE NOTICE 'idx_squares_number index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_squares_row_col') THEN
        CREATE INDEX idx_squares_row_col ON public.squares(campaign_id, row, col);
        RAISE NOTICE 'Created idx_squares_row_col index';
    ELSE
        RAISE NOTICE 'idx_squares_row_col index already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_campaign_id') THEN
        CREATE INDEX idx_transactions_campaign_id ON public.transactions(campaign_id);
        RAISE NOTICE 'Created idx_transactions_campaign_id index';
    ELSE
        RAISE NOTICE 'idx_transactions_campaign_id index already exists';
    END IF;
END $$;

-- Create or replace the trigger function for updating sold_squares count
CREATE OR REPLACE FUNCTION update_sold_squares_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update sold_squares count for the campaign
        UPDATE public.campaigns 
        SET sold_squares = (
            SELECT COUNT(*) 
            FROM public.squares 
            WHERE campaign_id = NEW.campaign_id 
            AND claimed_by IS NOT NULL
        )
        WHERE id = NEW.campaign_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update sold_squares count for the campaign
        UPDATE public.campaigns 
        SET sold_squares = (
            SELECT COUNT(*) 
            FROM public.squares 
            WHERE campaign_id = OLD.campaign_id 
            AND claimed_by IS NOT NULL
        )
        WHERE id = OLD.campaign_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'trigger_update_sold_squares') THEN
        CREATE TRIGGER trigger_update_sold_squares
            AFTER INSERT OR UPDATE OR DELETE ON public.squares
            FOR EACH ROW EXECUTE FUNCTION update_sold_squares_count();
        RAISE NOTICE 'Created trigger_update_sold_squares trigger';
    ELSE
        RAISE NOTICE 'trigger_update_sold_squares trigger already exists';
    END IF;
END $$;

-- Create or replace the trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'trigger_campaigns_updated_at') THEN
        CREATE TRIGGER trigger_campaigns_updated_at
            BEFORE UPDATE ON public.campaigns
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger_campaigns_updated_at trigger';
    ELSE
        RAISE NOTICE 'trigger_campaigns_updated_at trigger already exists';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'trigger_squares_updated_at') THEN
        CREATE TRIGGER trigger_squares_updated_at
            BEFORE UPDATE ON public.squares
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created trigger_squares_updated_at trigger';
    ELSE
        RAISE NOTICE 'trigger_squares_updated_at trigger already exists';
    END IF;
END $$;

-- Verification queries
DO $$ 
BEGIN
    RAISE NOTICE 'Database schema update completed successfully!';
    RAISE NOTICE 'Run the following queries to verify:';
    RAISE NOTICE '1. SELECT column_name FROM information_schema.columns WHERE table_name = ''campaigns'';';
    RAISE NOTICE '2. SELECT column_name FROM information_schema.columns WHERE table_name = ''squares'';';
    RAISE NOTICE '3. SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = ''squares'';';
END $$; 