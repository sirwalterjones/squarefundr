-- Update existing records to use 'paypal' instead of 'stripe'
UPDATE squares SET payment_type = 'paypal' WHERE payment_type = 'stripe';
UPDATE transactions SET payment_method = 'paypal' WHERE payment_method = 'stripe';

-- Update the check constraints to use 'paypal' instead of 'stripe'
ALTER TABLE squares DROP CONSTRAINT IF EXISTS squares_payment_type_check;
ALTER TABLE squares ADD CONSTRAINT squares_payment_type_check CHECK (payment_type IN ('paypal', 'cash'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('paypal', 'cash'));

-- Enable realtime for updated tables
alter publication supabase_realtime add table squares;
alter publication supabase_realtime add table transactions;
