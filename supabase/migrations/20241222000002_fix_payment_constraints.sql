-- Drop existing constraints first
ALTER TABLE squares DROP CONSTRAINT IF EXISTS check_payment_type;
ALTER TABLE squares DROP CONSTRAINT IF EXISTS squares_payment_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

-- Update existing data to valid values
UPDATE squares SET payment_type = 'paypal' WHERE payment_type IS NULL OR payment_type NOT IN ('paypal', 'cash');
UPDATE transactions SET payment_method = 'paypal' WHERE payment_method IS NULL OR payment_method NOT IN ('paypal', 'cash');

-- Add new constraints after data is cleaned
ALTER TABLE squares ADD CONSTRAINT squares_payment_type_check CHECK (payment_type IN ('paypal', 'cash'));
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('paypal', 'cash'));

-- Enable realtime
alter publication supabase_realtime add table squares;
alter publication supabase_realtime add table transactions;
