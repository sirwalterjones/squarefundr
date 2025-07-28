ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS paypal_account_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS paypal_email TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS paypal_onboarding_complete BOOLEAN DEFAULT false;

alter publication supabase_realtime add table campaigns;