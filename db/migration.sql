-- Add currency column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP';

-- Add a check constraint to ensure only valid currencies are allowed
ALTER TABLE profiles 
ADD CONSTRAINT currency_values CHECK (currency IN ('GBP', 'EUR', 'USD', 'DKK')); 