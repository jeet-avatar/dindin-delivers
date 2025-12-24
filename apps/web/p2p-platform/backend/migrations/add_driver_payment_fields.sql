-- Migration: Add Driver Direct Payment Fields for Matchmaking Model
-- Date: 2024-12-24
-- Description: Adds payment info fields so customers can pay drivers directly
--              This is required for the matchmaking model (Wyoming launch)
--              where fares are paid directly to drivers, not through platform.

-- ============================================================================
-- DRIVER PAYMENT INFO FIELDS
-- ============================================================================
-- These fields store driver's direct payment information.
-- Customers use these to pay fares directly to drivers.
-- Platform only collects connection fee via Stripe.

-- Venmo username (e.g., @john-doe-123)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS venmo_username VARCHAR(100);

-- Zelle phone number (for phone-based Zelle transfers)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS zelle_phone VARCHAR(20);

-- Zelle email (for email-based Zelle transfers)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS zelle_email VARCHAR(255);

-- CashApp username (e.g., $JohnDoe)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cashapp_username VARCHAR(100);

-- Whether driver accepts cash payments
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS accepts_cash BOOLEAN DEFAULT true;

-- ============================================================================
-- INSURANCE VERIFICATION FIELDS
-- ============================================================================
-- For matchmaking model, drivers must have commercial auto insurance.
-- These fields track insurance details and verification status.

-- Insurance company name
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(255);

-- Insurance policy number
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- Insurance liability coverage amount (in dollars)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_liability_amount DECIMAL(12, 2);

-- Whether insurance is commercial (required for matchmaking)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_is_commercial BOOLEAN DEFAULT false;

-- Insurance verification status
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_verified BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_verified_at TIMESTAMP;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS insurance_verified_by INTEGER;

-- ============================================================================
-- STATE OPERATING FIELDS
-- ============================================================================
-- Track which states a driver is approved to operate in.

-- Primary operating state code (e.g., 'WY', 'MT')
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS operating_state VARCHAR(2);

-- Array of approved states (JSON: ["WY", "MT", "SD"])
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_states TEXT;

-- ============================================================================
-- RIDE REQUEST FIELDS FOR MATCHMAKING
-- ============================================================================
-- Additional fields for matchmaking model tracking

-- State where ride takes place
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);

-- Distance in miles (for connection fee calculation)
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(10, 2);

-- Operating model used for this ride
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS operating_model VARCHAR(20) DEFAULT 'matchmaking';

-- How customer paid driver (cash, venmo, zelle, cashapp)
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS customer_payment_method VARCHAR(20);

-- Confirmation that fare was paid to driver
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS fare_paid_to_driver BOOLEAN DEFAULT false;
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS fare_paid_at TIMESTAMP;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_drivers_operating_state ON drivers(operating_state);
CREATE INDEX IF NOT EXISTS idx_drivers_insurance_verified ON drivers(insurance_verified);
CREATE INDEX IF NOT EXISTS idx_ride_requests_state_code ON ride_requests(state_code);
CREATE INDEX IF NOT EXISTS idx_ride_requests_operating_model ON ride_requests(operating_model);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN drivers.venmo_username IS 'Venmo username for direct fare payments from customers';
COMMENT ON COLUMN drivers.zelle_phone IS 'Zelle phone for direct fare payments';
COMMENT ON COLUMN drivers.cashapp_username IS 'CashApp username for direct fare payments';
COMMENT ON COLUMN drivers.insurance_is_commercial IS 'True if driver has commercial auto insurance (required for matchmaking)';
COMMENT ON COLUMN drivers.operating_state IS 'Primary state where driver operates (e.g., WY)';
COMMENT ON COLUMN ride_requests.operating_model IS 'Business model: matchmaking (fare paid to driver) or full_tnc (platform processes fare)';
COMMENT ON COLUMN ride_requests.fare_paid_to_driver IS 'Confirmation that customer paid fare directly to driver';
