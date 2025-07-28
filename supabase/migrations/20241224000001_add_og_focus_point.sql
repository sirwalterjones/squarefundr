-- Add Open Graph focus point column to campaigns table
-- This stores the x,y coordinates (0-1) for optimal image cropping in social media previews

ALTER TABLE campaigns 
ADD COLUMN og_focus_point JSONB DEFAULT '{"x": 0.5, "y": 0.3}'::jsonb;

-- Add a comment to explain the column
COMMENT ON COLUMN campaigns.og_focus_point IS 'Open Graph image focus point for social media previews. JSON object with x,y coordinates (0-1 range)';

-- Create an index for potential future queries on focus point
CREATE INDEX idx_campaigns_og_focus_point ON campaigns USING GIN (og_focus_point); 