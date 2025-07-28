-- Fix existing PayPal transactions that are stuck in pending status
-- This migration will identify and fix PayPal transactions that should be completed

-- First, add the paypal_order_id column if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paypal_order_id TEXT;

-- Update transactions that have paypal_order_id but are still pending
UPDATE transactions 
SET status = 'completed', 
    timestamp = COALESCE(timestamp, NOW())
WHERE payment_method = 'paypal' 
  AND status = 'pending' 
  AND paypal_order_id IS NOT NULL 
  AND paypal_order_id != '';

-- Update squares that belong to completed PayPal transactions
-- First, find squares that are temporarily reserved for PayPal transactions
UPDATE squares 
SET payment_status = 'completed',
    payment_type = 'paypal',
    claimed_at = COALESCE(claimed_at, NOW())
WHERE claimed_by LIKE 'temp_%' 
  AND campaign_id IN (
    SELECT DISTINCT t.campaign_id 
    FROM transactions t 
    WHERE t.payment_method = 'paypal' 
      AND t.status = 'completed' 
      AND t.paypal_order_id IS NOT NULL
  );

-- Update squares to remove temp_ prefix and set proper donor info
-- This requires matching temp reservations with actual transactions
WITH paypal_transactions AS (
  SELECT 
    id,
    campaign_id,
    donor_email,
    donor_name,
    paypal_order_id
  FROM transactions 
  WHERE payment_method = 'paypal' 
    AND status = 'completed'
    AND paypal_order_id IS NOT NULL
)
UPDATE squares 
SET claimed_by = COALESCE(pt.donor_email, 'anonymous'),
    donor_name = COALESCE(pt.donor_name, 'Anonymous'),
    payment_status = 'completed',
    payment_type = 'paypal',
    claimed_at = COALESCE(claimed_at, NOW())
FROM paypal_transactions pt
WHERE squares.claimed_by = CONCAT('temp_', pt.id)
  AND squares.campaign_id = pt.campaign_id;

-- Clean up any remaining temp reservations that don't have matching completed transactions
-- These should be released back to available status
UPDATE squares 
SET claimed_by = NULL,
    donor_name = NULL,
    payment_status = 'pending',
    payment_type = 'paypal',
    claimed_at = NULL
WHERE claimed_by LIKE 'temp_%' 
  AND claimed_by NOT IN (
    SELECT CONCAT('temp_', id) 
    FROM transactions 
    WHERE status = 'completed'
  );

-- Tables are already in realtime publication, no need to add them again
