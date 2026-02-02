-- Migration: Add OAuth identifiers to customers table for social login
-- Date: 2026-01-27
-- Description: Add apple_id and google_id columns for Apple Sign In and Google Sign In

-- Add apple_id column (stores Apple's user identifier for returning user lookup)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;

-- Add google_id column (stores Google's user identifier for returning user lookup)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_customers_apple_id ON customers(apple_id) WHERE apple_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_google_id ON customers(google_id) WHERE google_id IS NOT NULL;

-- Verify the columns were added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers' AND column_name IN ('apple_id', 'google_id');
