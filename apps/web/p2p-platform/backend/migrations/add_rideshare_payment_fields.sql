-- Migration: Add payment fields to ride_requests table
-- For Stripe payment integration and driver payouts
-- Run against staging database: dollor-staging.c23qcukqe810.us-east-1.rds.amazonaws.com

-- Add payment fields to ride_requests
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2);
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS driver_payout DECIMAL(10,2);
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP;
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS driver_paid_at TIMESTAMP;
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255);

-- Add Stripe Connect account ID to drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_payment_status ON ride_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver_paid ON ride_requests(matched_driver_id, driver_paid_at);

-- Create rideshare_payments table for tracking
CREATE TABLE IF NOT EXISTS rideshare_payments (
    id SERIAL PRIMARY KEY,
    ride_request_id INTEGER NOT NULL REFERENCES ride_requests(id),
    customer_id INTEGER NOT NULL,
    driver_id INTEGER,

    -- Amounts
    fare_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    driver_payout DECIMAL(10,2) NOT NULL,
    total_charged DECIMAL(10,2) NOT NULL,

    -- Stripe
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),

    -- Status
    payment_status VARCHAR(50) DEFAULT 'pending',
    payout_status VARCHAR(50) DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_completed_at TIMESTAMP,
    payout_completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rideshare_payments_ride ON rideshare_payments(ride_request_id);
CREATE INDEX IF NOT EXISTS idx_rideshare_payments_driver ON rideshare_payments(driver_id);
CREATE INDEX IF NOT EXISTS idx_rideshare_payments_status ON rideshare_payments(payment_status, payout_status);

COMMENT ON TABLE rideshare_payments IS 'Tracks rideshare payment and driver payout transactions';
COMMENT ON COLUMN ride_requests.platform_fee IS 'Platform fee: $1 (≤$35), $2 ($35-70), $3 (>$70)';
COMMENT ON COLUMN ride_requests.driver_payout IS 'Amount driver receives after platform fee';
